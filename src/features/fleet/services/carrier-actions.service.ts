import * as engine from '../../../engine';
import { dispatchAndCloseDrafts } from '../../../store/dispatch-and-close-drafts.service';
import { useCarrierOrderDraftStore } from '../../../store/carrier-order-draft.store';
import { useMoveDraftStore } from '../../../store/move-draft.store';

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
