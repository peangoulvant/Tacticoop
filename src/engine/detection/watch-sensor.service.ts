import type { DetectorSpec, GameConfig } from '../config/game.config';
import type { MissionState, Progress } from '../core/game.types';
import { restoreRng, type Rng } from '../core/rng.service';
import { terrainAt } from '../map/game-map.service';
import { hexDistance } from '../map/hex.service';
import { usedActionDuringCycle } from '../units/special-action.service';
import type { Side, Unit } from '../units/unit.model';
import { contactId, type Contact } from './contact.types';
import { contactsOf, opposingSide, withContacts } from './side-contacts.service';
import { generateWatchZone } from './watch-zone.service';
import { effectiveRange } from './sensor-range.service';

/** Contact suspect tel que le moteur le conserve, avec sa cible interne. */
type StoredSuspect = Extract<Contact, { kind: 'suspect' }>;

/**
 * Une unité détecte si elle est du camp donné, opérationnelle et dotée de capteurs (le
 * porte-avions non, D-04). Valable pour les deux camps (AB-35).
 */
function isDetector(unit: Unit, side: Side, config: GameConfig): boolean {
  return unit.side === side && unit.hp > 0 && config.ships[unit.shipClass].detection !== null;
}

/** Portée de veille d'un détecteur, capteurs dégradés compris. */
function watchRangeOf(
  unit: Unit,
  spec: DetectorSpec,
  mission: MissionState,
  config: GameConfig,
): number {
  return effectiveRange(spec.watchRange, unit, mission.setup.constraints, config);
}

/**
 * Probabilité de détection de veille d'une cible : la probabilité de base du détecteur (50 %),
 * plus 20 points si la cible est un sous-marin en mer côtière au moment du tirage (AB-22), plus
 * 20 points si la cible a fait un balayage pendant ce cycle (AB-33), plafonnée à 100 %. Les bonus
 * se cumulent.
 *
 * Exemples : frégate qui a balayé : 50 + 20 = 70 % ; sous-marin côtier qui a balayé : 50 + 20 +
 * 20 = 90 %. Valable pour les deux camps.
 */
function watchProbability(
  spec: DetectorSpec,
  target: Unit,
  mission: MissionState,
  config: GameConfig,
): number {
  const coastalSubmarine =
    config.ships[target.shipClass].category === 'submarine' &&
    terrainAt(mission.map, target.position) === 'coastal_sea';
  const coastalBonus = coastalSubmarine ? config.detection.coastalSubmarineWatchBonus : 0;
  const noiseBonus = usedActionDuringCycle(target, 'sweep', mission.cycle)
    ? config.detection.sweepNoiseWatchBonus
    : 0;
  return Math.min(1, spec.watchProbability + coastalBonus + noiseBonus);
}

/**
 * Tirages de la veille pour une cible : un par détecteur à portée, tous effectués dans
 * l'ordre des unités (G-08.2.5). La cible est détectée si au moins un tirage réussit.
 */
function isDetected(
  target: Unit,
  detectors: readonly Unit[],
  mission: MissionState,
  config: GameConfig,
  rng: Rng,
): boolean {
  let detected = false;
  for (const detector of detectors) {
    const spec = config.ships[detector.shipClass].detection as DetectorSpec;
    const inRange =
      hexDistance(detector.position, target.position) <=
      watchRangeOf(detector, spec, mission, config);
    if (inRange && rng() < watchProbability(spec, target, mission, config)) detected = true;
  }
  return detected;
}

/**
 * Veille d'un camp : pour chaque unité du camp d'en face, un tirage par détecteur à portée. Une
 * cible détectée donne un seul contact et une seule zone, qui retient la cible en donnée interne
 * (AB-18, AB-26). Les contacts du camp détectés avant ce cycle, zones comme identifiés, expirent :
 * un contact reste visible jusqu'à la fin du cycle suivant sa détection (G-08.6.2, AB-27).
 *
 * Les contacts créés sont renvoyés avec le camp mis à jour ; le hasard `rng` est celui de la
 * mission, avancé par cette résolution.
 */
function watchOf(
  mission: MissionState,
  side: Side,
  config: GameConfig,
  rng: Rng,
): { state: MissionState; created: StoredSuspect[] } {
  const detectors = mission.units.filter((unit) => isDetector(unit, side, config));
  const targets = mission.units.filter((unit) => unit.side === opposingSide(side) && unit.hp > 0);
  const known = contactsOf(mission, side);
  const created: StoredSuspect[] = [];
  for (const target of targets) {
    if (!isDetected(target, detectors, mission, config, rng)) continue;
    const zone = generateWatchZone(mission.map, target.position, rng, config.detection);
    const id = contactId(known.nextNumber + created.length);
    created.push({ kind: 'suspect', id, cycle: mission.cycle, zone, source: target.id });
  }
  const kept = known.contacts.filter((contact) => contact.cycle >= mission.cycle);
  const state = withContacts(mission, side, {
    contacts: [...kept, ...created],
    nextNumber: known.nextNumber + created.length,
  });
  return { state, created };
}

/**
 * Veille de fin de cycle (G-08.2, SF-04 §2, AB-35) : le camp ami d'abord, puis le camp hostile,
 * dans cet ordre fixe. Les tirages du camp ami ne dépendent donc pas de ceux de l'IA. Le hasard
 * est repris et rendu à l'état de la mission (AB-24).
 *
 * Seules les détections du joueur sont des événements du journal : celles de l'IA restent cachées
 * (SF-06 §2, SF-07 §3), sans événement.
 */
export function resolveWatch(mission: MissionState, config: GameConfig): Progress {
  const rng = restoreRng(mission.rngState);
  const friend = watchOf(mission, 'friend', config, rng);
  const hostile = watchOf(friend.state, 'hostile', config, rng);
  return {
    state: { ...hostile.state, rngState: rng.state() },
    events: friend.created.map((c) => ({
      type: 'CONTACT_DETECTED',
      contactId: c.id,
      cycle: c.cycle,
      zone: c.zone,
    })),
  };
}
