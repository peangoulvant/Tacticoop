import { Alert, Snackbar } from '@mui/material';
import { useActionResultStore } from '../../../store/action-result.store';

/** Durée d'affichage du retour d'une action spéciale (AB-30, AB-45). */
const RESULT_DURATION_MS = 4000;

/**
 * Retour explicite d'une action spéciale, pendant 4 secondes : « Contact identifié », « Aucun
 * nouveau contact » ou « Missile lancé ». Le détail est dans le journal (AB-28).
 */
export function ActionResultToast() {
  const result = useActionResultStore((s) => s.result);
  const clear = useActionResultStore((s) => s.clear);
  if (!result) return null;
  return (
    <Snackbar
      key={result.serial}
      open
      autoHideDuration={RESULT_DURATION_MS}
      onClose={clear}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert severity={result.severity} onClose={clear}>
        {result.message}
      </Alert>
    </Snackbar>
  );
}
