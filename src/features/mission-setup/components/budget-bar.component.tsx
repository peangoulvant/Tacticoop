import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import * as engine from '../../../engine';

export function BudgetBar({ setup }: { setup: engine.MissionSetup }) {
  const budget = engine.computeBudget(setup, engine.defaultConfig);
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2">
          Budget engagé : {budget.committed} / {budget.total} points
        </Typography>
        <Typography variant="body2" color={budget.overrun ? 'error' : 'text.secondary'}>
          {budget.overrun ? `Dépassement : ${budget.overrun}` : `Disponible : ${budget.available}`}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        color={budget.overrun ? 'error' : 'primary'}
        value={Math.min(100, (budget.committed / budget.total) * 100)}
        sx={{ mt: 0.5 }}
      />
    </Box>
  );
}
