import { useEffect, useRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import * as engine from '../../../engine';
import * as labels from '../../../shared/ui.label';

/**
 * Journal de bord : les événements du moteur, du plus ancien au plus récent, avec leur cycle. Les
 * textes viennent de `labels.eventLabel` ; ce composant ne décide de rien. Le défilement suit le
 * dernier message : à chaque événement ajouté, la barre descend tout en bas, même si le joueur
 * avait remonté dans l'historique.
 */
export function LogbookPanel({ events }: { events: engine.GameEvent[] }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (panel.current) panel.current.scrollTop = panel.current.scrollHeight;
  }, [events.length]);

  return (
    <Paper ref={panel} sx={{ p: 1.5, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Journal de bord
      </Typography>
      {events.map((event, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            Cycle {event.cycle}
          </Typography>
          <Typography variant="body2">{labels.eventLabel(event)}</Typography>
        </Box>
      ))}
    </Paper>
  );
}
