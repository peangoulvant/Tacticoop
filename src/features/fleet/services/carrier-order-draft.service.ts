import * as engine from '../../../engine';
import * as labelEngine from '../../../shared/engine.label';

/**
 * Brouillon d'ordre de navigation avec son aperçu, calculé par le moteur à partir du type d'ordre
 * et du point de passage choisi.
 */
export interface CarrierOrderDraft {
  kind: engine.CarrierOrderKind;
  waypoint: engine.Hex | null;
  /** Motif de refus du point de passage choisi, ou `null`. */
  refusal: engine.WaypointRefusal | null;
  /** Ordre prêt à être confirmé ; `null` tant que le point de passage manque ou est refusé. */
  order: engine.CarrierOrder | null;
  /** Trajet prévu une fois l'ordre exécuté ; `null` à l'arrêt ou sans ordre valide. */
  route: engine.Hex[] | null;
}

/**
 * Pourquoi aucun ordre de navigation ne peut être donné maintenant, ou `null` : mission terminée,
 * pas d'escorte, activation en cours (G-06.5.3) ou quota du cycle utilisé (G-03.2.4).
 */
export function carrierOrderUnavailability(mission: engine.MissionState): string | null {
  const navigation = mission.carrierNavigation;
  if (mission.outcome) return labelEngine.commandRefusalMessages.MISSION_ENDED;
  if (!navigation) return labelEngine.commandRefusalMessages.NOT_ESCORT_MISSION;
  if (engine.hasActivationInProgress(mission.units)) {
    return engine.BLOCKER_MESSAGES.OTHER_ACTIVATION_IN_PROGRESS;
  }
  return navigation.orderUsed ? labelEngine.commandRefusalMessages.NAVIGATION_QUOTA_USED : null;
}

/** L'ordre à envoyer au moteur, ou `null` si « Modifier l'itinéraire » n'a pas de point valide. */
function orderOf(
  kind: engine.CarrierOrderKind,
  waypoint: engine.Hex | null,
  refusal: engine.WaypointRefusal | null,
): engine.CarrierOrder | null {
  if (kind !== engine.CarrierOrderKind.REROUTE) return { kind };
  return waypoint && !refusal ? { kind, waypoint } : null;
}

/** Trajet après l'ordre : le point de passage choisi, la route actuelle, ou rien à l'arrêt. */
function routeAfter(
  mission: engine.MissionState,
  order: engine.CarrierOrder | null,
): engine.Hex[] | null {
  if (!order || order.kind === engine.CarrierOrderKind.STOP) return null;
  const waypoint = order.kind === engine.CarrierOrderKind.REROUTE ? order.waypoint : undefined;
  return engine.plannedRoute(mission, engine.defaultConfig, waypoint);
}

/** Brouillon et aperçu d'un ordre en préparation, ou `null` si aucun ordre n'est possible. */
export function buildCarrierOrderDraft(
  mission: engine.MissionState,
  kind: engine.CarrierOrderKind,
  waypoint: engine.Hex | null,
): CarrierOrderDraft | null {
  const carrier = engine.carrierOf(mission.units);
  if (!carrier || carrierOrderUnavailability(mission)) return null;
  const refusal =
    kind === engine.CarrierOrderKind.REROUTE && waypoint
      ? engine.waypointRefusal(mission.map, carrier, waypoint, engine.defaultConfig)
      : null;
  const order = orderOf(kind, waypoint, refusal);
  return { kind, waypoint, refusal, order, route: routeAfter(mission, order) };
}

/** Ce que la carte montre du trajet du porte-avions (SF-03.15) ou de l'ordre en préparation. */
export interface CarrierRouteView {
  route: engine.Hex[] | null;
  waypoint: engine.Hex | null;
  /** Le point de passage choisi est refusé : tracé en rouge. */
  refused: boolean;
  /** Un clic sur la carte choisit le point de passage. */
  picking: boolean;
}

/**
 * Trajet affiché : celui de l'ordre en préparation, sinon le trajet en vigueur quand le porte-avions
 * est sélectionné, sinon rien.
 */
export function buildCarrierRouteView(
  mission: engine.MissionState,
  draft: CarrierOrderDraft | null,
  carrierSelected: boolean,
): CarrierRouteView | null {
  if (draft) {
    return {
      route: draft.route,
      waypoint: draft.waypoint,
      refused: draft.refusal !== null,
      picking: draft.kind === engine.CarrierOrderKind.REROUTE,
    };
  }
  if (!carrierSelected || !mission.carrierNavigation) return null;
  const route = engine.plannedRoute(mission, engine.defaultConfig);
  return { route, waypoint: mission.carrierNavigation.waypoint, refused: false, picking: false };
}
