import { Button, Paper, Stack, Typography } from '@mui/material';
import * as engine from '../../../engine';
import * as labels from '../../../shared/ui.label';
import { closeMission } from '../services/command-actions.service';

/**
 * Bandeau de résultat sur la carte quand la mission est gagnée ou perdue, avec sa cause
 * (SF-08 §1, G-13.2 Q2). Ni bilan ni
 * débriefing : leur contenu reste à arbitrer (D-12). « Nouvelle partie » n'a pas besoin de
 * confirmation puisqu'il n'y a plus de mission à perdre.
 */
export function MissionResultBanner({ mission }: { mission: engine.MissionState }) {
  if (!mission.outcome || !mission.outcomeCause) return null;
  const victory = mission.outcome === 'victory';
  return (
    <Paper
      role="status"
      sx={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        px: 3,
        py: 1.5,
        bgcolor: 'rgba(6,15,31,0.95)',
        border: 1,
        borderColor: victory ? 'success.main' : 'error.main',
      }}
    >
      <Stack spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="h6" component="h2" color={victory ? 'success.main' : 'error.main'}>
          {victory ? labels.carrierText.victoryTitle : labels.carrierText.defeatTitle}
        </Typography>
        <Typography variant="body2">{labels.resultCauseText(mission)}</Typography>
        <Button size="small" variant="contained" onClick={closeMission}>
          {labels.carrierText.newGame}
        </Button>
      </Stack>
    </Paper>
  );
}
