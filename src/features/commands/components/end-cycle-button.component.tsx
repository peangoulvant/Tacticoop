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

/** Texte d'avertissement : les activations non utilisées sont perdues (SF-03.5). */
function lossWarning(remaining: number): string {
  if (remaining === 0) return 'Le cycle suivant va s’ouvrir.';
  const units = remaining > 1 ? `${remaining} unités n’ont` : '1 unité n’a';
  return `${units} pas été activée${remaining > 1 ? 's' : ''} : leurs activations seront perdues.`;
}

/**
 * Pourquoi la fin anticipée est impossible, ou `undefined`. Pendant la dernière occasion d'ordre,
 * « Clôturer le cycle » fait la même chose : ce bouton s'efface pour éviter la confusion.
 */
function disabledReason(mission: engine.MissionState): string | undefined {
  if (mission.outcome) return labelEngine.commandRefusalMessages.MISSION_ENDED;
  if (engine.isAwaitingFinalOrder(mission)) return labels.carrierText.endCycleDuringFinalOrder;
  return engine.hasActivationInProgress(mission.units)
    ? engine.BLOCKER_MESSAGES.OTHER_ACTIVATION_IN_PROGRESS
    : undefined;
}

/** Fin anticipée du cycle, avec confirmation. */
export function EndCycleButton({ mission }: { mission: engine.MissionState }) {
  const [open, setOpen] = useState(false);
  const reason = disabledReason(mission);
  const remaining = mission.units.filter((u) => u.activation === 'available').length;

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
          <DialogContentText>{lossWarning(remaining)}</DialogContentText>
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
