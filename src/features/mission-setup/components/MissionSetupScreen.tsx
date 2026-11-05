import { useState } from 'react';
import {
  Alert,
  Button,
  Container,
  Stack,
  Step,
  StepButton,
  StepContent,
  Stepper,
  Typography,
} from '@mui/material';
import * as engine from '../../../engine';
import * as labels from '../../../shared/labels';
import { useGameStore } from '../../../store/useGameStore';
import { Recap } from './Recap';
import { BriefingStep, ConstraintsStep, ForceStep, MissionStep } from './SetupSteps';

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

/** Résumé affiché sous le titre d'une étape non active, une fois renseignée. */
function stepSummaries(setup: engine.MissionSetup): (string | undefined)[] {
  const budget = engine.computeBudget(setup, engine.defaultConfig);
  const constraints = setup.constraints.map((c) => labels.constraintLabel[c].name).join(', ');
  return [
    `${labels.missionLabel[setup.mission]} — ${labels.difficultyLabel[setup.difficulty]}`,
    undefined,
    constraints || 'Aucune',
    `${engine.shipCount(setup)} bâtiment(s) — ${budget.committed} / ${budget.total} pts`,
    undefined,
  ];
}

/** Préparation de mission (SF-01) en stepper vertical ; l'écran n'affiche que ce que le moteur calcule. */
export function MissionSetupScreen({ setup }: { setup: engine.MissionSetup }) {
  const lastError = useGameStore((s) => s.lastError);
  const [step, setStep] = useState(0);
  const summaries = stepSummaries(setup);
  const bodies = [
    <MissionStep key="mission" setup={setup} />,
    <BriefingStep key="briefing" setup={setup} />,
    <ConstraintsStep key="constraints" setup={setup} />,
    <ForceStep key="force" setup={setup} />,
    <Recap key="recap" setup={setup} />,
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
          {labels.errorMessage(lastError)}
        </Alert>
      )}
      <Stepper nonLinear activeStep={step} orientation="vertical">
        {STEPS.map((label, i) => (
          <Step key={label}>
            <StepButton
              optional={i !== step && <Typography variant="caption">{summaries[i]}</Typography>}
              onClick={() => setStep(i)}
            >
              {label}
            </StepButton>
            <StepContent>
              {bodies[i]}
              <StepNav step={i} onStep={setStep} />
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Container>
  );
}
