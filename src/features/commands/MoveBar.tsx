import { Button, Paper, Stack, Typography } from '@mui/material';
import { defaultConfig, MOVE_REFUSAL_MESSAGES } from '../../engine';
import { useMovePlanStore } from '../../store/useMovePlanStore';
import { confirmMove } from './commandActions';
import type { MovePreparation } from './useMovePlan';

/** Texte de la barre selon l'avancement de la préparation, et possibilité de confirmer. */
function describePlan({ unit, reachable, plan }: MovePreparation): {
  text: string;
  warning: boolean;
} {
  const label = defaultConfig.ships[unit.shipClass].label;
  if (!plan) {
    return {
      text: `${label} : choisissez une destination (${reachable.length} cases accessibles).`,
      warning: false,
    };
  }
  if (!plan.ok) return { text: `${label} : ${MOVE_REFUSAL_MESSAGES[plan.reason]}`, warning: true };
  const steps = plan.path.length - 1;
  return { text: `${label} : trajet de ${steps} hexagone${steps > 1 ? 's' : ''}.`, warning: false };
}

/** Confirmation ou annulation du déplacement en préparation (SF-02 §6, SF-03.11). */
export function MoveBar({ move }: { move: MovePreparation | null }) {
  const cancel = useMovePlanStore((s) => s.cancel);
  if (!move) return null;
  const { text, warning } = describePlan(move);
  const { unit, destination, plan } = move;
  return (
    <Paper
      sx={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        px: 2,
        py: 1,
        bgcolor: 'rgba(6,15,31,0.92)',
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" color={warning ? 'warning.main' : 'text.primary'}>
          {text}
        </Typography>
        <Button
          size="small"
          variant="contained"
          disabled={!plan?.ok || !destination}
          onClick={() => destination && confirmMove(unit.id, destination)}
        >
          Confirmer
        </Button>
        <Button size="small" onClick={cancel}>
          Annuler
        </Button>
      </Stack>
    </Paper>
  );
}
