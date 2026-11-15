/*
 * Missions d'essai pour les tests de l'IA : une mer ouverte (ou un relief donné), des unités
 * posées à la main. Les cases sont décrites par un dessin : « . » mer, « # » montagne.
 */
import { defaultConfig, type ShipClass } from '../../config/game.config';
import type { MissionState } from '../../core/game.types';
import type { Hex } from '../../map/hex.service';
import type { Terrain } from '../../map/terrain.model';
import { initialSetup, type MissionKind } from '../../missions/setup.service';
import { createUnit, type Side, type Unit } from '../../units/unit.model';

/** Unité d'essai à sa dotation de départ, sans contrainte. */
export function makeUnit(id: string, side: Side, shipClass: ShipClass, position: Hex): Unit {
  return createUnit(id, side, shipClass, position, defaultConfig, {
    ammoFactor: 1,
    movementCap: null,
  });
}

/** Carte lue ligne par ligne : « # » est de la montagne, tout le reste de la mer. */
export function mapFromDrawing(rows: readonly string[]): MissionState['map'] {
  const terrain: Terrain[] = rows.flatMap((row) =>
    [...row].map((cell): Terrain => (cell === '#' ? 'mountain' : 'sea')),
  );
  return { width: rows[0]?.length ?? 0, height: rows.length, terrain };
}

/** Mer ouverte de `width` × `height` cases. */
export function openSea(width: number, height: number): MissionState['map'] {
  return mapFromDrawing(Array.from({ length: height }, () => '.'.repeat(width)));
}

interface MissionOptions {
  map: MissionState['map'];
  units: Unit[];
  kind?: MissionKind;
  goal?: Hex | null;
  cycle?: number;
}

/** Mission en cours minimale ; l'escorte a un point B, la lutte navale n'en a pas. */
export function missionOf({
  map,
  units,
  kind = 'naval_combat',
  goal = null,
  cycle = 1,
}: MissionOptions): MissionState {
  return {
    status: 'in_progress',
    setup: { ...initialSetup(), mission: kind },
    map,
    start: { col: 0, row: 0 },
    goal,
    units,
    cycle,
    carrierNavigation: null,
    outcome: null,
    friendContacts: [],
    nextContactNumber: 1,
    hostileContacts: [],
    nextHostileContactNumber: 1,
    rngState: 7,
  };
}
