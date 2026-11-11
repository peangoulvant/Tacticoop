import { Box, IconButton, Paper, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import * as engine from '../../../engine';
import * as assets from '../../../shared/assets.config';
import { useSelectionStore } from '../../../store/selection.store';
import { ActivationBadge } from './activation-badge.component';
import { CarrierPanel } from './carrier-panel.component';
import { UnitCommands } from './unit-commands.component';
import { HpBar, StockLine } from './unit-stats.component';

function UnitHeader({ unit }: { unit: engine.Unit }) {
  const selectUnit = useSelectionStore((s) => s.selectUnit);
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="h6" component="h2">
            {engine.defaultConfig.ships[unit.shipClass].label}
          </Typography>
          <ActivationBadge status={unit.activation} />
        </Stack>
        <Box
          component="img"
          src={assets.shipIcon[unit.shipClass]}
          alt=""
          sx={{
            display: 'block',
            width: 160,
            height: 44,
            objectFit: 'contain',
            objectPosition: 'left',
            mt: 0.5,
          }}
        />
      </Box>
      <IconButton aria-label="Fermer" onClick={() => selectUnit(null)}>
        <CloseIcon />
      </IconButton>
    </Stack>
  );
}

/** Fiche et commandes de l'unité sélectionnée ; les règles viennent du moteur. */
export function UnitPanel({ mission }: { mission: engine.MissionState }) {
  const selectedUnitId = useSelectionStore((s) => s.selectedUnitId);
  // La fiche ne montre que des unités connues du joueur (SF-04 §1).
  const unit = engine.observeFriend(mission).units.find((u) => u.id === selectedUnitId);

  return (
    <Paper sx={{ p: 1.5, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      {unit ? (
        <Stack spacing={1.5}>
          <UnitHeader unit={unit} />
          <HpBar unit={unit} />
          <StockLine unit={unit} />
          <Typography variant="body2">
            Déplacement maximal : {unit.movement} hexagone{unit.movement > 1 ? 's' : ''} — position
            ({unit.position.col}, {unit.position.row})
          </Typography>
          {unit.shipClass === 'carrier' ? (
            <CarrierPanel mission={mission} />
          ) : (
            <>
              <UnitCommands mission={mission} unit={unit} />
              <Typography variant="caption" color="text.secondary">
                Les autres actions spéciales seront activées avec leurs règles d’exécution.
              </Typography>
            </>
          )}
        </Stack>
      ) : (
        <Typography color="text.secondary">
          Sélectionnez une unité sur la carte ou dans les forces alliées.
        </Typography>
      )}
    </Paper>
  );
}
