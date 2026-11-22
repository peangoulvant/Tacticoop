import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import * as engine from '../../../engine';
import { palette } from '../../../app/theme.config';
import * as assets from '../../../shared/assets.config';
import * as labels from '../../../shared/ui.label';

/** Barre de PV : lit l'état de l'unité, sans le copier. */
export function HpBar({ unit }: { unit: engine.Unit }) {
  const maxHp = engine.defaultConfig.ships[unit.shipClass].maxHp;
  const percent = Math.round((unit.hp / maxHp) * 100);
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Typography variant="caption" sx={{ width: 28 }}>
        PV
      </Typography>
      <LinearProgress
        variant="determinate"
        value={percent}
        aria-label={`PV ${unit.hp} sur ${maxHp}`}
        sx={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          '& .MuiLinearProgress-bar': { bgcolor: palette.good },
        }}
      />
      <Typography variant="caption" sx={{ width: 64, textAlign: 'right' }}>
        {unit.hp}/{maxHp}
      </Typography>
    </Stack>
  );
}

/**
 * État des quatre composants d'une unité alliée (SF-03.6, SF-05 §5) : en service ou hors service,
 * jamais montré pour un navire hostile. Lit `Unit.disabledComponents`, sans rien calculer.
 */
export function ComponentLine({ unit }: { unit: engine.Unit }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
      {engine.COMPONENT_KINDS.map((kind) => {
        const disabled = engine.isDisabled(unit, kind);
        const name = labels.componentLabel[kind];
        return (
          <Typography
            key={kind}
            variant="caption"
            aria-label={`${name} ${disabled ? 'hors service' : 'en service'}`}
            title={disabled ? `${name} hors service` : `${name} en service`}
            sx={{
              color: disabled ? palette.enemy : palette.good,
              fontWeight: disabled ? 700 : 400,
              textDecoration: disabled ? 'line-through' : 'none',
            }}
          >
            {name}
          </Typography>
        );
      })}
    </Box>
  );
}

/** Stocks actuels (missiles, torpilles, hélicoptères). */
export function StockLine({ unit }: { unit: engine.Unit }) {
  const stocks = [
    { label: 'Missiles', icon: assets.weaponIcon.missile, value: unit.missiles },
    { label: 'Torpilles', icon: assets.weaponIcon.torpedo, value: unit.torpedoes },
    { label: 'Hélicoptères', icon: assets.weaponIcon.helicopter, value: unit.helicopters },
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
