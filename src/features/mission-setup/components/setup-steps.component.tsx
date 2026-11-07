import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import * as engine from '../../../engine';
import * as assets from '../../../shared/assets.config';
import * as labels from '../../../shared/ui.label';
import { useGameStore } from '../../../store/game.store';
import { BudgetBar } from './budget-bar.component';

function newSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}

/** Contenu des étapes de préparation (SF-01) ; chaque étape envoie ses choix au moteur. */
export function MissionStep({ setup }: { setup: engine.MissionSetup }) {
  const dispatch = useGameStore((s) => s.dispatch);
  return (
    <>
      <ToggleButtonGroup
        exclusive
        fullWidth
        color="primary"
        value={setup.mission}
        onChange={(_, mission) => mission && dispatch({ type: 'SELECT_MISSION', mission })}
        aria-label="Mission"
      >
        {engine.MISSIONS.map((m) => (
          <ToggleButton key={m} value={m}>
            {labels.missionLabel[m]}
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
        onChange={(_, difficulty) => difficulty && dispatch({ type: 'SET_DIFFICULTY', difficulty })}
        aria-label="Difficulté"
      >
        {engine.DIFFICULTIES.map((d) => (
          <ToggleButton key={d} value={d}>
            {labels.difficultyLabel[d]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </>
  );
}

export function BriefingStep({ setup }: { setup: engine.MissionSetup }) {
  const text = labels.briefing[setup.mission];
  return (
    <>
      <Typography gutterBottom>{text.context}</Typography>
      <Typography variant="body2">
        <b>Objectif :</b> {text.objective}.
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
  );
}

export function ConstraintsStep({ setup }: { setup: engine.MissionSetup }) {
  const dispatch = useGameStore((s) => s.dispatch);
  const toggle = (constraint: engine.Constraint) => {
    const others = setup.constraints.filter((c) => c !== constraint);
    const active = others.length < setup.constraints.length;
    dispatch({ type: 'SET_CONSTRAINTS', constraints: active ? others : [...others, constraint] });
  };
  return (
    <>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Entre 0 et {engine.defaultConfig.constraints.maxCount} contraintes, modifiables jusqu’au
        lancement.
      </Typography>
      {engine.CONSTRAINTS.map((c) => (
        <FormControlLabel
          key={c}
          sx={{ display: 'flex', alignItems: 'flex-start' }}
          control={<Checkbox checked={setup.constraints.includes(c)} onChange={() => toggle(c)} />}
          label={
            <>
              <Typography>{labels.constraintLabel[c].name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {labels.constraintLabel[c].effect}
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
            onClick={() => dispatch({ type: 'DRAW_RANDOM_CONSTRAINTS', count, seed: newSeed() })}
          >
            {count}
          </Button>
        ))}
      </Stack>
    </>
  );
}

function ShipRow({
  shipClass,
  setup,
}: {
  shipClass: engine.PurchasableShipClass;
  setup: engine.MissionSetup;
}) {
  const dispatch = useGameStore((s) => s.dispatch);
  const spec = engine.defaultConfig.ships[shipClass];
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ py: 1, alignItems: 'center', borderTop: 1, borderColor: 'divider' }}
    >
      <Box
        component="img"
        src={assets.shipIcon[shipClass]}
        alt=""
        sx={{ width: 72, height: 24, objectFit: 'contain' }}
      />
      <Box sx={{ flex: 1 }}>
        <Typography component="div" sx={{ fontWeight: 600 }}>
          {spec.label} <Chip size="small" label={`${spec.cost} pts`} />
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {spec.description} PV {spec.maxHp} · Mvt {spec.movement} · {spec.missiles} missiles ·{' '}
          {spec.torpedoes} torpilles · {spec.helicopters} hélico.
        </Typography>
      </Box>
      <IconButton
        aria-label={`Retirer ${spec.label}`}
        disabled={setup.force[shipClass] < 1}
        onClick={() => dispatch({ type: 'REMOVE_SHIP', shipClass })}
      >
        <RemoveIcon />
      </IconButton>
      <Typography sx={{ minWidth: 16, textAlign: 'center' }}>{setup.force[shipClass]}</Typography>
      <IconButton
        aria-label={`Ajouter ${spec.label}`}
        onClick={() => dispatch({ type: 'ADD_SHIP', shipClass })}
      >
        <AddIcon />
      </IconButton>
    </Stack>
  );
}

export function ForceStep({ setup }: { setup: engine.MissionSetup }) {
  return (
    <>
      <BudgetBar setup={setup} />
      {setup.mission === 'escort' && (
        <Typography variant="caption" color="text.secondary">
          Le porte-avions est fourni par le scénario, hors budget.
        </Typography>
      )}
      {engine.PURCHASABLE_CLASSES.map((cls) => (
        <ShipRow key={cls} shipClass={cls} setup={setup} />
      ))}
    </>
  );
}
