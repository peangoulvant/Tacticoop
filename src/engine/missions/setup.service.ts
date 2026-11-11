import * as labelEngine from '../../shared/engine.label';
import {
  type GameConfig,
  PURCHASABLE_CLASSES,
  type PurchasableShipClass,
} from '../config/game.config';
import { type Rng, shuffle } from '../core/rng.service';

/** Types de mission jouables : lutte navale (éliminer l'ennemi) et escorte du porte-avions. */
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

/** Choix du joueur avant lancement (SF-01). */
export interface MissionSetup {
  mission: MissionKind;
  difficulty: Difficulty;
  constraints: Constraint[];
  force: Record<PurchasableShipClass, number>;
}

/** Force navale vide : zéro bâtiment de chaque classe achetable. */
export function emptyForce(): Record<PurchasableShipClass, number> {
  return {
    fremm: 0,
    frigate_da: 0,
    frigate_asm: 0,
    submarine: 0,
  };
}

/** Choix par défaut à l'ouverture de l'écran de préparation (SF-01). */
export function initialSetup(): MissionSetup {
  return {
    mission: 'escort',
    difficulty: 'classic',
    constraints: [],
    force: emptyForce(),
  };
}

export interface Budget {
  total: number;
  committed: number;
  /** Points restants, jamais négatif. */
  available: number;
  /** Points dépassés après une contrainte réduisant le budget ; bloque le lancement. */
  overrun: number;
}

/**
 * Budget de la préparation : total (réduit par « Moyens limités »), points engagés, restants et
 * dépassement. Exemple : avec 100 points, une FREMM (35) et une frégate DA (25) engagent 60 points ;
 * il reste 40. Si « Moyens limités » ramène le total à 70 alors que 90 sont engagés, le dépassement
 * est de 20 et le lancement est bloqué.
 */
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

/** Nombre total de bâtiments achetés, toutes classes confondues. */
export function shipCount(setup: MissionSetup): number {
  return PURCHASABLE_CLASSES.reduce((sum, cls) => sum + setup.force[cls], 0);
}

export type LaunchBlocker = 'NO_SHIP' | 'BUDGET_EXCEEDED';

/** Messages présentés au joueur pour chaque motif de blocage du lancement. */
export const LAUNCH_BLOCKER_MESSAGES = labelEngine.launchBlockerMessages satisfies Record<
  LaunchBlocker,
  string
>;

/** Raisons pour lesquelles le lancement est refusé (SF-01 §5) ; liste vide = lancement possible. */
export function launchBlockers(setup: MissionSetup, config: GameConfig): LaunchBlocker[] {
  const blockers: LaunchBlocker[] = [];
  if (shipCount(setup) < 1) blockers.push('NO_SHIP');
  if (computeBudget(setup, config).overrun > 0) blockers.push('BUDGET_EXCEEDED');
  return blockers;
}

/** De 0 à `max` contraintes (2 en V1), toutes distinctes (SF-01 §4). */
export function areConstraintsValid(constraints: readonly Constraint[], max: number): boolean {
  return (
    constraints.length <= max &&
    new Set(constraints).size === constraints.length &&
    constraints.every((c) => CONSTRAINTS.includes(c))
  );
}

/** Tirage aléatoire : le joueur fixe le nombre, le système tire des contraintes distinctes. */
export function drawConstraints(count: number, rng: Rng): Constraint[] {
  return shuffle(CONSTRAINTS, rng).slice(0, count);
}
