import { Box, Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  BLOCKER_MESSAGES,
  defaultConfig,
  moveBlocker,
  orderBlocker,
  type MissionState,
  type Unit,
} from '../../engine';
import { shipIcon } from '../../shared/assets';
import { useMoveDraftStore } from '../../store/useMoveDraftStore';
import { useSelectionStore } from '../../store/useSelectionStore';
import { ActivationBadge } from '../fleet/ActivationBadge';
import { HpBar, StockLine } from '../fleet/UnitStats';
import { endActivation } from './commandActions';

/** Commandes de la maquette encore sans règle d'exécution (actions spéciales : D-04, D-05). */
const UNAVAILABLE_COMMANDS = [
  'Recherche sonar',
  'Lancer hélicoptère',
  'Tirer missile',
  'Tirer torpille',
  'Déployer leurre',
  'Réparation',
];

/** Motif d'indisponibilité à afficher sous les boutons (SF-03.9), ou `null`. */
function unavailabilityReason(mission: MissionState, unit: Unit): string | null {
  const blocker = moveBlocker(mission.units, unit);
  if (!blocker) return null;
  const prefix = blocker === 'ALREADY_MOVED' ? 'Déplacement indisponible' : 'Ordres indisponibles';
  return `${prefix} : ${BLOCKER_MESSAGES[blocker]}`;
}

function CommandButtons({ mission, unit }: { mission: MissionState; unit: Unit }) {
  const startDraft = useMoveDraftStore((s) => s.startDraft);
  const reason = unavailabilityReason(mission, unit);
  return (
    <>
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: '1fr 1fr' }}>
        <Button
          variant="outlined"
          disabled={moveBlocker(mission.units, unit) !== null}
          onClick={() => startDraft(unit.id)}
        >
          Déplacement
        </Button>
        {UNAVAILABLE_COMMANDS.map((label) => (
          <Button key={label} variant="outlined" disabled title="Non disponible dans cette version">
            {label}
          </Button>
        ))}
        <Button
          variant="outlined"
          disabled={orderBlocker(mission.units, unit) !== null}
          onClick={() => endActivation(unit.id)}
        >
          Terminer l’activation
        </Button>
      </Box>
      {reason && (
        <Typography variant="caption" color="warning.main">
          {reason}
        </Typography>
      )}
    </>
  );
}

function UnitHeader({ unit }: { unit: Unit }) {
  const selectUnit = useSelectionStore((s) => s.selectUnit);
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="h6" component="h2">
            {defaultConfig.ships[unit.shipClass].label}
          </Typography>
          <ActivationBadge status={unit.activation} />
        </Stack>
        <Box
          component="img"
          src={shipIcon[unit.shipClass]}
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
export function UnitPanel({ mission }: { mission: MissionState }) {
  const selectedUnitId = useSelectionStore((s) => s.selectedUnitId);
  const unit = mission.units.find((u) => u.id === selectedUnitId);

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
          <CommandButtons mission={mission} unit={unit} />
          <Typography variant="caption" color="text.secondary">
            Les actions spéciales seront activées avec leurs règles d’exécution.
          </Typography>
        </Stack>
      ) : (
        <Typography color="text.secondary">
          Sélectionnez une unité sur la carte ou dans les forces alliées.
        </Typography>
      )}
    </Paper>
  );
}
