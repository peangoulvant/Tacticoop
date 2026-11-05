import { Button, Paper, Stack, Typography } from '@mui/material';
import * as engine from '../../engine';
import { useMoveDraftStore } from '../../store/useMoveDraftStore';
import { confirmMove } from './commandActions';
import type { MoveDraft } from './useMoveDraft';

/** Texte de la barre selon l'avancement de la préparation, et possibilité de confirmer. */
function describeDraft({ unit, reachable, plan }: MoveDraft): {
  text: string;
  warning: boolean;
} {
  const label = engine.defaultConfig.ships[unit.shipClass].label;
  if (!plan) {
    return {
      text: `${label} : choisissez une destination (${reachable.length} cases accessibles).`,
      warning: false,
    };
  }
  if (!plan.ok)
    return { text: `${label} : ${engine.MOVE_REFUSAL_MESSAGES[plan.reason]}`, warning: true };
  const steps = plan.path.length - 1;
  return { text: `${label} : trajet de ${steps} hexagone${steps > 1 ? 's' : ''}.`, warning: false };
}

/** Confirmation ou annulation du brouillon de déplacement (SF-02 §6, SF-03.11). */
export function MoveBar({ move }: { move: MoveDraft | null }) {
  const cancelDraft = useMoveDraftStore((s) => s.cancelDraft);
  if (!move) return null;
  const { text, warning } = describeDraft(move);
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
        <Button size="small" onClick={cancelDraft}>
          Annuler
        </Button>
      </Stack>
    </Paper>
  );
}
