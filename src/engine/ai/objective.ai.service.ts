/*
 * Objectif de l'IA (AB-37, AB-38, AB-40) : vers quel point une unité ennemie se dirige, et à quelle
 * distance elle s'arrête. Tout se calcule sur la projection de l'IA (`HostileObservation`) : la
 * carte, son objectif de mission, ses unités et ses propres contacts, jamais l'état réel.
 */
import type { GameConfig } from '../config/game.config';
import { plannedWeapon } from './engagement.ai.service';
import { contactHexes, type ObservedContact } from '../detection/contact.types';
import type { HostileObservation } from '../detection/observation.types';
import { nearestNavigableHex } from '../map/game-map.service';
import { hexDistance, type Hex } from '../map/hex.service';
import type { Unit } from '../units/unit.model';

/** Ce que veut faire une unité : le point visé, sa raison, et la distance (en pas) où elle s'arrête. */
export interface Intent {
  source: 'contact' | 'objective';
  anchor: Hex;
  holdDistance: number;
}

/**
 * Contacts exploitables par l'IA : une zone de veille, ou un navire identifié pendant le cycle
 * courant. Un contact identifié « ancien » n'est pas exploité en V1 (réaction aux contacts anciens
 * ouverte, SF-06 §6).
 */
export function exploitableContacts(observation: HostileObservation): ObservedContact[] {
  return observation.contacts.filter((contact) => contact.kind === 'suspect' || !contact.stale);
}

/** Distance à vol d'oiseau entre une unité et la case de `contact` la plus proche (la première en cas d'égalité). */
function nearestHexOfContact(unit: Unit, contact: ObservedContact): { hex: Hex; distance: number } {
  return contactHexes(contact)
    .map((hex) => ({ hex, distance: hexDistance(unit.position, hex) }))
    .reduce((best, candidate) => (candidate.distance < best.distance ? candidate : best));
}

/**
 * Contact exploitable le plus proche de l'unité et sa case la plus proche, ou `null` s'il n'y en a
 * aucun. Exemple : une zone de 7 cases dont la plus proche est à 6 hexagones de l'unité : cette case.
 */
function nearestContact(
  observation: HostileObservation,
  unit: Unit,
): { contact: ObservedContact; hex: Hex } | null {
  const nearest = exploitableContacts(observation)
    .map((contact) => ({ contact, ...nearestHexOfContact(unit, contact) }))
    .reduce<{ contact: ObservedContact; hex: Hex; distance: number } | null>(
      (best, candidate) => (best && best.distance <= candidate.distance ? best : candidate),
      null,
    );
  return nearest && { contact: nearest.contact, hex: nearest.hex };
}

/**
 * Rang de l'unité parmi les unités de l'IA (les navires hostiles, qui sont ses propres unités),
 * dans l'ordre stable des identifiants, et leur nombre. Ce classement sert à étaler les stations
 * de la lutte navale en hauteur (`objectiveAnchor`) : sans lui, les trois unités visant le même
 * point du centre de la carte s'y entasseraient. Chaque unité calcule son ancre seule, à chaque
 * activation, sans état conservé : le rang, déduit des identifiants, donne le même résultat à
 * chaque fois et reste le même quelle que soit l'unité activée (reproductible, AB-38).
 *
 * Exemple : parmi `hostile-fremm-1`, `hostile-submarine-1`, `hostile-submarine-2`, la
 * seconde a le rang 1 sur 3.
 */
function rankAmongOwn(
  observation: HostileObservation,
  unit: Unit,
): { rank: number; count: number } {
  const ids = observation.units.map((u) => u.id).sort();
  return { rank: ids.indexOf(unit.id), count: ids.length };
}

/**
 * Point visé en l'absence de contact (AB-40). Escorte : le point B, connu de l'IA (AB-37).
 * Lutte navale : l'IA ignore où sont les alliés, la station est donc le centre de la carte, les
 * unités étant étalées en hauteur (la k-ième sur N à `(k+1)/(N+1)` de la hauteur). Le point est
 * ramené à l'eau navigable la plus proche : le relief de la carte décide donc de la trajectoire.
 *
 * Exemple : carte de 35 × 35, trois unités : stations vers (17, 8), (17, 17) et (17, 26).
 */
function objectiveAnchor(observation: HostileObservation, unit: Unit, config: GameConfig): Hex {
  const { map, goal } = observation;
  const category = config.ships[unit.shipClass].category;
  if (goal) return nearestNavigableHex(map, goal, category);
  const { rank, count } = rankAmongOwn(observation, unit);
  const station = {
    col: Math.floor(map.width * config.ai.navalCombatStationColumnRatio),
    row: Math.floor((map.height * (rank + 1)) / (count + 1)),
  };
  return nearestNavigableHex(map, station, category);
}

/**
 * Distance d'arrêt devant un contact : la portée de l'arme que l'unité compte employer contre lui
 * (AB-50, qui révise AB-42 3), sinon sa portée de balayage (zone, contact sans arme utilisable).
 * Exemple : une frégate avec des missiles face à une frégate identifiée : 8 ; face à un
 * sous-marin identifié avec des torpilles : 3 ; face à une zone : sa portée de balayage (6).
 */
function contactHoldDistance(unit: Unit, contact: ObservedContact, config: GameConfig): number {
  const weapon = plannedWeapon(unit, contact);
  if (weapon) return config.combat.weapons[weapon].range;
  return config.ships[unit.shipClass].detection?.sweepRange ?? 0;
}

/**
 * Intention d'une unité (AB-38) : un contact exploitable d'abord, qu'elle approche jusqu'à la
 * portée de l'arme qu'elle compte employer (AB-50) ou, à défaut, de son balayage ; sinon
 * l'objectif de la mission, qu'elle approche jusqu'à sa portée de veille (elle y tient position).
 */
export function intentOf(observation: HostileObservation, unit: Unit, config: GameConfig): Intent {
  const detection = config.ships[unit.shipClass].detection;
  const nearest = nearestContact(observation, unit);
  if (nearest) {
    return {
      source: 'contact',
      anchor: nearest.hex,
      holdDistance: contactHoldDistance(unit, nearest.contact, config),
    };
  }
  return {
    source: 'objective',
    anchor: objectiveAnchor(observation, unit, config),
    holdDistance: detection?.watchRange ?? 0,
  };
}
