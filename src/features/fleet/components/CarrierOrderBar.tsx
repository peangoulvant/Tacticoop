import { Button, Typography } from '@mui/material';
import * as engine from '../../../engine';
import * as labels from '../../../shared/labels';
import { useCarrierOrderDraftStore } from '../../../store/useCarrierOrderDraftStore';
import { useSelectionStore } from '../../../store/useSelectionStore';
import type { CarrierOrderDraft } from '../services/carrierOrderDraft';
import { closeCycle, confirmCarrierOrder } from '../services/commandActions';
import { MapBar } from './MapBar';

/** Confirmation ou annulation de l'ordre en préparation ; l'annulation ne consomme pas le quota. */
function DraftBar({ draft }: { draft: CarrierOrderDraft }) {
  const cancelDraft = useCarrierOrderDraftStore((s) => s.cancelDraft);
  const { kind, waypoint, refusal, order } = draft;
  return (
    <MapBar>
      <Typography variant="body2" color={refusal ? 'warning.main' : 'text.primary'}>
        {labels.carrierDraftLabel(kind, waypoint, refusal)}
      </Typography>
      <Button
        size="small"
        variant="contained"
        disabled={!order}
        onClick={() => order && confirmCarrierOrder(order)}
      >
        {labels.carrierText.confirm}
      </Button>
      <Button size="small" onClick={cancelDraft}>
        {labels.carrierText.cancel}
      </Button>
    </MapBar>
  );
}

/** Dernière occasion d'ordre (C3=B) : donner un ordre au porte-avions ou clôturer le cycle. */
function FinalOrderBar({ mission }: { mission: engine.MissionState }) {
  const selectUnit = useSelectionStore((s) => s.selectUnit);
  const carrier = engine.carrierOf(mission.units);
  return (
    <MapBar>
      <Typography variant="body2">{labels.carrierText.finalOrder}</Typography>
      <Button size="small" onClick={() => carrier && selectUnit(carrier.id)}>
        {labels.carrierText.giveOrder}
      </Button>
      <Button size="small" variant="contained" onClick={closeCycle}>
        {labels.carrierText.closeCycle}
      </Button>
    </MapBar>
  );
}

/** Barre de navigation sur la carte : ordre en préparation, sinon dernière occasion d'ordre. */
export function CarrierOrderBar({
  mission,
  draft,
}: {
  mission: engine.MissionState;
  draft: CarrierOrderDraft | null;
}) {
  if (draft) return <DraftBar draft={draft} />;
  return engine.isAwaitingFinalOrder(mission) ? <FinalOrderBar mission={mission} /> : null;
}
