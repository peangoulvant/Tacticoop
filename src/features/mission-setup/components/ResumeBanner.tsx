import { Alert, Button, Stack } from '@mui/material';
import * as labels from '../../../shared/labels';
import { resumeSavedGame } from '../../../store/resumeSavedGame';
import { useSaveStore } from '../../../store/useSaveStore';

/**
 * Propose de reprendre la partie sauvegardée (AB-08). Il n'apparaît qu'une fois la sauvegarde lue
 * et valide. « Nouvelle partie » le masque sans effacer la sauvegarde : elle n'est écrasée qu'au
 * lancement de la mission suivante.
 */
export function ResumeBanner() {
  const found = useSaveStore((s) => s.found);
  const dismissFound = useSaveStore((s) => s.dismissFound);
  if (!found) return null;
  const summary = labels.savedGameSummary(
    found.state.setup.mission,
    found.state.cycle,
    new Date(found.savedAt),
  );
  return (
    <Alert
      severity="info"
      sx={{ mb: 2 }}
      action={
        <Stack direction="row" spacing={1}>
          <Button color="inherit" size="small" onClick={dismissFound}>
            {labels.saveText.newGame}
          </Button>
          <Button color="inherit" size="small" variant="outlined" onClick={resumeSavedGame}>
            {labels.saveText.resume}
          </Button>
        </Stack>
      }
    >
      <strong>{labels.saveText.resumeTitle}</strong> — {summary}
    </Alert>
  );
}
