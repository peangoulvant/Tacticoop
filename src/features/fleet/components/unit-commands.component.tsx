import { Box, Button, Typography } from '@mui/material';
import * as engine from '../../../engine';
import * as labelEngine from '../../../shared/engine.label';
import * as labels from '../../../shared/ui.label';
import { endActivation, startMoveDraft, startSweepDraft } from '../../commands';

/** Commandes de la maquette encore sans règle d'exécution (actions spéciales : D-04, D-05). */
const UNAVAILABLE_COMMANDS = [
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

/** Motif empêchant le balayage maintenant, ou `null` s'il est possible (G-07.7, AB-34). */
function sweepBlocker(
  mission: engine.MissionState,
  unit: engine.Unit,
): engine.SpecialActionBlocker | null {
  const observation = engine.observeFriend(mission);
  return engine.specialActionBlocker(
    observation.units,
    unit,
    'sweep',
    observation.cycle,
    engine.defaultConfig,
  );
}

/**
 * Motif propre au balayage (action déjà utilisée, récupération, absence de capteurs), ou `null`.
 * Les motifs d'ordre sont déjà affichés par `unavailabilityReason`. Pendant la récupération, le
 * message dit à quel cycle le balayage redevient possible.
 */
function sweepOwnReason(mission: engine.MissionState, unit: engine.Unit): string | null {
  const blocker = sweepBlocker(mission, unit);
  if (blocker === 'ON_COOLDOWN') {
    const from = engine.availableFromCycle(unit, 'sweep', engine.defaultConfig);
    return labels.sweepCooldownLabel(from);
  }
  if (blocker !== 'SPECIAL_ACTION_USED' && blocker !== 'NO_SENSORS') return null;
  return `${labels.sweepText.unavailable} : ${engine.SPECIAL_ACTION_BLOCKER_MESSAGES[blocker]}`;
}

/** Bouton « Balayage » : ouvre le brouillon ; désactivé avec son motif sinon (AB-30). */
function SweepButton({ mission, unit }: { mission: engine.MissionState; unit: engine.Unit }) {
  const disabled = mission.outcome !== null || sweepBlocker(mission, unit) !== null;
  const reason = sweepOwnReason(mission, unit) ?? unavailabilityReason(mission, unit);
  return (
    <Button
      variant="outlined"
      disabled={disabled}
      title={disabled && reason ? reason : labels.sweepText.title}
      onClick={() => startSweepDraft(unit.id)}
    >
      {labels.sweepText.button}
    </Button>
  );
}

/**
 * Boutons de commande d'une unité alliée : Déplacement, Balayage, actions pas encore disponibles
 * et « Terminer l'activation ». Chaque bouton est activé ou désactivé selon ce que dit le moteur
 * (`moveBlocker`, `specialActionBlocker`, `orderBlocker`) : ce composant ne reconnaît aucune
 * règle de jeu, il affiche les motifs que le moteur donne (SF-03.9).
 */
export function UnitCommands({
  mission,
  unit,
}: {
  mission: engine.MissionState;
  unit: engine.Unit;
}) {
  const reason = unavailabilityReason(mission, unit);
  const sweepReason = sweepOwnReason(mission, unit);
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
        <SweepButton mission={mission} unit={unit} />
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
      {[reason, sweepReason].map(
        (text) =>
          text && (
            <Typography key={text} variant="caption" color="warning.main">
              {text}
            </Typography>
          ),
      )}
    </>
  );
}
