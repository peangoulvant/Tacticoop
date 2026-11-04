import { Box, Paper, Stack, Typography } from '@mui/material';
import { defaultConfig, type Unit } from '../../engine';
import { palette } from '../../app/theme';
import { useSelectionStore } from '../../store/useSelectionStore';
import { shipIcon } from '../../shared/assets';
import { ActivationBadge } from './ActivationBadge';
import { HpBar, StockLine } from './UnitStats';

/** Forces alliées : cartes cliquables, l'état affiché vient du GameState. */
export function FleetPanel({ units }: { units: Unit[] }) {
  const { selectedUnitId, selectUnit, selectHex } = useSelectionStore();
  const friends = units.filter((u) => u.side === 'friend');

  return (
    <Paper sx={{ p: 1.5, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Forces alliées
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
        }}
      >
        {friends.map((unit) => {
          const selected = unit.id === selectedUnitId;
          return (
            <Paper
              key={unit.id}
              component="button"
              aria-pressed={selected}
              aria-label={defaultConfig.ships[unit.shipClass].label}
              onClick={() => {
                selectUnit(unit.id);
                selectHex(unit.position);
              }}
              sx={{
                p: 1,
                textAlign: 'left',
                color: 'inherit',
                font: 'inherit',
                cursor: 'pointer',
                borderColor: selected ? palette.accent : palette.panelBorder,
                borderWidth: selected ? 2 : 1,
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 700 }}>
                  {defaultConfig.ships[unit.shipClass].label}
                </Typography>
                <ActivationBadge status={unit.activation} />
              </Stack>
              <Box
                component="img"
                src={shipIcon[unit.shipClass]}
                alt=""
                sx={{ display: 'block', width: '100%', height: 36, objectFit: 'contain', my: 0.5 }}
              />
              <HpBar unit={unit} />
              <StockLine unit={unit} />
            </Paper>
          );
        })}
      </Box>
    </Paper>
  );
}
