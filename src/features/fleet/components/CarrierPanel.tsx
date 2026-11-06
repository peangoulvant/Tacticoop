import { Box, Button, Stack, Typography } from '@mui/material';
import * as engine from '../../../engine';
import * as labels from '../../../shared/labels';
import { useCarrierOrderDraftStore } from '../../../store/useCarrierOrderDraftStore';
import { carrierOrderUnavailability } from '../services/carrierOrderDraft';
import { startCarrierOrderDraft } from '../services/commandActions';

/** Les trois ordres de navigation, dans l'ordre de G-03.2.3. */
const ORDERS = [
  engine.CarrierOrderKind.CONTINUE,
  engine.CarrierOrderKind.STOP,
  engine.CarrierOrderKind.REROUTE,
];

/**
 * Navigation du porte-avions : ordre en vigueur, point de passage, quota, et les trois ordres.
 * Les ordres restent visibles mais désactivés, avec leur motif, quand ils sont impossibles
 * (SF-03 §5). Le porte-avions n'a ni déplacement ni activation : il se pilote par ces ordres.
 */
export function CarrierPanel({ mission }: { mission: engine.MissionState }) {
  const draftKind = useCarrierOrderDraftStore((s) => s.kind);
  const navigation = mission.carrierNavigation;
  const reason = carrierOrderUnavailability(mission);
  if (!navigation) return null;
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" component="h3">
        {labels.carrierText.title}
      </Typography>
      <Typography variant="body2">{labels.carrierModeLabel[navigation.mode]}</Typography>
      <Typography variant="body2">{labels.carrierWaypointLabel(navigation.waypoint)}</Typography>
      <Typography variant="caption" color="text.secondary">
        {navigation.orderUsed ? labels.carrierText.quotaUsed : labels.carrierText.quotaFree}
      </Typography>
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: '1fr 1fr' }}>
        {ORDERS.map((kind) => (
          <Button
            key={kind}
            variant={draftKind === kind ? 'contained' : 'outlined'}
            disabled={reason !== null}
            onClick={() => startCarrierOrderDraft(kind)}
          >
            {labels.carrierOrderLabel[kind]}
          </Button>
        ))}
      </Box>
      {reason && (
        <Typography variant="caption" color="warning.main">
          {reason}
        </Typography>
      )}
    </Stack>
  );
}
