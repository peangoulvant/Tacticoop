import { Button, Typography } from '@mui/material';
import * as engine from '../../../engine';
import { useMoveDraftStore } from '../../../store/useMoveDraftStore';
import { confirmMove } from '../services/commandActions';
import type { MoveDraft } from '../services/useMoveDraft';
import { MapBar } from '../../../shared/MapBar';

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
    <MapBar>
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
    </MapBar>
  );
}
