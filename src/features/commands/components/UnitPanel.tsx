import { Box, Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import * as engine from '../../../engine';
import * as assets from '../../../shared/assets';
import * as labelEngine from '../../../shared/label-engine';
import { useSelectionStore } from '../../../store/useSelectionStore';
import { ActivationBadge, HpBar, StockLine } from '../../fleet';
import { endActivation, startMoveDraft } from '../services/commandActions';
import { CarrierPanel } from './CarrierPanel';

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
function unavailabilityReason(mission: engine.MissionState, unit: engine.Unit): string | null {
  if (mission.outcome) return labelEngine.commandRefusalMessages.MISSION_ENDED;
  const blocker = engine.moveBlocker(mission.units, unit);
  if (!blocker) return null;
  const prefix = blocker === 'ALREADY_MOVED' ? 'Déplacement indisponible' : 'Ordres indisponibles';
  return `${prefix} : ${engine.BLOCKER_MESSAGES[blocker]}`;
}

function CommandButtons({ mission, unit }: { mission: engine.MissionState; unit: engine.Unit }) {
  const reason = unavailabilityReason(mission, unit);
  const ended = mission.outcome !== null;
  return (
    <>
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: '1fr 1fr' }}>
        <Button
          variant="outlined"
          disabled={ended || engine.moveBlocker(mission.units, unit) !== null}
          onClick={() => startMoveDraft(unit.id)}
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
          disabled={ended || engine.orderBlocker(mission.units, unit) !== null}
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
          {unit.shipClass === 'carrier' ? (
            <CarrierPanel mission={mission} />
          ) : (
            <>
              <CommandButtons mission={mission} unit={unit} />
              <Typography variant="caption" color="text.secondary">
                Les actions spéciales seront activées avec leurs règles d’exécution.
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
