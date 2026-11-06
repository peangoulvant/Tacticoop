import * as engine from '../../../engine';
import { dispatchAndCloseDrafts } from '../../../store/dispatchAndCloseDrafts';
import { useCarrierOrderDraftStore } from '../../../store/useCarrierOrderDraftStore';
import { useMoveDraftStore } from '../../../store/useMoveDraftStore';

export function confirmCarrierOrder(order: engine.CarrierOrder): void {
  dispatchAndCloseDrafts({ type: 'ORDER_CARRIER', order });
}

/** « Clôturer le cycle » : décline la dernière occasion d'ordre de navigation (SF-03 §5). */
export function closeCycle(): void {
  dispatchAndCloseDrafts({ type: 'CLOSE_CYCLE' });
}

/** Prépare un ordre de navigation ; le brouillon de déplacement éventuel est abandonné. */
export function startCarrierOrderDraft(kind: engine.CarrierOrderKind): void {
  useMoveDraftStore.getState().cancelDraft();
  useCarrierOrderDraftStore.getState().startDraft(kind);
}
