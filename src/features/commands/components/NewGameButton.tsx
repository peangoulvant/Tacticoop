import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { abandonMission } from '../services/commandActions';

/** Retour à la préparation d'une nouvelle partie, après confirmation de l'abandon. */
export function NewGameButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
        Nouvelle partie
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Abandonner la mission ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            La mission en cours sera perdue et vous reviendrez à la préparation d’une nouvelle
            partie.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Continuer la mission</Button>
          <Button color="error" onClick={abandonMission}>
            Abandonner
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
