/*
 * Déplacement de l'IA (AB-40) : la case atteignable qui rapproche le plus de l'ancre, au sens du
 * champ de distance de la carte (qui contourne le relief), sans jamais dépasser la distance
 * d'arrêt. Les cases sont celles que l'unité peut réellement atteindre (`reachableHexes`), donc
 * les mêmes règles que pour le joueur.
 */
import type { GameConfig } from '../config/game.config';
import { randomInt, type Rng } from '../core/rng.service';
import type { HostileObservation } from '../detection/observation.types';
import { distanceField, hexFromIndex, indexOf, terrainAt } from '../map/game-map.service';
import { hexDistance, type Hex } from '../map/hex.service';
import { isNavigable } from '../map/terrain.model';
import { reachableHexes } from '../units/unit-movement.service';
import type { Unit } from '../units/unit.model';
import type { Intent } from './objective.ai.service';

/**
 * Distance de marche de chaque case à l'ancre, pour la catégorie de l'unité. Si l'ancre est hors
 * du bassin de l'unité (mer fermée par le relief), on vise la case de son bassin la plus proche de
 * l'ancre : l'unité s'en approche autant que possible puis tient position.
 */
function fieldToward(
  observation: HostileObservation,
  unit: Unit,
  anchor: Hex,
  config: GameConfig,
): Map<number, number> {
  const { map } = observation;
  const category = config.ships[unit.shipClass].category;
  const canEnter = (hex: Hex) => isNavigable(terrainAt(map, hex), category);
  const field = distanceField(map, anchor, canEnter);
  if (field.has(indexOf(map, unit.position))) return field;
  const basin = [...distanceField(map, unit.position, canEnter).keys()].map((key) =>
    hexFromIndex(map, key),
  );
  const closest = basin.reduce((best, hex) =>
    hexDistance(hex, anchor) < hexDistance(best, anchor) ? hex : best,
  );
  return distanceField(map, closest, canEnter);
}

/**
 * Pas restant entre l'unité et l'ancre de son intention (0 si elle y est). Sert à savoir si
 * l'unité a encore quelque chose à faire (choix de l'unité) et à décider de son déplacement.
 */
export function stepsLeft(
  observation: HostileObservation,
  unit: Unit,
  intent: Intent,
  config: GameConfig,
): number {
  const field = fieldToward(observation, unit, intent.anchor, config);
  return field.get(indexOf(observation.map, unit.position)) as number;
}

/**
 * Destination de l'unité pour cette activation, ou `null` si elle tient position (déjà à
 * l'arrêt, ou aucune case atteignable ne la rapproche). Le coût d'une case est sa distance à
 * l'ancre, mais en deçà de la distance d'arrêt tout vaut l'arrêt : l'unité ne s'enfonce pas dans
 * l'ancre. On choisit la case de moindre coût, la plus éloignée de l'ancre en cas d'égalité de coût (on s'arrête au bord de la
 * distance d'arrêt) ; les cases encore ex æquo se départagent par un tirage de `rng`.
 *
 * Exemple : à 8 pas de l'ancre avec un mouvement de 3 et un arrêt à 2, elle vise les cases à 5
 * pas ; à 3 pas, la case à 2 pas ; à 2 pas, elle ne bouge pas.
 */
export function chooseDestination(
  observation: HostileObservation,
  unit: Unit,
  intent: Intent,
  config: GameConfig,
  rng: Rng,
): Hex | null {
  const field = fieldToward(observation, unit, intent.anchor, config);
  const here = field.get(indexOf(observation.map, unit.position)) as number;
  const options = reachableHexes(observation, unit, config).flatMap((hex) => {
    const distance = field.get(indexOf(observation.map, hex));
    return distance === undefined ? [] : [{ hex, distance }];
  });
  const cost = (distance: number) => Math.max(distance, intent.holdDistance);
  const best = options.reduce<(typeof options)[number] | null>(
    (kept, option) =>
      kept === null ||
      cost(option.distance) < cost(kept.distance) ||
      (cost(option.distance) === cost(kept.distance) && option.distance > kept.distance)
        ? option
        : kept,
    null,
  );
  if (!best || cost(best.distance) >= cost(here)) return null;
  const ties = options.filter((option) => option.distance === best.distance);
  return (ties[randomInt(rng, ties.length)] as (typeof options)[number]).hex;
}
