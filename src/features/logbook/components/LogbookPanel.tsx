import { Box, Paper, Typography } from '@mui/material';
import * as engine from '../../../engine';
import * as labels from '../../../shared/labels';

/** Texte d'un événement ; le catalogue complet du journal reste à arbitrer (D-11). */
function describe(event: engine.GameEvent): string {
  switch (event.type) {
    case 'MISSION_LAUNCHED':
      return `Mission lancée : ${labels.missionLabel[event.mission]}`;
    case 'UNIT_MOVED':
      return `${engine.defaultConfig.ships[event.shipClass].label} : déplacement de (${event.from.col}, ${event.from.row}) vers (${event.to.col}, ${event.to.row})`;
    case 'CYCLE_STARTED':
      return `Cycle ${event.cycle} ouvert`;
    default:
      return describeCarrierEvent(event);
  }
}

type CarrierEvent = Extract<
  engine.GameEvent,
  { type: 'CARRIER_ORDERED' | 'CARRIER_MOVED' | 'MISSION_WON' }
>;

/** Texte des événements du porte-avions et de la victoire (journal provisoire, D-11). */
function describeCarrierEvent(event: CarrierEvent): string {
  switch (event.type) {
    case 'CARRIER_ORDERED':
      return `Porte-avions : ordre « ${labels.carrierOrderLabel[event.order.kind]} »`;
    case 'CARRIER_MOVED':
      return `Porte-avions : navigation de (${event.from.col}, ${event.from.row}) vers (${event.to.col}, ${event.to.row})`;
    case 'MISSION_WON':
      return 'Mission réussie : le porte-avions est arrivé en B';
  }
}

export function LogbookPanel({ events }: { events: engine.GameEvent[] }) {
  return (
    <Paper sx={{ p: 1.5, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Journal de bord
      </Typography>
      {events.map((event, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            Cycle {event.cycle}
          </Typography>
          <Typography variant="body2">{describe(event)}</Typography>
        </Box>
      ))}
    </Paper>
  );
}
