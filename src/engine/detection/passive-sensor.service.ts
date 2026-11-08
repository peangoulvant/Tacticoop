import type { DetectorSpec, GameConfig } from '../config/game.config';
import type { MissionState, Progress } from '../core/game.types';
import { restoreRng, type Rng } from '../core/rng.service';
import { terrainAt } from '../map/game-map.service';
import { hexDistance } from '../map/hex.service';
import type { Unit } from '../units/unit.model';
import { contactId, type Contact } from './contact.types';
import { generatePassiveZone } from './passive-zone.service';
import { effectiveRange } from './sensor-range.service';

/** Contact suspect tel que le moteur le conserve, avec sa cible interne. */
type StoredSuspect = Extract<Contact, { kind: 'suspect' }>;

/** Une unité détecte si elle est alliée, opérationnelle et dotée de capteurs (le porte-avions non, D-04). */
function isFriendlyDetector(unit: Unit, config: GameConfig): boolean {
  return unit.side === 'friend' && unit.hp > 0 && config.ships[unit.shipClass].detection !== null;
}

/** Portée passive d'un détecteur, capteurs dégradés compris. */
function passiveRangeOf(
  unit: Unit,
  spec: DetectorSpec,
  mission: MissionState,
  config: GameConfig,
): number {
  return effectiveRange(spec.passiveRange, unit, mission.setup.constraints, config);
}

/**
 * Probabilité de détection passive d'une cible : celle du détecteur, relevée contre un sous-marin
 * situé en mer côtière au moment du tirage, plafonnée à 100 % (AB-22).
 */
function passiveProbability(
  spec: DetectorSpec,
  target: Unit,
  mission: MissionState,
  config: GameConfig,
): number {
  const coastalSubmarine =
    config.ships[target.shipClass].category === 'submarine' &&
    terrainAt(mission.map, target.position) === 'coastal_sea';
  const bonus = coastalSubmarine ? config.detection.coastalSubmarinePassiveBonus : 0;
  return Math.min(1, spec.passiveProbability + bonus);
}

/**
 * Tirages de la veille passive pour une cible : un par détecteur à portée, tous effectués dans
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
      passiveRangeOf(detector, spec, mission, config);
    if (inRange && rng() < passiveProbability(spec, target, mission, config)) detected = true;
  }
  return detected;
}

/**
 * Veille passive du camp ami, en fin de cycle (G-08.2, SF-04 §2) : pour chaque ennemi, un tirage par
 * détecteur à portée. Une cible détectée donne un seul contact et une seule zone, qui retient la
 * cible en donnée interne (AB-18, AB-26). Les contacts détectés avant ce cycle, zones comme
 * identifiés, expirent : un contact reste visible jusqu'à la fin du cycle suivant sa détection
 * (G-08.6.2, AB-27). Le hasard est repris et rendu à l'état de la mission (AB-24).
 */
export function resolvePassiveSensors(mission: MissionState, config: GameConfig): Progress {
  const rng = restoreRng(mission.rngState);
  const detectors = mission.units.filter((unit) => isFriendlyDetector(unit, config));
  const targets = mission.units.filter((unit) => unit.side === 'hostile' && unit.hp > 0);
  const created: StoredSuspect[] = [];
  for (const target of targets) {
    if (!isDetected(target, detectors, mission, config, rng)) continue;
    const zone = generatePassiveZone(mission.map, target.position, rng, config.detection);
    const id = contactId(mission.nextContactNumber + created.length);
    created.push({ kind: 'suspect', id, cycle: mission.cycle, zone, source: target.id });
  }
  const kept = mission.friendContacts.filter((contact) => contact.cycle >= mission.cycle);
  return {
    state: {
      ...mission,
      friendContacts: [...kept, ...created],
      nextContactNumber: mission.nextContactNumber + created.length,
      rngState: rng.state(),
    },
    events: created.map((c) => ({
      type: 'CONTACT_DETECTED',
      contactId: c.id,
      cycle: c.cycle,
      zone: c.zone,
    })),
  };
}
