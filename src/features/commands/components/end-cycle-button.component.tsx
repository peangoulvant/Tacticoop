import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import * as engine from '../../../engine';
import * as labels from '../../../shared/ui.label';
import * as labelEngine from '../../../shared/engine.label';
import { endCycleEarly } from '../services/command-actions.service';

/**
 * Texte d'avertissement : les activations non utilisées sont perdues et l'activation en cours est
 * terminée (SF-03.5, AB-31).
 */
function lossWarning(remaining: number, inProgress: number): string {
  const closing = inProgress > 0 ? 'L’activation en cours sera terminée. ' : '';
  if (remaining === 0) return `${closing}Le cycle suivant va s’ouvrir.`;
  if (remaining === 1) return `${closing}1 unité n’a pas été activée : son activation sera perdue.`;
  return `${closing}${remaining} unités n’ont pas été activées : leurs activations seront perdues.`;
}

/**
 * Pourquoi la fin anticipée est impossible, ou `undefined`. Pendant la dernière occasion d'ordre,
 * « Clôturer le cycle » fait la même chose : ce bouton s'efface pour éviter la confusion.
 */
function disabledReason(mission: engine.MissionState): string | undefined {
  if (mission.outcome) return labelEngine.commandRefusalMessages.MISSION_ENDED;
  if (engine.isAwaitingFinalOrder(mission)) return labels.carrierText.endCycleDuringFinalOrder;
  return undefined;
}

/** Fin anticipée du cycle, avec confirmation. */
export function EndCycleButton({ mission }: { mission: engine.MissionState }) {
  const [open, setOpen] = useState(false);
  const reason = disabledReason(mission);
  const remaining = mission.units.filter((u) => u.activation === 'available').length;
  const inProgress = mission.units.filter((u) => u.activation === 'in_progress').length;

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        disabled={reason !== undefined}
        title={reason}
        onClick={() => setOpen(true)}
      >
        Terminer le cycle
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Terminer le cycle ?</DialogTitle>
        <DialogContent>
          <DialogContentText>{lossWarning(remaining, inProgress)}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Continuer à jouer</Button>
          <Button
            onClick={() => {
              setOpen(false);
              endCycleEarly();
            }}
          >
            Terminer le cycle
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
