import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import type { Unit } from '../../engine';
import { palette } from '../../app/theme';
import { weaponIcon } from '../../shared/assets';

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
  const stocks = [
    { label: 'Missiles', icon: weaponIcon.missile, value: unit.missiles },
    { label: 'Torpilles', icon: weaponIcon.torpedo, value: unit.torpedoes },
    { label: 'Hélicoptères', icon: weaponIcon.helicopter, value: unit.helicopters },
  ].filter((s) => s.label !== 'Hélicoptères' || s.value > 0);
  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', color: 'text.secondary' }}>
      {stocks.map((s) => (
        <Box
          key={s.label}
          title={s.label}
          aria-label={`${s.label} ${s.value}`}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <Box
            component="img"
            src={s.icon}
            alt=""
            sx={{ width: 44, height: 24, objectFit: 'contain' }}
          />
          <Typography variant="body2">{s.value}</Typography>
        </Box>
      ))}
    </Box>
  );
}
