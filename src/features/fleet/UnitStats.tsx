import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import type { Unit } from '../../engine';
import { palette } from '../../app/theme';

/** Barre de PV : lit l'état de l'unité, sans le copier. */
export function HpBar({ unit }: { unit: Unit }) {
  const percent = Math.round((unit.hp / unit.maxHp) * 100);
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Typography variant="caption" sx={{ width: 28 }}>
        PV
      </Typography>
      <LinearProgress
        variant="determinate"
        value={percent}
        aria-label={`PV ${unit.hp} sur ${unit.maxHp}`}
        sx={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          '& .MuiLinearProgress-bar': { bgcolor: palette.good },
        }}
      />
      <Typography variant="caption" sx={{ width: 64, textAlign: 'right' }}>
        {unit.hp}/{unit.maxHp}
      </Typography>
    </Stack>
  );
}

/** Stocks actuels ; les capteurs, la propulsion et la coque de la maquette ne sont pas encore modélisés. */
export function StockLine({ unit }: { unit: Unit }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', color: 'text.secondary' }}>
      <Typography variant="caption">Missiles {unit.missiles}</Typography>
      <Typography variant="caption">Torpilles {unit.torpedoes}</Typography>
      {unit.helicopters > 0 && (
        <Typography variant="caption">Hélico. {unit.helicopters}</Typography>
      )}
    </Box>
  );
}
