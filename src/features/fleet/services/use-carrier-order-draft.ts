import { useMemo } from 'react';
import * as engine from '../../../engine';
import { useCarrierOrderDraftStore } from '../../../store/carrier-order-draft.store';
import { useSelectionStore } from '../../../store/selection.store';
import {
  buildCarrierOrderDraft,
  buildCarrierRouteView,
  type CarrierOrderDraft,
  type CarrierRouteView,
} from './carrier-order-draft.service';

/** Ordre de navigation en cours de préparation, ou `null` s'il n'y en a pas ou s'il n'est plus possible. */
export function useCarrierOrderDraft(mission: engine.MissionState): CarrierOrderDraft | null {
  const kind = useCarrierOrderDraftStore((s) => s.kind);
  const waypoint = useCarrierOrderDraftStore((s) => s.waypoint);
  return useMemo(
    () => (kind ? buildCarrierOrderDraft(mission, kind, waypoint) : null),
    [mission, kind, waypoint],
  );
}

/** Trajet du porte-avions à afficher sur la carte. */
export function useCarrierRouteView(
  mission: engine.MissionState,
  draft: CarrierOrderDraft | null,
): CarrierRouteView | null {
  const selectedUnitId = useSelectionStore((s) => s.selectedUnitId);
  const carrierSelected =
    mission.units.find((u) => u.id === selectedUnitId)?.shipClass === 'carrier';
  return useMemo(
    () => buildCarrierRouteView(mission, draft, carrierSelected),
    [mission, draft, carrierSelected],
  );
}
