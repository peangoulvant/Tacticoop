import { Box, Paper, Typography } from '@mui/material';
import * as engine from '../../../engine';
import * as labels from '../../../shared/ui.label';

/** Texte d'un événement ; le catalogue complet du journal reste à arbitrer (D-11). */
function describe(event: engine.GameEvent): string {
  switch (event.type) {
    case 'MISSION_LAUNCHED':
      return `Mission lancée : ${labels.missionLabel[event.mission]}`;
    case 'UNIT_MOVED':
      if (event.interrupted) {
        return `${engine.defaultConfig.ships[event.shipClass].label} : ${labels.interruptedMoveText} (de (${event.from.col}, ${event.from.row}) à (${event.to.col}, ${event.to.row}))`;
      }
      return `${engine.defaultConfig.ships[event.shipClass].label} : déplacement de (${event.from.col}, ${event.from.row}) vers (${event.to.col}, ${event.to.row})`;
    case 'CYCLE_STARTED':
      return `Cycle ${event.cycle} ouvert`;
    default:
      return labels.carrierEventLabel(event);
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
