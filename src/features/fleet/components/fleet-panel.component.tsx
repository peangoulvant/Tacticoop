import { Box, Paper, Stack, Typography } from '@mui/material';
import * as engine from '../../../engine';
import { palette } from '../../../app/theme.config';
import { useSelectionStore } from '../../../store/selection.store';
import * as assets from '../../../shared/assets.config';
import * as labels from '../../../shared/ui.label';
import { ActivationBadge } from './activation-badge.component';
import { HpBar, StockLine } from './unit-stats.component';

/** Largeur minimale d'une carte : assez large pour que le nom et l'état tiennent sur une ligne. */
const CARD_WIDTH = 270;

/**
 * Nom accessible d'une carte d'unité : sa classe et son état d'activation, pour qu'un lecteur
 * d'écran annonce aussi si l'unité peut agir. Exemple : « Frégate DA, Disponible ». Le porte-avions
 * n'a pas d'état d'activation : « Porte-avions ».
 */
function cardLabel(unit: engine.Unit): string {
  const name = engine.defaultConfig.ships[unit.shipClass].label;
  return unit.activation === 'not_activable'
    ? name
    : `${name}, ${labels.activationLabel[unit.activation]}`;
}

/**
 * Forces alliées : cartes cliquables, l'état affiché vient du GameState. Les cartes restent sur
 * une seule rangée et la rangée défile horizontalement quand la flotte ne tient pas dans la
 * largeur : la hauteur du panneau, fixe, n'est jamais dépassée.
 */
export function FleetPanel({ units }: { units: engine.Unit[] }) {
  const { selectedUnitId, selectUnit, selectHex } = useSelectionStore();
  const friends = units.filter((u) => u.side === 'friend');

  return (
    <Paper
      sx={{
        p: 1.5,
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        Forces alliées
      </Typography>
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          flex: 1,
          minHeight: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        {friends.map((unit) => {
          const selected = unit.id === selectedUnitId;
          return (
            <Paper
              key={unit.id}
              component="button"
              aria-pressed={selected}
              aria-label={cardLabel(unit)}
              onClick={() => {
                selectUnit(unit.id);
                selectHex(unit.position);
              }}
              sx={{
                flex: `0 0 ${CARD_WIDTH}px`,
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
                  {engine.defaultConfig.ships[unit.shipClass].label}
                </Typography>
                <ActivationBadge status={unit.activation} />
              </Stack>
              <Box
                component="img"
                src={assets.shipIcon[unit.shipClass]}
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
