import type { ReactNode } from 'react';
import { Paper, Stack } from '@mui/material';

/** Barre flottante au bas de la carte : consigne et boutons d'une action en préparation. */
export function MapBar({ children }: { children: ReactNode }) {
  return (
    <Paper
      sx={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        px: 2,
        py: 1,
        bgcolor: 'rgba(6,15,31,0.92)',
        // La barre prend la largeur de son contenu (jusqu'aux bords de la carte), sans retour à la ligne des boutons.
        width: 'max-content',
        maxWidth: 'calc(100% - 32px)',
        '& .MuiButton-root': { whiteSpace: 'nowrap' },
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        {children}
      </Stack>
    </Paper>
  );
}
