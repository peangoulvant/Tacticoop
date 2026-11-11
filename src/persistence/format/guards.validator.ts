import * as engine from '../../engine';

/** Objet JSON quelconque : les valeurs lues dans un fichier ne sont jamais fiables avant validation. */
export type Json = Record<string, unknown>;

export function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Entier supérieur ou égal à 0. */
export function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

/** Entier supérieur ou égal à 1. */
export function isPositive(value: unknown): value is number {
  return isCount(value) && value >= 1;
}

/** La valeur est l'une des chaînes de la liste. */
export function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

export function isShipClass(value: unknown): value is engine.ShipClass {
  return typeof value === 'string' && Object.hasOwn(engine.defaultConfig.ships, value);
}

export function isHex(value: unknown): value is engine.Hex {
  return isRecord(value) && isCount(value.col) && isCount(value.row);
}

/** Hexagone situé à l'intérieur d'une carte de dimensions données. */
export function isHexOn(
  map: Pick<engine.GameMap, 'width' | 'height'>,
  value: unknown,
): value is engine.Hex {
  return isHex(value) && value.col < map.width && value.row < map.height;
}

/**
 * Premier problème détecté, en français, ou `null` si la valeur est valide. Chaque validateur
 * renvoie un `Problem` : le texte sert au diagnostic, jamais à l'affichage (AB-08).
 */
export type Problem = string | null;

/**
 * Exécute les contrôles dans l'ordre et s'arrête au premier problème : les suivants supposent que
 * les précédents sont passés (par exemple, lire `unit.position` n'a de sens que si `unit` est un
 * objet).
 */
export function firstProblem(checks: ReadonlyArray<() => Problem>): Problem {
  for (const check of checks) {
    const problem = check();
    if (problem) return problem;
  }
  return null;
}
