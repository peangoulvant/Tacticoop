import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import * as engine from '../../engine';
import { endCycleEarly } from './commandActions';

/** Texte d'avertissement : les activations non utilisées sont perdues (SF-03.5). */
function lossWarning(remaining: number): string {
  if (remaining === 0) return 'Le cycle suivant va s’ouvrir.';
  const units = remaining > 1 ? `${remaining} unités n’ont` : '1 unité n’a';
  return `${units} pas été activée${remaining > 1 ? 's' : ''} : leurs activations seront perdues.`;
}

/** Fin anticipée du cycle, avec confirmation ; impossible pendant une activation engagée. */
export function EndCycleButton({ mission }: { mission: engine.MissionState }) {
  const [open, setOpen] = useState(false);
  const blocked = engine.hasActivationInProgress(mission.units);
  const remaining = mission.units.filter((u) => u.activation === 'available').length;

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        disabled={blocked}
        title={blocked ? engine.BLOCKER_MESSAGES.OTHER_ACTIVATION_IN_PROGRESS : undefined}
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
