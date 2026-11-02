import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Step,
  StepButton,
  StepContent,
  Stepper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import {
  CONSTRAINTS,
  DIFFICULTIES,
  MAX_CONSTRAINTS,
  MISSIONS,
  PURCHASABLE_CLASSES,
  computeBudget,
  defaultConfig,
  launchBlockers,
  shipCount,
  type Constraint,
  type MissionSetup,
} from '../../engine';
import { palette } from '../../app/theme';
import { shipIcon } from '../../shared/assets';
import {
  blockerLabel,
  briefing,
  constraintLabel,
  difficultyLabel,
  errorMessage,
  missionLabel,
} from '../../shared/labels';
import { useGameStore } from '../../store/useGameStore';

const newSeed = () => Math.floor(Math.random() * 2 ** 32);

const STEPS = ['Mission', 'Briefing', 'Contraintes', 'Force navale', 'Récapitulatif'];
const LAST_STEP = STEPS.length - 1;

/** Boutons Précédent / Suivant d'une étape. */
function StepNav({ step, onStep }: { step: number; onStep: (step: number) => void }) {
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
      <Button disabled={step === 0} onClick={() => onStep(step - 1)}>
        Précédent
      </Button>
      {step < LAST_STEP && (
        <Button variant="contained" onClick={() => onStep(step + 1)}>
          Suivant
        </Button>
      )}
    </Stack>
  );
}

function BudgetBar({ setup }: { setup: MissionSetup }) {
  const budget = computeBudget(setup, defaultConfig);
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2">
          Budget engagé : {budget.committed} / {budget.total} points
        </Typography>
        <Typography variant="body2" color={budget.overrun ? 'error' : 'text.secondary'}>
          {budget.overrun ? `Dépassement : ${budget.overrun}` : `Disponible : ${budget.available}`}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        color={budget.overrun ? 'error' : 'primary'}
        value={Math.min(100, (budget.committed / budget.total) * 100)}
        sx={{ mt: 0.5 }}
      />
    </Box>
  );
}

/** Récapitulatif final, mis en valeur : c'est lui que le joueur confirme avant le lancement. */
function Recap({ setup }: { setup: MissionSetup }) {
  const dispatch = useGameStore((s) => s.dispatch);
  const blockers = launchBlockers(setup, defaultConfig);
  const text = briefing[setup.mission];
  const ships = PURCHASABLE_CLASSES.filter((cls) => setup.force[cls] > 0);

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
        {text.objective.replace(/\.$/, '')} — difficulté {difficultyLabel[setup.difficulty]}
      </Typography>

      <Typography variant="subtitle2" color="primary">
        Contraintes
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2, mt: 0.5, flexWrap: 'wrap', rowGap: 1 }}>
        {setup.constraints.length ? (
          setup.constraints.map((c) => (
            <Chip key={c} color="primary" variant="outlined" label={constraintLabel[c].name} />
          ))
        ) : (
          <Typography variant="body2">Aucune</Typography>
        )}
      </Stack>

      <Typography variant="subtitle2" color="primary">
        Force navale — {shipCount(setup)} bâtiment(s)
      </Typography>
      <Box sx={{ my: 1 }}>
        {setup.mission === 'escort' && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 0.5 }}>
            <Box
              component="img"
              src={shipIcon.carrier}
              alt=""
              sx={{ width: 64, height: 22, objectFit: 'contain' }}
            />
            <Typography sx={{ flex: 1 }}>{defaultConfig.ships.carrier.label} (scénario)</Typography>
            <Typography color="text.secondary">hors budget</Typography>
          </Stack>
        )}
        {ships.map((cls) => (
          <Stack key={cls} direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 0.5 }}>
            <Box
              component="img"
              src={shipIcon[cls]}
              alt=""
              sx={{ width: 64, height: 22, objectFit: 'contain' }}
            />
            <Typography sx={{ flex: 1 }}>
              {setup.force[cls]} × {defaultConfig.ships[cls].label}
            </Typography>
            <Typography color="text.secondary">
              {setup.force[cls] * defaultConfig.ships[cls].cost} pts
            </Typography>
          </Stack>
        ))}
        {ships.length === 0 && <Typography variant="body2">Aucun bâtiment sélectionné.</Typography>}
      </Box>
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

/** Préparation de mission (SF-01) en stepper vertical ; l'écran n'affiche que ce que le moteur calcule. */
export function MissionSetupScreen({ setup }: { setup: MissionSetup }) {
  const dispatch = useGameStore((s) => s.dispatch);
  const lastError = useGameStore((s) => s.lastError);
  const [step, setStep] = useState(0);
  const budget = computeBudget(setup, defaultConfig);
  const text = briefing[setup.mission];

  const toggleConstraint = (constraint: Constraint) => {
    const active = setup.constraints.includes(constraint);
    const constraints = active
      ? setup.constraints.filter((c) => c !== constraint)
      : [...setup.constraints, constraint];
    dispatch({ type: 'SET_CONSTRAINTS', constraints });
  };

  // Résumé affiché sous le titre d'une étape une fois renseignée.
  const summaries = [
    `${missionLabel[setup.mission]} — ${difficultyLabel[setup.difficulty]}`,
    undefined,
    setup.constraints.length
      ? setup.constraints.map((c) => constraintLabel[c].name).join(', ')
      : 'Aucune',
    `${shipCount(setup)} bâtiment(s) — ${budget.committed} / ${budget.total} pts`,
    undefined,
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: 2 }}>
        TACTICOOP
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Wargame naval tactique — préparation de mission
      </Typography>

      {lastError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(lastError)}
        </Alert>
      )}
      <Stepper nonLinear activeStep={step} orientation="vertical">
        {STEPS.map((label, i) => (
          <Step key={label}>
            <StepButton
              optional={
                i !== step && summaries[i] ? (
                  <Typography variant="caption">{summaries[i]}</Typography>
                ) : undefined
              }
              onClick={() => setStep(i)}
            >
              {label}
            </StepButton>
            <StepContent>
              {i === 0 && (
                <>
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    color="primary"
                    value={setup.mission}
                    onChange={(_, mission) =>
                      mission && dispatch({ type: 'SELECT_MISSION', mission })
                    }
                    aria-label="Mission"
                  >
                    {MISSIONS.map((m) => (
                      <ToggleButton key={m} value={m}>
                        {missionLabel[m]}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 0.5 }}>
                    Difficulté de l’IA ennemie
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    color="primary"
                    value={setup.difficulty}
                    onChange={(_, difficulty) =>
                      difficulty && dispatch({ type: 'SET_DIFFICULTY', difficulty })
                    }
                    aria-label="Difficulté"
                  >
                    {DIFFICULTIES.map((d) => (
                      <ToggleButton key={d} value={d}>
                        {difficultyLabel[d]}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </>
              )}

              {i === 1 && (
                <>
                  <Typography gutterBottom>{text.context}</Typography>
                  <Typography variant="body2">
                    <b>Objectif :</b> {text.objective}
                  </Typography>
                  <Typography variant="body2">
                    <b>Victoire :</b> {text.victory}
                  </Typography>
                  <Typography variant="body2">
                    <b>Défaite :</b> {text.defeat}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Renseignement initial : aucun. La force ennemie est inconnue.
                  </Typography>
                </>
              )}

              {i === 2 && (
                <>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Entre 0 et {MAX_CONSTRAINTS} contraintes, modifiables jusqu’au lancement.
                  </Typography>
                  {CONSTRAINTS.map((c) => (
                    <FormControlLabel
                      key={c}
                      sx={{ display: 'flex', alignItems: 'flex-start' }}
                      control={
                        <Checkbox
                          checked={setup.constraints.includes(c)}
                          onChange={() => toggleConstraint(c)}
                        />
                      }
                      label={
                        <>
                          <Typography>{constraintLabel[c].name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {constraintLabel[c].effect}
                          </Typography>
                        </>
                      }
                    />
                  ))}
                  <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
                    <Typography variant="body2">Tirage aléatoire :</Typography>
                    {[0, 1, 2].map((count) => (
                      <Button
                        key={count}
                        size="small"
                        variant="outlined"
                        aria-label={`Tirer ${count} contrainte${count > 1 ? 's' : ''}`}
                        onClick={() =>
                          dispatch({ type: 'DRAW_RANDOM_CONSTRAINTS', count, seed: newSeed() })
                        }
                      >
                        {count}
                      </Button>
                    ))}
                  </Stack>
                </>
              )}

              {i === 3 && (
                <>
                  <BudgetBar setup={setup} />
                  {setup.mission === 'escort' && (
                    <Typography variant="caption" color="text.secondary">
                      Le porte-avions est fourni par le scénario, hors budget.
                    </Typography>
                  )}
                  {PURCHASABLE_CLASSES.map((cls) => {
                    const spec = defaultConfig.ships[cls];
                    return (
                      <Stack
                        key={cls}
                        direction="row"
                        spacing={1}
                        sx={{ py: 1, alignItems: 'center', borderTop: 1, borderColor: 'divider' }}
                      >
                        <Box
                          component="img"
                          src={shipIcon[cls]}
                          alt=""
                          sx={{ width: 72, height: 24, objectFit: 'contain' }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography component="div" sx={{ fontWeight: 600 }}>
                            {spec.label} <Chip size="small" label={`${spec.cost} pts`} />
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {spec.description} PV {spec.maxHp} · Mvt {spec.movement} ·{' '}
                            {spec.missiles} missiles · {spec.torpedoes} torpilles ·{' '}
                            {spec.helicopters} hélico.
                          </Typography>
                        </Box>
                        <IconButton
                          aria-label={`Retirer ${spec.label}`}
                          disabled={setup.force[cls] < 1}
                          onClick={() => dispatch({ type: 'REMOVE_SHIP', shipClass: cls })}
                        >
                          <RemoveIcon />
                        </IconButton>
                        <Typography sx={{ minWidth: 16, textAlign: 'center' }}>
                          {setup.force[cls]}
                        </Typography>
                        <IconButton
                          aria-label={`Ajouter ${spec.label}`}
                          onClick={() => dispatch({ type: 'ADD_SHIP', shipClass: cls })}
                        >
                          <AddIcon />
                        </IconButton>
                      </Stack>
                    );
                  })}
                </>
              )}

              {i === 4 && <Recap setup={setup} />}

              <StepNav step={i} onStep={setStep} />
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Container>
  );
}
