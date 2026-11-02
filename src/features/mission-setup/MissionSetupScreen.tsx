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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>
        {title}
      </Typography>
      <Box sx={{ mt: 1 }}>{children}</Box>
    </Paper>
  );
}

/** Préparation de mission (SF-01) : l'écran n'affiche que ce que le moteur calcule. */
export function MissionSetupScreen({ setup }: { setup: MissionSetup }) {
  const dispatch = useGameStore((s) => s.dispatch);
  const lastError = useGameStore((s) => s.lastError);
  const budget = computeBudget(setup, defaultConfig);
  const blockers = launchBlockers(setup, defaultConfig);
  const text = briefing[setup.mission];

  const toggleConstraint = (constraint: Constraint) => {
    const active = setup.constraints.includes(constraint);
    const constraints = active
      ? setup.constraints.filter((c) => c !== constraint)
      : [...setup.constraints, constraint];
    dispatch({ type: 'SET_CONSTRAINTS', constraints });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: 2 }}>
        TACTICOOP
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Wargame naval tactique — préparation de mission
      </Typography>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { md: '1fr 1fr' } }}>
        <Stack spacing={2}>
          <Section title="1. Mission et difficulté">
            <ToggleButtonGroup
              exclusive
              fullWidth
              color="primary"
              value={setup.mission}
              onChange={(_, mission) => mission && dispatch({ type: 'SELECT_MISSION', mission })}
              aria-label="Mission"
            >
              {MISSIONS.map((m) => (
                <ToggleButton key={m} value={m}>
                  {missionLabel[m]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <ToggleButtonGroup
              exclusive
              size="small"
              color="primary"
              sx={{ mt: 1.5 }}
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
          </Section>

          <Section title="2. Briefing">
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
          </Section>

          <Section title="3. Contraintes initiales">
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
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                Tirage aléatoire :
              </Typography>
              {[0, 1, 2].map((count) => (
                <Button
                  key={count}
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    dispatch({ type: 'DRAW_RANDOM_CONSTRAINTS', count, seed: newSeed() })
                  }
                >
                  {count}
                </Button>
              ))}
            </Stack>
          </Section>
        </Stack>

        <Stack spacing={2}>
          <Section title="4. Composition de la force">
            <Box sx={{ mb: 1 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  Budget engagé : {budget.committed} / {budget.total} points
                </Typography>
                <Typography variant="body2" color={budget.overrun ? 'error' : 'text.secondary'}>
                  {budget.overrun
                    ? `Dépassement : ${budget.overrun}`
                    : `Disponible : ${budget.available}`}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                color={budget.overrun ? 'error' : 'primary'}
                value={Math.min(100, (budget.committed / budget.total) * 100)}
                sx={{ mt: 0.5 }}
              />
            </Box>
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
                  <Box sx={{ flex: 1 }}>
                    <Typography component="div" sx={{ fontWeight: 600 }}>
                      {spec.label} <Chip size="small" label={`${spec.cost} pts`} />
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {spec.description} PV {spec.maxHp} · Mvt {spec.movement} · {spec.missiles}{' '}
                      missiles · {spec.torpedoes} torpilles · {spec.helicopters} hélico.
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
          </Section>

          <Section title="5. Récapitulatif">
            <Typography>
              {missionLabel[setup.mission]} — {difficultyLabel[setup.difficulty]}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Contraintes :{' '}
              {setup.constraints.length
                ? setup.constraints.map((c) => constraintLabel[c].name).join(', ')
                : 'aucune'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Force : {shipCount(setup)} bâtiment(s) — {budget.committed} / {budget.total} points
            </Typography>
            {blockers.map((b) => (
              <Alert key={b} severity="warning" sx={{ mt: 1 }}>
                {blockerLabel[b]}
              </Alert>
            ))}
            {lastError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {errorMessage(lastError)}
              </Alert>
            )}
            <Button
              fullWidth
              size="large"
              variant="contained"
              sx={{ mt: 2 }}
              disabled={blockers.length > 0}
              onClick={() => dispatch({ type: 'LAUNCH_MISSION', seed: newSeed() })}
            >
              Lancer la mission
            </Button>
          </Section>
        </Stack>
      </Box>
    </Container>
  );
}
