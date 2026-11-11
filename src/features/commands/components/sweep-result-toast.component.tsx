import { Alert, Snackbar } from '@mui/material';
import * as labels from '../../../shared/ui.label';
import { useSweepResultStore } from '../../../store/sweep-result.store';

/** Durée d'affichage du retour du balayage (AB-30). */
const RESULT_DURATION_MS = 4000;

/**
 * Retour explicite du balayage, pendant 4 secondes : « Contact identifié » ou « Aucun
 * nouveau contact ». Le détail (identifiant, type, position) est dans le journal (AB-28).
 */
export function SweepResultToast() {
  const result = useSweepResultStore((s) => s.result);
  const clear = useSweepResultStore((s) => s.clear);
  if (!result) return null;
  const found = result.identified > 0;
  return (
    <Snackbar
      key={result.serial}
      open
      autoHideDuration={RESULT_DURATION_MS}
      onClose={clear}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert severity={found ? 'success' : 'info'} onClose={clear}>
        {labels.sweepResultLabel(result.identified)}
      </Alert>
    </Snackbar>
  );
}
