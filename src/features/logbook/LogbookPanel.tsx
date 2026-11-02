import { Box, Paper, Typography } from '@mui/material';
import type { GameEvent } from '../../engine';
import { missionLabel } from '../../shared/labels';

/** Texte d'un événement ; le catalogue complet du journal reste à arbitrer (D-11). */
function describe(event: GameEvent): string {
  switch (event.type) {
    case 'MISSION_LAUNCHED':
      return `Mission lancée : ${missionLabel[event.mission]}`;
  }
}

export function LogbookPanel({ events }: { events: GameEvent[] }) {
  return (
    <Paper sx={{ p: 1.5, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Journal de bord
      </Typography>
      {events.map((event, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Cycle {event.cycle}
          </Typography>
          <Typography variant="body2">{describe(event)}</Typography>
        </Box>
      ))}
    </Paper>
  );
}
