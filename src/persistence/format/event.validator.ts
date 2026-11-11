import * as engine from '../../engine';
import {
  isHex,
  isOneOf,
  isPositive,
  isRecord,
  isShipClass,
  type Json,
  type Problem,
} from './guards.validator';

/*
 * Validation du journal de bord : chaque événement doit être d'un type connu et complet. Le type
 * `Record` de `EVENT_CHECKS` impose un contrôle pour chaque type d'événement du moteur.
 */

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

/** Zone de contact : de 1 à `zoneSize` hexagones. */
function isZone(zone: unknown): boolean {
  return (
    Array.isArray(zone) &&
    zone.length >= 1 &&
    zone.length <= engine.defaultConfig.detection.zoneSize &&
    zone.every(isHex)
  );
}

/** Drapeau facultatif : absent, ou vrai (un drapeau faux n'est jamais écrit). */
function isAbsentOrTrue(value: unknown): boolean {
  return value === undefined || value === true;
}

/** Navire identifié dans le journal : identifiant, type et position exacte (AB-28). */
function isIdentification(item: unknown): boolean {
  return (
    isRecord(item) &&
    typeof item.contactId === 'string' &&
    engine.CONTACT_ID_PATTERN.test(item.contactId) &&
    isOneOf(engine.CONTACT_TARGET_TYPES, item.targetType) &&
    isHex(item.position)
  );
}

/** Balayage : unité émettrice et navires identifiés, éventuellement aucun (AB-28). */
function isSweep(event: Json): boolean {
  return (
    typeof event.unitId === 'string' &&
    isShipClass(event.shipClass) &&
    isPositive(event.cycle) &&
    Array.isArray(event.identified) &&
    event.identified.every(isIdentification)
  );
}

const EVENT_CHECKS: Record<engine.GameEvent['type'], (event: Json) => boolean> = {
  MISSION_LAUNCHED: (e) => isOneOf(engine.MISSIONS, e.mission) && isPositive(e.cycle),
  UNIT_MOVED: (e) => isMove(e) && isPositive(e.cycle) && isAbsentOrTrue(e.interrupted),
  CYCLE_STARTED: (e) => isPositive(e.cycle),
  CARRIER_ORDERED: (e) => isCarrierOrder(e.order) && isPositive(e.cycle),
  CARRIER_MOVED: (e) => isHex(e.from) && isHex(e.to) && isPositive(e.cycle),
  CONTACT_DETECTED: (e) =>
    typeof e.contactId === 'string' &&
    engine.CONTACT_ID_PATTERN.test(e.contactId) &&
    isPositive(e.cycle) &&
    isZone(e.zone),
  SWEEP_PERFORMED: isSweep,
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
