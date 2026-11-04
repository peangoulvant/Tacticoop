import { Chip } from '@mui/material';
import * as engine from '../../engine';
import * as labels from '../../shared/labels';

const COLORS = { available: 'success', in_progress: 'warning', activated: 'default' } as const;

/** État d'activation de l'unité dans le cycle ; rien pour une unité non activable. */
export function ActivationBadge({ status }: { status: engine.ActivationStatus }) {
  if (status === 'not_activable') return null;
  return (
    <Chip
      size="small"
      variant={status === 'activated' ? 'outlined' : 'filled'}
      color={COLORS[status]}
      label={labels.activationLabel[status]}
    />
  );
}
