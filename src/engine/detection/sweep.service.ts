import type { DetectorSpec, GameConfig } from '../config/game.config';
import type { MissionState, Progress } from '../core/game.types';
import { restoreRng, type Rng } from '../core/rng.service';
import { hexDistance, type Hex } from '../map/hex.service';
import type { Constraint } from '../missions/setup.service';
import type { Unit } from '../units/unit.model';
import {
  contactId,
  type Contact,
  type ContactTargetType,
  type IdentifiedContact,
  type Identification,
} from './contact.types';
import type { FriendObservation } from './observation.types';
import { effectiveRange } from './sensor-range.service';

/** Contact identifié tel que le moteur le conserve, avec sa cible interne. */
type StoredIdentified = Extract<Contact, { kind: 'identified' }>;

/** Portée effective de la balayage d'une unité, capteurs dégradés compris (AB-25). */
export function effectiveSweepRange(
  unit: Unit,
  constraints: readonly Constraint[],
  config: GameConfig,
): number {
  const spec = config.ships[unit.shipClass].detection as DetectorSpec;
  return effectiveRange(spec.sweepRange, unit, constraints, config);
}

/**
 * Cases à portée de la balayage d'une unité, sa propre case exclue : la zone que
 * l'interface surligne pendant le brouillon. Calculée depuis la projection amie (SF-04 §1).
 */
export function sweepArea(observation: FriendObservation, unit: Unit, config: GameConfig): Hex[] {
  const range = effectiveSweepRange(unit, observation.constraints, config);
  const { width, height } = observation.map;
  const area: Hex[] = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const distance = hexDistance(unit.position, { col, row });
      if (distance > 0 && distance <= range) area.push({ col, row });
    }
  }
  return area;
}

/** Type de navire révélé : frégate ou sous-marin, jamais la classe (AB-25). Aucun hostile n'est porte-avions. */
function targetTypeOf(unit: Unit, config: GameConfig): ContactTargetType {
  return config.ships[unit.shipClass].category === 'submarine' ? 'submarine' : 'frigate';
}

/**
 * Navires hostiles identifiés par le balayage : un tirage à la probabilité de balayage par navire
 * hostile opérationnel à portée, dans l'ordre des unités, sans bonus côtier ni aucun autre
 * modificateur (AB-25, AB-29).
 */
function drawIdentifiedTargets(
  mission: MissionState,
  searcher: Unit,
  config: GameConfig,
  rng: Rng,
): Unit[] {
  const spec = config.ships[searcher.shipClass].detection as DetectorSpec;
  const range = effectiveSweepRange(searcher, mission.setup.constraints, config);
  return mission.units.filter(
    (unit) =>
      unit.side === 'hostile' &&
      unit.hp > 0 &&
      hexDistance(searcher.position, unit.position) <= range &&
      rng() < spec.sweepProbability,
  );
}

/**
 * Contacts après identification d'une cible : le contact identifié de ce navire est actualisé s'il
 * existe encore (même identifiant, position figée à l'instant du balayage), sinon un nouveau
 * est créé (AB-26). Les zones qui désignaient cette cible disparaissent, et elles seules.
 */
function identify(
  mission: MissionState,
  contacts: readonly Contact[],
  nextNumber: number,
  target: Unit,
  config: GameConfig,
): { contacts: Contact[]; nextNumber: number; identification: Identification } {
  const existing = contacts.find(
    (c): c is StoredIdentified => c.kind === 'identified' && c.source === target.id,
  );
  const isNew = existing === undefined;
  const id = existing?.id ?? contactId(nextNumber);
  const details: IdentifiedContact = {
    kind: 'identified',
    id,
    cycle: mission.cycle,
    targetType: targetTypeOf(target, config),
    position: target.position,
  };
  const refreshed: Contact = { ...details, source: target.id };
  const others = contacts.filter(
    (c) => c.id !== id && !(c.kind === 'suspect' && c.source === target.id),
  );
  return {
    contacts: [...others, refreshed],
    nextNumber: isNew ? nextNumber + 1 : nextNumber,
    identification: { contactId: id, targetType: details.targetType, position: target.position },
  };
}

/**
 * Balayage d'une unité alliée, résolue au moment de l'action (G-08.3.6, AB-25) : chaque
 * navire hostile à portée est identifié avec la probabilité de balayage, plusieurs pouvant l'être.
 * Le résultat est toujours journalisé, réussite ou non (AB-28). Le hasard est repris et rendu à
 * l'état de la mission (AB-24). N'appartient pas à la veille de fin de cycle, qui reste
 * appliquée à toute paire éligible. La consommation de l'action est faite par la commande.
 */
export function resolveSweep(mission: MissionState, searcher: Unit, config: GameConfig): Progress {
  const rng = restoreRng(mission.rngState);
  const targets = drawIdentifiedTargets(mission, searcher, config, rng);
  let contacts: Contact[] = mission.friendContacts;
  let nextNumber = mission.nextContactNumber;
  const identified: Identification[] = [];
  for (const target of targets) {
    const result = identify(mission, contacts, nextNumber, target, config);
    contacts = result.contacts;
    nextNumber = result.nextNumber;
    identified.push(result.identification);
  }
  return {
    state: {
      ...mission,
      friendContacts: contacts,
      nextContactNumber: nextNumber,
      rngState: rng.state(),
    },
    events: [
      {
        type: 'SWEEP_PERFORMED',
        cycle: mission.cycle,
        unitId: searcher.id,
        shipClass: searcher.shipClass,
        identified,
      },
    ],
  };
}
