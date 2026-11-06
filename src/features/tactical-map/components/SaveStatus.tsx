import { Alert, Typography } from '@mui/material';
import * as labels from '../../../shared/labels';
import { useSaveStore } from '../../../store/useSaveStore';

/**
 * État de la sauvegarde automatique dans la barre du haut. L'heure n'apparaît qu'après la
 * confirmation d'une écriture ; un échec affiche un avertissement non bloquant jusqu'à la prochaine
 * écriture réussie.
 */
export function SaveStatus() {
  const writeFailed = useSaveStore((s) => s.writeFailed);
  const lastSavedAt = useSaveStore((s) => s.lastSavedAt);
  if (writeFailed) {
    return (
      <Alert severity="warning" sx={{ py: 0 }}>
        {labels.saveText.writeFailed}
      </Alert>
    );
  }
  if (!lastSavedAt) return null;
  return (
    <Typography variant="body2" color="text.secondary">
      {labels.saveText.savedAt(labels.savedTime(lastSavedAt))}
    </Typography>
  );
}
