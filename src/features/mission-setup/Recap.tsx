import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import {
  PURCHASABLE_CLASSES,
  defaultConfig,
  launchBlockers,
  shipCount,
  type MissionSetup,
  type ShipClass,
} from '../../engine';
import { palette } from '../../app/theme';
import { shipIcon } from '../../shared/assets';
import {
  blockerLabel,
  briefing,
  constraintLabel,
  difficultyLabel,
  missionLabel,
} from '../../shared/labels';
import { useGameStore } from '../../store/useGameStore';
import { BudgetBar } from './BudgetBar';

const newSeed = () => Math.floor(Math.random() * 2 ** 32);

function ShipLine({
  shipClass,
  label,
  detail,
}: {
  shipClass: ShipClass;
  label: string;
  detail: string;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 0.5 }}>
      <Box
        component="img"
        src={shipIcon[shipClass]}
        alt=""
        sx={{ width: 64, height: 22, objectFit: 'contain' }}
      />
      <Typography sx={{ flex: 1 }}>{label}</Typography>
      <Typography color="text.secondary">{detail}</Typography>
    </Stack>
  );
}

function ConstraintChips({ setup }: { setup: MissionSetup }) {
  if (setup.constraints.length === 0) return <Typography variant="body2">Aucune</Typography>;
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
      {setup.constraints.map((c) => (
        <Chip key={c} color="primary" variant="outlined" label={constraintLabel[c].name} />
      ))}
    </Stack>
  );
}

function ForceLines({ setup }: { setup: MissionSetup }) {
  const { ships } = defaultConfig;
  const chosen = PURCHASABLE_CLASSES.filter((cls) => setup.force[cls] > 0);
  return (
    <Box sx={{ my: 1 }}>
      {setup.mission === 'escort' && (
        <ShipLine
          shipClass="carrier"
          label={`${ships.carrier.label} (scénario)`}
          detail="hors budget"
        />
      )}
      {chosen.map((cls) => (
        <ShipLine
          key={cls}
          shipClass={cls}
          label={`${setup.force[cls]} × ${ships[cls].label}`}
          detail={`${setup.force[cls] * ships[cls].cost} pts`}
        />
      ))}
      {chosen.length === 0 && <Typography variant="body2">Aucun bâtiment sélectionné.</Typography>}
    </Box>
  );
}

/** Récapitulatif final, mis en valeur : c'est lui que le joueur confirme avant le lancement. */
export function Recap({ setup }: { setup: MissionSetup }) {
  const dispatch = useGameStore((s) => s.dispatch);
  const blockers = launchBlockers(setup, defaultConfig);
  const objective = briefing[setup.mission].objective;

  return (
    <Paper
      sx={{
        p: 3,
        borderColor: palette.accent,
        borderWidth: 2,
        background: `linear-gradient(160deg, ${palette.panel} 0%, #0d2a52 100%)`,
        boxShadow: `0 0 24px ${palette.accent}33`,
      }}
    >
      <Typography variant="overline" color="primary" sx={{ letterSpacing: 3 }}>
        Ordre de mission
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {missionLabel[setup.mission]}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {objective} — difficulté {difficultyLabel[setup.difficulty]}
      </Typography>

      <Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>
        Contraintes
      </Typography>
      <Box sx={{ mb: 2 }}>
        <ConstraintChips setup={setup} />
      </Box>

      <Typography variant="subtitle2" color="primary">
        Force navale — {shipCount(setup)} bâtiment(s)
      </Typography>
      <ForceLines setup={setup} />
      <BudgetBar setup={setup} />

      {blockers.map((b) => (
        <Alert key={b} severity="warning" sx={{ mt: 2 }}>
          {blockerLabel[b]}
        </Alert>
      ))}
      <Button
        fullWidth
        size="large"
        variant="contained"
        startIcon={<RocketLaunchIcon />}
        sx={{ mt: 3, py: 1.5, fontWeight: 700 }}
        disabled={blockers.length > 0}
        onClick={() => dispatch({ type: 'LAUNCH_MISSION', seed: newSeed() })}
      >
        Lancer la mission
      </Button>
    </Paper>
  );
}
