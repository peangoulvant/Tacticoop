import * as engine from '../../engine';
import { checkDetection } from './contact.validator';
import {
  firstProblem,
  isCount,
  isHexOn,
  isOneOf,
  isPositive,
  isRecord,
  type Json,
  type Problem,
} from './guards.validator';
import { checkCombat } from './projectile.validator';
import { checkUnits } from './unit.validator';

/*
 * Validation de l'état d'une mission en cours : choix de préparation, carte, progression, points
 * A et B, navigation du porte-avions, puis les unités (`unit.validator.ts`) et les contacts
 * (`contact.validator.ts`), les projectiles et les pertes (`projectile.validator.ts`). Le journal est validé à part (`event.validator.ts`).
 */

function checkConstraints(constraints: unknown): Problem {
  if (!Array.isArray(constraints)) return 'contraintes illisibles';
  if (!constraints.every((c) => isOneOf(engine.CONSTRAINTS, c))) return 'contrainte inconnue';
  if (new Set(constraints).size !== constraints.length) return 'contraintes en double';
  return constraints.length > engine.defaultConfig.constraints.maxCount
    ? 'trop de contraintes'
    : null;
}

function checkForce(force: unknown): Problem {
  if (!isRecord(force)) return 'force navale illisible';
  return engine.PURCHASABLE_CLASSES.every((cls) => isCount(force[cls]))
    ? null
    : 'effectifs de la force navale invalides';
}

function checkSetup(setup: unknown): Problem {
  if (!isRecord(setup)) return 'choix de préparation illisibles';
  if (!isOneOf(engine.MISSIONS, setup.mission)) return 'mission inconnue';
  if (!isOneOf(engine.DIFFICULTIES, setup.difficulty)) return 'difficulté inconnue';
  return checkConstraints(setup.constraints) ?? checkForce(setup.force);
}

function checkDimensions(map: Json): Problem {
  const { width, height, terrain } = map;
  if (!isPositive(width) || !isPositive(height)) return 'dimensions de carte invalides';
  return Array.isArray(terrain) && terrain.length === width * height
    ? null
    : 'tableau de terrains de taille inattendue';
}

function checkMap(map: unknown): Problem {
  if (!isRecord(map)) return 'carte illisible';
  const problem = checkDimensions(map);
  if (problem) return problem;
  return (map.terrain as unknown[]).every((t) => isOneOf(engine.TERRAINS, t))
    ? null
    : 'terrain inconnu';
}

/** Numéro de cycle et issue de la mission. */
function checkProgress(state: Json): Problem {
  if (!isPositive(state.cycle)) return 'numéro de cycle invalide';
  if (state.outcome === null) return state.outcomeCause === null ? null : 'cause de résultat sans résultat';
  const causes: readonly unknown[] =
    state.outcome === 'victory' ? engine.VICTORY_CAUSES : engine.DEFEAT_CAUSES;
  if (state.outcome !== 'victory' && state.outcome !== 'defeat') return 'issue de mission inconnue';
  return causes.includes(state.outcomeCause) ? null : 'cause de résultat inconnue';
}

/** Points A et B : B n'existe qu'en escorte (SF-02 §3). */
function checkEndpoints(state: Json, map: engine.GameMap, escort: boolean): Problem {
  if (!isHexOn(map, state.start)) return 'point de départ hors de la carte';
  const goalIsValid = escort ? isHexOn(map, state.goal) : state.goal === null;
  return goalIsValid ? null : 'point d’arrivée incohérent avec la mission';
}

const NAVIGATION_MODES = [engine.CarrierOrderKind.CONTINUE, engine.CarrierOrderKind.STOP] as const;

function checkNavigationFields(navigation: Json, map: engine.GameMap): Problem {
  if (!isOneOf(NAVIGATION_MODES, navigation.mode)) return 'mode de navigation inconnu';
  if (typeof navigation.orderUsed !== 'boolean') return 'quota de navigation illisible';
  return navigation.waypoint === null || isHexOn(map, navigation.waypoint)
    ? null
    : 'point de passage hors de la carte';
}

/** La navigation du porte-avions n'existe qu'en escorte (G-03.2). */
function checkCarrierNavigation(state: Json, map: engine.GameMap, escort: boolean): Problem {
  const navigation = state.carrierNavigation;
  if (!escort) return navigation === null ? null : 'navigation du porte-avions hors escorte';
  return isRecord(navigation)
    ? checkNavigationFields(navigation, map)
    : 'navigation du porte-avions absente';
}

/** Contrôle de l'état d'une mission en cours ; renvoie le premier problème, ou `null`. */
export function checkMissionState(state: unknown): Problem {
  if (!isRecord(state)) return 'état de la partie illisible';
  if (state.status !== 'in_progress') return 'la partie n’est pas une mission en cours';
  const setupProblem = checkSetup(state.setup) ?? checkMap(state.map);
  if (setupProblem) return setupProblem;
  const map = state.map as engine.GameMap;
  const escort = (state.setup as engine.MissionSetup).mission === 'escort';
  return firstProblem([
    () => checkProgress(state),
    () => checkEndpoints(state, map, escort),
    () => checkUnits(state, map, escort),
    () => checkCarrierNavigation(state, map, escort),
    () => checkDetection(state, map),
    () => checkCombat(state, map),
  ]);
}
