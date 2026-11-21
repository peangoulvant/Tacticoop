/*
 * Commandes d'unité partagées par le joueur et par l'IA (AB-35) : déplacement, balayage et fin
 * d'activation. L'IA joue avec exactement les mêmes fonctions, donc les mêmes refus, les mêmes
 * limites et le même délai de récupération. Seul change le **camp acteur** : une unité n'obéit
 * qu'à son camp (une commande du joueur sur une unité hostile répond « introuvable », sans
 * confirmer qu'elle existe), et le trajet se calcule sur ce que ce camp connaît (SF-02 §7).
 *
 * Ces fonctions ne clôturent jamais le cycle et ne déclenchent aucune réaction ennemie : c'est le
 * rôle de `mission-commands.service.ts`. Elles restent donc utilisables par `engine/ai/` sans
 * dépendance circulaire.
 */
import * as labelEngine from '../../shared/engine.label';
import { planShot } from '../combat/shot-plan.service';
import type { Projectile, ShotTarget } from '../combat/projectile.types';
import { FIRE_ACTION, type GameConfig, type WeaponKind } from '../config/game.config';
import { resolveSweep } from '../detection/sweep.service';
import { observeFriend, observeHostile } from '../detection/observation.service';
import type { Battlefield } from '../units/unit-movement.service';
import type { Hex } from '../map/hex.service';
import {
  type MoveBlocker,
  type SpecialActionBlocker,
  BLOCKER_MESSAGES,
  SPECIAL_ACTION_BLOCKER_MESSAGES,
  moveBlocker,
  orderBlocker,
  specialActionBlocker,
} from '../missions/activation.service';
import { recordSpecialAction } from '../units/special-action.service';
import {
  MOVE_REFUSAL_MESSAGES,
  checkMovedUnitPath,
  planMove,
} from '../units/unit-movement.service';
import type { Side, Unit } from '../units/unit.model';
import type { ShotPlanAccepted } from '../combat/shot-plan.service';
import { accept, reject } from './results.service';
import type { CommandResult, GameErrorCode, GameEvent, MissionState } from './game.types';

const BLOCKER_CODES: Record<MoveBlocker, GameErrorCode> = {
  NOT_ACTIVABLE: 'UNIT_NOT_ACTIVABLE',
  ALREADY_ACTIVATED: 'UNIT_ALREADY_ACTIVATED',
  OTHER_ACTIVATION_IN_PROGRESS: 'ACTIVATION_IN_PROGRESS',
  ALREADY_MOVED: 'ALREADY_MOVED',
};

/** Refus correspondant à un motif d'impossibilité d'ordre. */
export function blockerRejection(blocker: MoveBlocker): CommandResult {
  return reject(BLOCKER_CODES[blocker], BLOCKER_MESSAGES[blocker]);
}

/** Refus correspondant à un motif d'impossibilité d'action spéciale (ordre ou propre à l'action). */
function specialActionRejection(blocker: SpecialActionBlocker): CommandResult {
  return blocker === 'SPECIAL_ACTION_USED' ||
    blocker === 'ON_COOLDOWN' ||
    blocker === 'NO_SENSORS' ||
    blocker === 'NO_AMMO'
    ? reject(blocker, SPECIAL_ACTION_BLOCKER_MESSAGES[blocker])
    : blockerRejection(blocker);
}

/**
 * Ce que le camp acteur connaît du champ de bataille : sa projection, jamais l'état réel.
 * Exemple : pour le joueur, `observeFriend` ; pour l'IA, `observeHostile` (aucun allié caché).
 */
function knownBy(mission: MissionState, actor: Side, config: GameConfig): Battlefield {
  return actor === 'friend' ? observeFriend(mission, config) : observeHostile(mission, config);
}

/**
 * Retrouve l'unité visée par son identifiant, qui doit appartenir au camp acteur, et vérifie
 * qu'elle peut recevoir un ordre maintenant. Renvoie l'unité, ou le refus à transmettre tel quel.
 * Une unité de l'autre camp est « introuvable » : le joueur ne peut ni commander ni sonder un
 * navire hostile.
 */
function findOrderableUnit(
  mission: MissionState,
  unitId: string,
  actor: Side,
): { unit: Unit } | { rejection: CommandResult } {
  const unit = mission.units.find((u) => u.id === unitId && u.side === actor);
  if (!unit)
    return {
      rejection: reject('UNIT_NOT_FOUND', labelEngine.commandRefusalMessages.UNIT_NOT_FOUND),
    };
  const blocker = orderBlocker(mission.units, unit);
  return blocker ? { rejection: blockerRejection(blocker) } : { unit };
}

/** Nouvelle mission où seule l'unité `unitId` est modifiée (position, activation…). */
function updateUnitInMission(
  mission: MissionState,
  unitId: string,
  patch: Partial<Unit>,
): MissionState {
  return {
    ...mission,
    units: mission.units.map((u) => (u.id === unitId ? { ...u, ...patch } : u)),
  };
}

/** Un déplacement par activation, exécuté après validation ; l'activation reste engagée (SF-03.3). */
export function moveUnit(
  mission: MissionState,
  { unitId, destination }: { unitId: string; destination: Hex },
  config: GameConfig,
  actor: Side = 'friend',
): CommandResult {
  const found = findOrderableUnit(mission, unitId, actor);
  if ('rejection' in found) return found.rejection;
  const { unit } = found;
  const blocker = moveBlocker(mission.units, unit);
  if (blocker) return blockerRejection(blocker);
  // Le trajet et les refus ne reposent que sur ce que le camp acteur connaît (SF-02 §7).
  const plan = planMove(knownBy(mission, actor, config), unit, destination, config);
  if (!plan.ok) {
    return reject('MOVE_REFUSED', MOVE_REFUSAL_MESSAGES[plan.reason], { moveRefusal: plan.reason });
  }
  // Sur l'état réel, un occupant non détecté interrompt le déplacement (SF-02.15) : il est tout de
  // même consommé, et l'occupant n'est ni identifié ni révélé.
  const { stop, interrupted } = checkMovedUnitPath(mission, unit, plan.path);
  const moved = updateUnitInMission(mission, unitId, {
    position: stop,
    activation: 'in_progress',
    hasMoved: true,
  });
  // Le déplacement d'une unité hostile ne produit aucun événement : le journal du joueur ne
  // montre jamais les actions cachées de l'IA (AB-41, SF-06 §5).
  const events =
    actor === 'friend'
      ? [
          {
            type: 'UNIT_MOVED' as const,
            unitId,
            shipClass: unit.shipClass,
            from: unit.position,
            to: stop,
            cycle: mission.cycle,
            ...(interrupted && { interrupted: true as const }),
          },
        ]
      : [];
  return accept(moved, events);
}

/**
 * Balayage (G-07.7, AB-25, AB-30) : résolu sur-le-champ, il consomme l'action spéciale de l'unité
 * même sans résultat, l'engage dans son activation et enregistre le cycle de l'usage : ce numéro
 * déclenche le délai de récupération (AB-34) et le bruit de l'émission (AB-33). Un refus ne
 * consomme rien.
 */
export function sweep(
  mission: MissionState,
  { unitId }: { unitId: string },
  config: GameConfig,
  actor: Side = 'friend',
): CommandResult {
  const found = findOrderableUnit(mission, unitId, actor);
  if ('rejection' in found) return found.rejection;
  const { unit } = found;
  const blocker = specialActionBlocker(mission.units, unit, 'sweep', mission.cycle, config);
  if (blocker) return specialActionRejection(blocker);
  const swept = resolveSweep(mission, unit, config);
  const engaged = updateUnitInMission(swept.state, unitId, {
    ...recordSpecialAction(unit, 'sweep', mission.cycle),
    activation: 'in_progress',
    specialActionUsed: true,
  });
  return accept(engaged, swept.events);
}

/**
 * Projectile créé par un tir accepté (AB-47) : à la position du tireur, avec le trajet du plan et
 * le numéro de lancement suivant. Une torpille part avec toute son autonomie.
 */
function launchedProjectile(
  mission: MissionState,
  unit: Unit,
  weapon: WeaponKind,
  plan: ShotPlanAccepted,
  config: GameConfig,
): Projectile {
  const launchNumber = mission.nextLaunchNumber;
  return {
    id: `P-${launchNumber}`,
    launchNumber,
    weapon,
    side: unit.side,
    launcherId: unit.id,
    launchCycle: mission.cycle,
    position: unit.position,
    aimedHex: plan.aimedHex,
    targetId: plan.targetId,
    onSuspectZone: plan.onSuspectZone,
    route: plan.route,
    tracking: false,
    heading: null,
    autonomyLeft: config.combat.weapons[weapon].autonomy,
    detected: false,
  };
}

/** Événement du journal d'un tir du camp ami : l'arme et la cible désignée, jamais l'état réel. */
function shotFiredEvent(
  mission: MissionState,
  unit: Unit,
  weapon: WeaponKind,
  target: ShotTarget,
): GameEvent {
  return {
    type: 'SHOT_FIRED',
    cycle: mission.cycle,
    unitId: unit.id,
    shipClass: unit.shipClass,
    weapon,
    contactId: target.contactId,
    ...(target.hex && { hex: target.hex }),
  };
}

/**
 * Tir d'un missile ou d'une torpille (G-07.1, AB-44 à AB-47) : une action spéciale, consommée
 * même si le tir est manqué plus tard, avec un projectile créé et un stock de moins. Le tir est
 * résolu plus tard, par la progression des projectiles après la séquence (G-06.6). Un refus ne
 * consomme rien : ni action, ni stock, ni numéro de lancement. Le tir de l'IA est silencieux : le
 * journal du joueur ne le voit pas (AB-41).
 */
export function fire(
  mission: MissionState,
  { unitId, weapon, target }: { unitId: string; weapon: WeaponKind; target: ShotTarget },
  config: GameConfig,
  actor: Side = 'friend',
): CommandResult {
  const found = findOrderableUnit(mission, unitId, actor);
  if ('rejection' in found) return found.rejection;
  const { unit } = found;
  const kind = FIRE_ACTION[weapon];
  const blocker = specialActionBlocker(mission.units, unit, kind, mission.cycle, config);
  if (blocker) return specialActionRejection(blocker);
  const plan = planShot(mission, unit, weapon, target, config);
  if (!plan.ok) {
    return reject('FIRE_REFUSED', labelEngine.fireRefusalMessages[plan.reason], {
      fireRefusal: plan.reason,
    });
  }
  const projectile = launchedProjectile(mission, unit, weapon, plan, config);
  const stock =
    weapon === 'missile' ? { missiles: unit.missiles - 1 } : { torpedoes: unit.torpedoes - 1 };
  // `recordSpecialAction` rend une copie complète de l'unité : le stock s'écrit donc après elle.
  const engaged = updateUnitInMission(mission, unitId, {
    ...recordSpecialAction(unit, kind, mission.cycle),
    ...stock,
    activation: 'in_progress',
    specialActionUsed: true,
  });
  const launched: MissionState = {
    ...engaged,
    projectiles: [...engaged.projectiles, projectile],
    nextLaunchNumber: mission.nextLaunchNumber + 1,
  };
  return accept(
    launched,
    actor === 'friend' ? [shotFiredEvent(mission, unit, weapon, target)] : [],
  );
}

/**
 * Marque l'activation de l'unité comme achevée, sans rien clôturer (SF-03.1, SF-03.2). La clôture
 * du cycle et la réaction ennemie suivent dans `mission-commands.service.ts`.
 */
export function finishActivation(
  mission: MissionState,
  { unitId }: { unitId: string },
  _config: GameConfig,
  actor: Side = 'friend',
): CommandResult {
  const found = findOrderableUnit(mission, unitId, actor);
  if ('rejection' in found) return found.rejection;
  return accept(updateUnitInMission(mission, unitId, { activation: 'activated' }), []);
}
