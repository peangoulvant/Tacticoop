import type { GameConfig } from '../config/game.config';
import type { GameEvent, MissionState, Progress } from '../core/game.types';
import { restoreRng, type Rng } from '../core/rng.service';
import { removeIdentifiedContactsOf } from '../detection/side-contacts.service';
import { hexDistance, type Hex } from '../map/hex.service';
import type { Unit } from '../units/unit.model';
import { attemptImpact, isCompatible, unitAt, type ImpactResult } from './impact.service';
import type { Projectile } from './projectile.types';
import {
  headingOf,
  isWaterHex,
  stepAlong,
  torpedoTrajectory,
} from './trajectory.service';

/*
 * Progression des projectiles (G-09 §1, G-09.10, AB-47, AB-48). Après chaque séquence complète
 * (activation alliée, réaction ennemie), tous les projectiles présents progressent, dans l'ordre
 * fixe de leur numéro de lancement, un par un : l'état des unités est mis à jour aussitôt après
 * chaque impact (G-09.10.3) et une unité détruite est retirée sur-le-champ (G-09-C4).
 *
 *   progressProjectiles ──► advanceProjectile (un projectile, `progression` pas)
 *                               ├─ nextStep : où va-t-il ? (trajectoire de l'arme)
 *                               ├─ detectionUpdate : l'adversaire l'identifie-t-il ? (AB-49)
 *                               └─ enterHex : impact éventuel sur l'unité rencontrée
 */

/** État de la mission et événements du journal du joueur, accumulés pendant la progression. */
interface Accumulator {
  state: MissionState;
  events: GameEvent[];
}

/** Remplace (ou retire, si `null`) le projectile du même identifiant. */
function withProjectile(
  state: MissionState,
  id: string,
  projectile: Projectile | null,
): MissionState {
  const others = state.projectiles.filter((p) => p.id !== id);
  return { ...state, projectiles: projectile ? [...others, projectile] : others };
}

/**
 * Acquisition de la cible désignée par l'autodirecteur de la torpille (G-09 §2.2) : sans tirage,
 * si la cible est vivante, dans sa portée d'acquisition et reliée par l'eau. Si le suivi est perdu,
 * la torpille garde son dernier cap sans correction ; elle peut réacquérir plus tard.
 */
function acquire(state: MissionState, torpedo: Projectile, config: GameConfig): Projectile {
  const target = state.units.find((u) => u.id === torpedo.targetId);
  const range = config.combat.weapons.torpedo.acquisitionRange;
  const homing =
    target && hexDistance(torpedo.position, target.position) <= range
      ? torpedoTrajectory(state.map, torpedo.position, target.position)
      : null;
  if (homing) return { ...torpedo, route: homing, tracking: true };
  return torpedo.tracking ? { ...torpedo, route: [], tracking: false } : torpedo;
}

/** Prochaine case d'une torpille : son trajet, sinon son cap ; `null` devant un obstacle (G-09 §2.1). */
function torpedoNext(state: MissionState, torpedo: Projectile): { hex: Hex; rest: Hex[] } | null {
  const [first, ...rest] = torpedo.route;
  if (first) return { hex: first, rest };
  if (!torpedo.heading) return null;
  const hex = stepAlong(torpedo.position, torpedo.heading);
  return isWaterHex(state.map, hex) ? { hex, rest: [] } : null;
}

/**
 * Avance le projectile d'un pas, ou renvoie `null` s'il ne peut plus avancer (obstacle, cap sans
 * issue). Le missile suit sa ligne droite ; la torpille acquiert d'abord sa cible (AB-47).
 */
function nextStep(
  state: MissionState,
  projectile: Projectile,
  config: GameConfig,
): Projectile | null {
  const ready = projectile.weapon === 'torpedo' ? acquire(state, projectile, config) : projectile;
  const next = ready.weapon === 'torpedo' ? torpedoNext(state, ready) : missileNext(ready);
  if (!next) return null;
  return {
    ...ready,
    position: next.hex,
    route: next.rest,
    heading: ready.weapon === 'torpedo' ? headingOf(ready.position, next.hex) : null,
    autonomyLeft: ready.autonomyLeft === null ? null : ready.autonomyLeft - 1,
  };
}

/** Prochaine case d'un missile : la suivante de sa ligne ; `null` si la ligne est épuisée. */
function missileNext(missile: Projectile): { hex: Hex; rest: Hex[] } | null {
  const [first, ...rest] = missile.route;
  return first ? { hex: first, rest } : null;
}

/** Le projectile a épuisé sa course : missile arrivé à la case visée, torpille sans autonomie (AB-47). */
function isSpent(projectile: Projectile): boolean {
  return projectile.weapon === 'missile'
    ? projectile.route.length === 0
    : projectile.autonomyLeft === 0;
}

/** Une unité de `side` est à `range` hexagones au plus du projectile. */
function isNearUnitOf(state: MissionState, projectile: Projectile, side: Unit['side'], range: number) {
  return state.units.some(
    (u) => u.side === side && hexDistance(u.position, projectile.position) <= range,
  );
}

/**
 * Identification d'office du projectile par le camp adverse (AB-49) : dès qu'il passe à
 * `projectileDetectionRange` hexagones d'une unité de ce camp, porte-avions compris, sans tirage.
 * L'annonce au journal n'a lieu qu'une fois, et seulement pour un projectile hostile (le joueur
 * est alors l'adversaire).
 */
function detectionUpdate(
  state: MissionState,
  projectile: Projectile,
  config: GameConfig,
): { projectile: Projectile; events: GameEvent[] } {
  if (projectile.detected) return { projectile, events: [] };
  const opposing = projectile.side === 'friend' ? 'hostile' : 'friend';
  if (!isNearUnitOf(state, projectile, opposing, config.combat.projectileDetectionRange)) {
    return { projectile, events: [] };
  }
  const events: GameEvent[] =
    projectile.side === 'hostile'
      ? [
          {
            type: 'PROJECTILE_DETECTED',
            cycle: state.cycle,
            projectileId: projectile.id,
            weapon: projectile.weapon,
            position: projectile.position,
          },
        ]
      : [];
  return { projectile: { ...projectile, detected: true }, events };
}

/**
 * Événement du journal du joueur pour un impact, ou aucun (AB-49) : toute tentative sur une unité
 * alliée ; seulement un impact réussi ou une destruction sur un navire hostile, annoncé sans type
 * ni classe ; jamais ce que fait l'IA à ses propres navires.
 */
function impactEvents(
  state: MissionState,
  projectile: Projectile,
  unit: Unit,
  result: ImpactResult,
): GameEvent[] {
  const base = {
    type: 'PROJECTILE_IMPACT' as const,
    cycle: state.cycle,
    projectileId: projectile.id,
    weapon: projectile.weapon,
    result,
  };
  if (unit.side === 'friend') {
    return [
      { ...base, victim: { side: 'friend', unitId: unit.id, shipClass: unit.shipClass } },
    ];
  }
  return projectile.side === 'friend' && result !== 'missed'
    ? [{ ...base, victim: { side: 'hostile' } }]
    : [];
}

/** Retire une unité détruite, la consigne dans les pertes et efface les contacts du tireur sur elle (AB-49). */
function destroyUnit(state: MissionState, unit: Unit, shooter: Unit['side']): MissionState {
  const without: MissionState = {
    ...state,
    units: state.units.filter((u) => u.id !== unit.id),
    losses: [
      ...state.losses,
      { unitId: unit.id, side: unit.side, shipClass: unit.shipClass, cycle: state.cycle },
    ],
  };
  return removeIdentifiedContactsOf(without, shooter, unit.id);
}

/** Écrit le résultat d'un impact dans l'état : unité abîmée ou détruite. */
function applyImpact(
  state: MissionState,
  projectile: Projectile,
  unit: Unit,
  updated: Unit | null,
): MissionState {
  return updated
    ? { ...state, units: state.units.map((u) => (u.id === unit.id ? updated : u)) }
    : destroyUnit(state, unit, projectile.side);
}

/** Événement d'un projectile neutralisé sans impact, connu du joueur s'il est le sien ou identifié. */
function neutralisedEvents(state: MissionState, projectile: Projectile): GameEvent[] {
  const known = projectile.side === 'friend' || projectile.detected;
  return known
    ? [
        {
          type: 'PROJECTILE_NEUTRALISED',
          cycle: state.cycle,
          projectileId: projectile.id,
          weapon: projectile.weapon,
        },
      ]
    : [];
}

/**
 * Le projectile entre sur une case : s'il y rencontre une unité compatible, un impact est tenté
 * (G-09 §2.2). Une unité incompatible est survolée (un missile au-dessus d'un sous-marin). Un
 * impact réussi met fin à la course (`null`) ; un impact raté laisse la torpille poursuivre, et
 * neutralise le missile (sa course est épuisée, AB-47).
 */
function enterHex(
  acc: Accumulator,
  projectile: Projectile,
  config: GameConfig,
  rng: Rng,
): { acc: Accumulator; projectile: Projectile | null } {
  const unit = unitAt(acc.state, projectile.position);
  if (!unit || !isCompatible(projectile.weapon, unit, config)) return { acc, projectile };
  const impact = attemptImpact(projectile, unit, config, rng);
  const next: Accumulator = {
    state: applyImpact(acc.state, projectile, unit, impact.unit),
    events: [...acc.events, ...impactEvents(acc.state, projectile, unit, impact.result)],
  };
  if (impact.result !== 'missed') return { acc: next, projectile: null };
  return {
    acc: next,
    projectile: projectile.weapon === 'missile' ? { ...projectile, route: [] } : projectile,
  };
}

/** Termine la course d'un projectile sans impact : il disparaît et sa disparition est annoncée si connue. */
function neutralise(acc: Accumulator, projectile: Projectile): Accumulator {
  return {
    state: withProjectile(acc.state, projectile.id, null),
    events: [...acc.events, ...neutralisedEvents(acc.state, projectile)],
  };
}

/** Un pas de projectile ; `null` pour `projectile` quand sa course est terminée. */
function stepProjectile(
  acc: Accumulator,
  projectile: Projectile,
  config: GameConfig,
  rng: Rng,
): { acc: Accumulator; projectile: Projectile | null } {
  const step = nextStep(acc.state, projectile, config);
  if (!step) return { acc: neutralise(acc, projectile), projectile: null };
  const seen = detectionUpdate(acc.state, step, config);
  const entered = enterHex(
    { state: acc.state, events: [...acc.events, ...seen.events] },
    seen.projectile,
    config,
    rng,
  );
  if (!entered.projectile) {
    return { acc: withoutProjectile(entered.acc, projectile.id), projectile: null };
  }
  return isSpent(entered.projectile)
    ? { acc: neutralise(entered.acc, entered.projectile), projectile: null }
    : entered;
}

/** Retire le projectile de l'état (sa course est finie par un impact). */
function withoutProjectile(acc: Accumulator, id: string): Accumulator {
  return { ...acc, state: withProjectile(acc.state, id, null) };
}

/**
 * Fait progresser un projectile de `progression` pas, ou jusqu'à la fin de sa course. Le
 * projectile est réécrit dans l'état à son terme, sauf s'il a disparu.
 */
function advanceProjectile(
  acc: Accumulator,
  projectile: Projectile,
  config: GameConfig,
  rng: Rng,
): Accumulator {
  let current: Accumulator = acc;
  let moving: Projectile | null = projectile;
  for (let i = 0; i < config.combat.weapons[projectile.weapon].progression && moving; i++) {
    const stepped = stepProjectile(current, moving, config, rng);
    current = stepped.acc;
    moving = stepped.projectile;
  }
  return moving ? { ...current, state: withProjectile(current.state, moving.id, moving) } : current;
}

/**
 * Progression de tous les projectiles présents après une séquence (G-09 §1) : ordre fixe par
 * numéro de lancement, indépendant du camp (G-09.10.1). Le hasard est repris et rendu à la mission
 * (AB-24). Sans projectile, la mission est rendue telle quelle.
 */
export function progressProjectiles(mission: MissionState, config: GameConfig): Progress {
  if (mission.projectiles.length === 0) return { state: mission, events: [] };
  const rng = restoreRng(mission.rngState);
  const ordered = [...mission.projectiles].sort((a, b) => a.launchNumber - b.launchNumber);
  let acc: Accumulator = { state: mission, events: [] };
  for (const projectile of ordered) acc = advanceProjectile(acc, projectile, config, rng);
  return { state: { ...acc.state, rngState: rng.state() }, events: acc.events };
}
