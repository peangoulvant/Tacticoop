import { Box, Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { defaultConfig, type Unit } from '../../engine';
import { HpBar, StockLine } from '../fleet/UnitStats';
import { useSelectionStore } from '../../store/useSelectionStore';

/**
 * Commandes visibles dans la maquette. Aucune n'est branchée : leurs règles d'exécution
 * (D-04, D-05) et le déroulement des activations ne sont pas encore implémentés.
 */
const COMMANDS = [
  'Déplacement',
  'Recherche sonar',
  'Lancer hélicoptère',
  'Tirer missile',
  'Tirer torpille',
  'Déployer leurre',
  'Réparation',
  'Terminer l’activation',
];

export function UnitPanel({ units }: { units: Unit[] }) {
  const { selectedUnitId, selectUnit } = useSelectionStore();
  const unit = units.find((u) => u.id === selectedUnitId);

  return (
    <Paper sx={{ p: 1.5, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      {!unit ? (
        <Typography color="text.secondary">
          Sélectionnez une unité sur la carte ou dans les forces alliées.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h6" component="h2">
                {defaultConfig.ships[unit.shipClass].label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {defaultConfig.ships[unit.shipClass].description}
              </Typography>
            </Box>
            <IconButton aria-label="Fermer" onClick={() => selectUnit(null)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <HpBar unit={unit} />
          <StockLine unit={unit} />
          <Typography variant="body2">
            Déplacement maximal : {unit.movement} hexagone{unit.movement > 1 ? 's' : ''} — position
            ({unit.position.col}, {unit.position.row})
          </Typography>
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: '1fr 1fr' }}>
            {COMMANDS.map((label) => (
              <Button
                key={label}
                variant="outlined"
                disabled
                title="Non disponible dans cette version"
              >
                {label}
              </Button>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">
            Les commandes seront activées avec les règles de cycle et d’action.
          </Typography>
        </Stack>
      )}
    </Paper>
  );
}
