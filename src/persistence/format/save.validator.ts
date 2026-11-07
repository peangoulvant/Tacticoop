import * as engine from '../../engine';
import {
  isCount,
  isHex,
  isHexOn,
  isOneOf,
  isPositive,
  isRecord,
  isShipClass,
} from './guards.validator';
import type { Json } from './guards.validator';

/** Premier problème détecté, en français, ou `null` si la valeur est valide. */
type Problem = string | null;

/** Exécute les contrôles dans l'ordre et s'arrête au premier problème (les suivants en dépendent). */
function firstProblem(checks: ReadonlyArray<() => Problem>): Problem {
  for (const check of checks) {
    const problem = check();
    if (problem) return problem;
  }
  return null;
}

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
  return state.outcome === null || state.outcome === 'victory' ? null : 'issue de mission inconnue';
}

/** Points A et B : B n'existe qu'en escorte (SF-02 §3). */
function checkEndpoints(state: Json, map: engine.GameMap, escort: boolean): Problem {
  if (!isHexOn(map, state.start)) return 'point de départ hors de la carte';
  const goalIsValid = escort ? isHexOn(map, state.goal) : state.goal === null;
  return goalIsValid ? null : 'point d’arrivée incohérent avec la mission';
}

function checkUnitIdentity(unit: Json): Problem {
  if (typeof unit.id !== 'string' || unit.id === '') return 'identifiant d’unité invalide';
  if (!isOneOf(engine.SIDES, unit.side)) return `camp inconnu pour l’unité ${unit.id}`;
  return isShipClass(unit.shipClass) ? null : `classe de bâtiment inconnue pour l’unité ${unit.id}`;
}

const UNIT_COUNTERS = ['hp', 'movement', 'missiles', 'torpedoes', 'helicopters'] as const;

function checkUnitState(unit: Json, map: engine.GameMap): Problem {
  if (!isHexOn(map, unit.position)) return `unité ${String(unit.id)} hors de la carte`;
  if (!UNIT_COUNTERS.every((key) => isCount(unit[key]))) {
    return `valeurs numériques invalides pour l’unité ${String(unit.id)}`;
  }
  if (!isOneOf(engine.ACTIVATION_STATUSES, unit.activation)) return 'état d’activation inconnu';
  return typeof unit.hasMoved === 'boolean' ? null : 'état de déplacement illisible';
}

function checkUnit(unit: unknown, map: engine.GameMap): Problem {
  if (!isRecord(unit)) return 'unité illisible';
  return checkUnitIdentity(unit) ?? checkUnitState(unit, map);
}

function checkUniqueness(units: readonly engine.Unit[]): Problem {
  if (new Set(units.map((u) => u.id)).size !== units.length)
    return 'identifiants d’unité en double';
  const cells = new Set(units.map((u) => `${u.position.col},${u.position.row}`));
  return cells.size === units.length ? null : 'deux unités sur la même case';
}

/** Le porte-avions existe, une seule fois, si et seulement si la mission est une escorte. */
function checkCarrierPresence(units: readonly engine.Unit[], escort: boolean): Problem {
  const carriers = units.filter((u) => u.shipClass === 'carrier').length;
  return carriers === (escort ? 1 : 0) ? null : 'porte-avions incohérent avec la mission';
}

/** Une sauvegarde n'est faite qu'entre deux séquences complètes (PERSISTANCE.md). */
function checkNoActivationInProgress(units: readonly engine.Unit[]): Problem {
  return units.some((u) => u.activation === 'in_progress')
    ? 'activation en cours : sauvegarde incomplète'
    : null;
}

function checkUnits(state: Json, map: engine.GameMap, escort: boolean): Problem {
  const units = state.units;
  if (!Array.isArray(units)) return 'unités illisibles';
  const first = units.map((unit) => checkUnit(unit, map)).find((problem) => problem !== null);
  if (first) return first;
  const valid = units as engine.Unit[];
  return firstProblem([
    () => checkUniqueness(valid),
    () => checkCarrierPresence(valid, escort),
    () => checkNoActivationInProgress(valid),
  ]);
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
  ]);
}

function isCarrierOrder(order: unknown): boolean {
  if (!isRecord(order)) return false;
  if (order.kind === engine.CarrierOrderKind.REROUTE) return isHex(order.waypoint);
  return (
    order.kind === engine.CarrierOrderKind.CONTINUE || order.kind === engine.CarrierOrderKind.STOP
  );
}

/** Contrôle propre à chaque type d'événement ; le type `Record` impose de les couvrir tous. */
/** Une unité, de la case `from` à la case `to` (déplacement d'unité). */
function isMove(event: Json): boolean {
  return (
    typeof event.unitId === 'string' &&
    isShipClass(event.shipClass) &&
    isHex(event.from) &&
    isHex(event.to)
  );
}

/** Drapeau facultatif : absent, ou vrai (un drapeau faux n'est jamais écrit). */
function isAbsentOrTrue(value: unknown): boolean {
  return value === undefined || value === true;
}

const EVENT_CHECKS: Record<engine.GameEvent['type'], (event: Json) => boolean> = {
  MISSION_LAUNCHED: (e) => isOneOf(engine.MISSIONS, e.mission) && isPositive(e.cycle),
  UNIT_MOVED: (e) => isMove(e) && isPositive(e.cycle) && isAbsentOrTrue(e.interrupted),
  CYCLE_STARTED: (e) => isPositive(e.cycle),
  CARRIER_ORDERED: (e) => isCarrierOrder(e.order) && isPositive(e.cycle),
  CARRIER_MOVED: (e) => isHex(e.from) && isHex(e.to) && isPositive(e.cycle),
  MISSION_WON: (e) => isPositive(e.cycle),
};

const EVENT_TYPES = Object.keys(EVENT_CHECKS) as engine.GameEvent['type'][];

function isEvent(event: unknown): boolean {
  return isRecord(event) && isOneOf(EVENT_TYPES, event.type) && EVENT_CHECKS[event.type](event);
}

/** Contrôle du journal : chaque événement doit être connu et complet. */
export function checkEvents(events: unknown): Problem {
  if (!Array.isArray(events)) return 'journal de bord illisible';
  const invalid = events.findIndex((event) => !isEvent(event));
  return invalid === -1 ? null : `événement ${invalid + 1} du journal invalide`;
}
