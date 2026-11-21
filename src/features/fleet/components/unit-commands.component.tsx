import { Box, Button, Typography } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import * as engine from '../../../engine';
import * as labelEngine from '../../../shared/engine.label';
import * as labels from '../../../shared/ui.label';
import { endActivation, startFireDraft, startMoveDraft, startSweepDraft } from '../../commands';

/** Commandes de la maquette encore sans règle d'exécution (hélicoptères reportés, lots 2 et 3). */
const UNAVAILABLE_COMMANDS = ['Lancer hélicoptère', 'Déployer leurre', 'Réparation'];

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
 * Motif propre au balayage affiché sous les boutons (action déjà utilisée, absence de capteurs),
 * ou `null`. Les motifs d'ordre sont déjà affichés par `unavailabilityReason` ; la récupération,
 * elle, se lit sur le bouton (icône et compte à rebours, `CooldownBadge`).
 */
function sweepOwnReason(mission: engine.MissionState, unit: engine.Unit): string | null {
  const blocker = sweepBlocker(mission, unit);
  if (blocker !== 'SPECIAL_ACTION_USED' && blocker !== 'NO_SENSORS') return null;
  return `${labels.sweepText.unavailable} : ${engine.SPECIAL_ACTION_BLOCKER_MESSAGES[blocker]}`;
}

/** Motif empêchant le tir de `weapon` maintenant, ou `null` s'il est possible (AB-45). */
function fireBlocker(
  mission: engine.MissionState,
  unit: engine.Unit,
  weapon: engine.WeaponKind,
): engine.SpecialActionBlocker | null {
  const observation = engine.observeFriend(mission);
  return engine.specialActionBlocker(
    observation.units,
    unit,
    engine.FIRE_ACTION[weapon],
    observation.cycle,
    engine.defaultConfig,
  );
}

/**
 * Motif propre à un tir affiché sous les boutons : plus de munitions de cette arme, ou `null`.
 * « Action déjà utilisée » est commun à toutes les actions spéciales et déjà dit par le balayage ;
 * les motifs d'ordre sont dits par `unavailabilityReason`.
 */
function fireOwnReason(
  mission: engine.MissionState,
  unit: engine.Unit,
  weapon: engine.WeaponKind,
): string | null {
  if (fireBlocker(mission, unit, weapon) !== 'NO_AMMO') return null;
  return `${labels.fireButtonLabel[weapon]} : ${engine.SPECIAL_ACTION_BLOCKER_MESSAGES.NO_AMMO}`;
}

/**
 * Bouton « Tirer un missile » ou « Tirer une torpille » : ouvre le brouillon ; désactivé avec son
 * motif sinon (AB-45). Le stock se lit dans la fiche de l'unité.
 */
function FireButton({
  mission,
  unit,
  weapon,
}: {
  mission: engine.MissionState;
  unit: engine.Unit;
  weapon: engine.WeaponKind;
}) {
  const disabled = mission.outcome !== null || fireBlocker(mission, unit, weapon) !== null;
  const blocker = fireBlocker(mission, unit, weapon);
  const reason =
    blocker === 'SPECIAL_ACTION_USED' || blocker === 'NO_AMMO'
      ? engine.SPECIAL_ACTION_BLOCKER_MESSAGES[blocker]
      : unavailabilityReason(mission, unit);
  return (
    <Button
      variant="outlined"
      disabled={disabled}
      title={disabled && reason ? reason : labels.fireButtonTitle[weapon]}
      onClick={() => startFireDraft(unit.id, weapon)}
    >
      {labels.fireButtonLabel[weapon]}
    </Button>
  );
}

/**
 * Compte à rebours de la récupération d'une action : une horloge suivie du nombre de cycles
 * restants, posée à gauche du bouton (AB-34). Purement visuel : le texte du bouton reste son nom
 * accessible, et le détail (cycle de retour) est dans l'info-bulle.
 */
function CooldownBadge({ cycles }: { cycles: number }) {
  return (
    <Box
      aria-hidden
      sx={{ position: 'absolute', left: 10, display: 'flex', alignItems: 'center', gap: 0.5 }}
    >
      <AccessTimeIcon fontSize="small" />
      <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
        {cycles}
      </Typography>
    </Box>
  );
}

/**
 * Bouton « Balayage » : ouvre le brouillon ; désactivé avec son motif sinon (AB-30). Pendant la
 * récupération (AB-34), il passe en orange et affiche l'horloge avec les cycles restants.
 */
function SweepButton({ mission, unit }: { mission: engine.MissionState; unit: engine.Unit }) {
  const observation = engine.observeFriend(mission);
  const blocker = sweepBlocker(mission, unit);
  const disabled = mission.outcome !== null || blocker !== null;
  const cooling = blocker === 'ON_COOLDOWN';
  const remaining = engine.cooldownRemaining(
    unit,
    'sweep',
    observation.cycle,
    engine.defaultConfig,
  );
  const from = engine.availableFromCycle(unit, 'sweep', engine.defaultConfig);
  const reason = cooling
    ? labels.sweepCooldownLabel(from)
    : (sweepOwnReason(mission, unit) ?? unavailabilityReason(mission, unit));
  return (
    <Button
      variant="outlined"
      disabled={disabled}
      title={disabled && reason ? reason : labels.sweepText.title}
      onClick={() => startSweepDraft(unit.id)}
      sx={{
        position: 'relative',
        ...(cooling && {
          '&.Mui-disabled': { color: 'warning.main', borderColor: 'warning.main' },
        }),
      }}
    >
      {cooling && <CooldownBadge cycles={remaining} />}
      {labels.sweepText.button}
    </Button>
  );
}

/**
 * Boutons de commande d'une unité alliée : Déplacement, Balayage, tirs, actions pas encore disponibles
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
  const ownReasons = [
    sweepOwnReason(mission, unit),
    ...engine.WEAPON_KINDS.map((weapon) => fireOwnReason(mission, unit, weapon)),
  ];
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
        {engine.WEAPON_KINDS.map((weapon) => (
          <FireButton key={weapon} mission={mission} unit={unit} weapon={weapon} />
        ))}
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
      {[reason, ...ownReasons].map(
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
