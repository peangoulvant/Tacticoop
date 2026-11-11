import * as labelEngine from '../../shared/engine.label';
import type { GameConfig } from '../config/game.config';
import {
  exploreFrom,
  hexFromIndex,
  inBounds,
  indexOf,
  pathTo,
  terrainAt,
  type GameMap,
} from '../map/game-map.service';
import { sameHex, type Hex } from '../map/hex.service';
import { isNavigable } from '../map/terrain.model';
import type { Unit } from './unit.model';

/** Ce que le calcul de déplacement a besoin de connaître : la carte et les unités en place. */
export interface Battlefield {
  map: GameMap;
  units: readonly Unit[];
}

/** Motifs de refus d'un déplacement, présentés au joueur (SF-02 §6). */
export type MoveRefusal = 'SAME_HEX' | 'NOT_NAVIGABLE' | 'OCCUPIED' | 'OUT_OF_RANGE' | 'NO_PATH';

/** Messages présentés au joueur, communs aux refus du moteur et à l'interface. */
export const MOVE_REFUSAL_MESSAGES = labelEngine.moveRefusalMessages satisfies Record<
  MoveRefusal,
  string
>;

export type MovePlan = { ok: true; path: Hex[] } | { ok: false; reason: MoveRefusal };

/**
 * Indices (voir `indexOf`) des cases occupées par une autre unité que `unit`. Partagé par le calcul
 * des cases accessibles et par le parcours réel d'un déplacement : une même définition de
 * « occupée » pour les deux.
 */
function occupiedByOthers(field: Battlefield, unit: Unit): Set<number> {
  return new Set(
    field.units.filter((u) => u.id !== unit.id).map((u) => indexOf(field.map, u.position)),
  );
}

/**
 * Cases où l'unité peut entrer : terrain navigable pour sa catégorie et libre de toute autre
 * unité. Une case occupée est infranchissable, pas seulement interdite comme destination
 * (SF-02 §2 : une seule unité navale par hexagone, y compris pendant les déplacements).
 */
function enterable(field: Battlefield, unit: Unit, config: GameConfig): (hex: Hex) => boolean {
  const category = config.ships[unit.shipClass].category;
  const occupied = occupiedByOthers(field, unit);
  return (hex) =>
    isNavigable(terrainAt(field.map, hex), category) && !occupied.has(indexOf(field.map, hex));
}

/** Destinations accessibles à l'unité dans sa capacité de mouvement, en ordre déterministe. */
export function reachableHexes(field: Battlefield, unit: Unit, config: GameConfig): Hex[] {
  const reached = exploreFrom(
    field.map,
    unit.position,
    enterable(field, unit, config),
    unit.movement,
  );
  const origin = indexOf(field.map, unit.position);
  return [...reached.keys()]
    .filter((key) => key !== origin)
    .map((key) => hexFromIndex(field.map, key));
}

function destinationRefusal(
  field: Battlefield,
  unit: Unit,
  destination: Hex,
  config: GameConfig,
): MoveRefusal | null {
  const category = config.ships[unit.shipClass].category;
  if (sameHex(unit.position, destination)) return 'SAME_HEX';
  if (
    !inBounds(field.map, destination) ||
    !isNavigable(terrainAt(field.map, destination), category)
  ) {
    return 'NOT_NAVIGABLE';
  }
  return field.units.some((u) => sameHex(u.position, destination)) ? 'OCCUPIED' : null;
}

/**
 * Parcours réel d'un déplacement confirmé, sur l'état réel (SF-02 §7, SF-02.15) : l'unité avance
 * le long du chemin prévu et s'arrête au dernier hexagone libre si une autre unité, que le joueur
 * ne connaissait pas, occupe une case du trajet. `field` contient toutes les unités réelles ; le
 * chemin, lui, a été calculé sur ce que le joueur connaît (`FriendObservation`). Le déplacement
 * reste consommé même s'il est interrompu dès le premier hexagone.
 */
export function checkMovedUnitPath(
  field: Battlefield,
  unit: Unit,
  path: readonly Hex[],
): { stop: Hex; interrupted: boolean } {
  const occupied = occupiedByOthers(field, unit);
  const blockedAt = path.findIndex((hex, i) => i > 0 && occupied.has(indexOf(field.map, hex)));
  if (blockedAt === -1) return { stop: path[path.length - 1] as Hex, interrupted: false };
  return { stop: path[blockedAt - 1] as Hex, interrupted: true };
}

/**
 * Chemin le plus court vers une destination, ou le motif du refus. `field` doit être la projection
 * connue du joueur (`FriendObservation`) : un occupant non détecté n'y figure pas, et ne peut donc
 * ni modifier le trajet proposé ni apparaître dans un motif de refus (SF-02 §7). Aucun détour vers une autre
 * destination n'est proposé (SF-02 §6). Un chemin existant mais trop long est « hors de portée » ;
 * s'il n'en existe aucun, même sans limite de mouvement, c'est « aucun chemin ».
 */
export function planMove(
  field: Battlefield,
  unit: Unit,
  destination: Hex,
  config: GameConfig,
): MovePlan {
  const refusal = destinationRefusal(field, unit, destination, config);
  if (refusal) return { ok: false, reason: refusal };
  const canEnter = enterable(field, unit, config);
  const path = pathTo(
    field.map,
    exploreFrom(field.map, unit.position, canEnter, unit.movement),
    destination,
  );
  if (path) return { ok: true, path };
  const farAway = pathTo(field.map, exploreFrom(field.map, unit.position, canEnter), destination);
  return { ok: false, reason: farAway ? 'OUT_OF_RANGE' : 'NO_PATH' };
}
