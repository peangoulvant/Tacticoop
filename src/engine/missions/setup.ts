import {
  type GameConfig,
  PURCHASABLE_CLASSES,
  type PurchasableShipClass,
} from '../config/gameConfig';
import { type Rng, shuffle } from '../core/rng';

export type MissionKind = 'naval_combat' | 'escort';
export type Difficulty = 'classic' | 'expert';
export type Constraint = 'limited_means' | 'limited_ammo' | 'degraded_sensors' | 'bad_weather';

export const MISSIONS: readonly MissionKind[] = ['naval_combat', 'escort'];
export const DIFFICULTIES: readonly Difficulty[] = ['classic', 'expert'];
export const CONSTRAINTS: readonly Constraint[] = [
  'limited_means',
  'limited_ammo',
  'degraded_sensors',
  'bad_weather',
];
export const MAX_CONSTRAINTS = 2;

/** Choix du joueur avant lancement (SF-01). */
export interface MissionSetup {
  mission: MissionKind;
  difficulty: Difficulty;
  constraints: Constraint[];
  force: Record<PurchasableShipClass, number>;
}

export const emptyForce = (): Record<PurchasableShipClass, number> => ({
  fremm: 0,
  frigate_da: 0,
  frigate_asm: 0,
  submarine: 0,
});

export const initialSetup = (): MissionSetup => ({
  mission: 'escort',
  difficulty: 'classic',
  constraints: [],
  force: emptyForce(),
});

export interface Budget {
  total: number;
  committed: number;
  /** Points restants, jamais négatif. */
  available: number;
  /** Points dépassés après une contrainte réduisant le budget ; bloque le lancement. */
  overrun: number;
}

export function computeBudget(setup: MissionSetup, config: GameConfig): Budget {
  const total = setup.constraints.includes('limited_means')
    ? config.budget.limitedMeans
    : config.budget.normal;
  const committed = PURCHASABLE_CLASSES.reduce(
    (sum, cls) => sum + setup.force[cls] * config.ships[cls].cost,
    0,
  );
  return {
    total,
    committed,
    available: Math.max(0, total - committed),
    overrun: Math.max(0, committed - total),
  };
}

export const shipCount = (setup: MissionSetup): number =>
  PURCHASABLE_CLASSES.reduce((sum, cls) => sum + setup.force[cls], 0);

export type LaunchBlocker = 'NO_SHIP' | 'BUDGET_EXCEEDED';

/** Raisons pour lesquelles le lancement est refusé (SF-01 §5) ; liste vide = lancement possible. */
export function launchBlockers(setup: MissionSetup, config: GameConfig): LaunchBlocker[] {
  const blockers: LaunchBlocker[] = [];
  if (shipCount(setup) < 1) blockers.push('NO_SHIP');
  if (computeBudget(setup, config).overrun > 0) blockers.push('BUDGET_EXCEEDED');
  return blockers;
}

/** 0 à 2 contraintes, toutes distinctes (SF-01 §4). */
export const areConstraintsValid = (constraints: readonly Constraint[]): boolean =>
  constraints.length <= MAX_CONSTRAINTS &&
  new Set(constraints).size === constraints.length &&
  constraints.every((c) => CONSTRAINTS.includes(c));

/** Tirage aléatoire : le joueur fixe le nombre, le système tire des contraintes distinctes. */
export const drawConstraints = (count: number, rng: Rng): Constraint[] =>
  shuffle(CONSTRAINTS, rng).slice(0, count);
