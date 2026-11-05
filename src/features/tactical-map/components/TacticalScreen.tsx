import { useCallback, useRef, useState } from 'react';
import { Alert, Box, Paper, Snackbar, Stack, Typography } from '@mui/material';
import * as engine from '../../../engine';
import * as labels from '../../../shared/labels';
import { useGameStore } from '../../../store/useGameStore';
import { EndCycleButton, MoveBar, NewGameButton, UnitPanel, useMoveDraft } from '../../commands';
import { FleetPanel } from '../../fleet';
import { LogbookPanel } from '../../logbook';
import { TacticalMap } from './TacticalMap';
import { palette } from '../../../app/theme';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Largeur de la colonne de droite et hauteur des forces alliées : fixes, non redimensionnables. */
const SIDE_WIDTH = 'clamp(340px, 28vw, 460px)';
const FLEET_HEIGHT = 230;
const MIN_PANEL_HEIGHT = 140;

/** Poignée entre l'unité et le journal : seule zone redimensionnable de l'écran. */
function Splitter({ onDrag }: { onDrag: (delta: number) => void }) {
  const last = useRef(0);
  return (
    <Box
      role="separator"
      aria-label="Redimensionner l’unité et le journal"
      aria-orientation="horizontal"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = e.clientY;
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        onDrag(e.clientY - last.current);
        last.current = e.clientY;
      }}
      sx={{
        height: '100%',
        cursor: 'row-resize',
        touchAction: 'none',
        '&:hover': { bgcolor: palette.panelBorder },
      }}
    />
  );
}

function TopBar({ mission }: { mission: engine.MissionState }) {
  const { setup } = mission;
  const weather = setup.constraints.includes('bad_weather')
    ? labels.constraintLabel.bad_weather.name
    : 'Normale';
  const objective = labels.briefing[setup.mission].objective;
  return (
    <Paper component="header" sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 2 }}>
        TACTICOOP
      </Typography>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontWeight: 700 }}>
          Mission : {labels.missionLabel[setup.mission]}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {objective}
        </Typography>
      </Box>
      <Typography sx={{ fontWeight: 700 }}>Cycle {mission.cycle} / ∞</Typography>
      <Stack>
        <Typography variant="caption" color="text.secondary">
          Météo
        </Typography>
        <Typography variant="body2">{weather}</Typography>
      </Stack>
      <Stack>
        <Typography variant="caption" color="text.secondary">
          Difficulté
        </Typography>
        <Typography variant="body2">{labels.difficultyLabel[setup.difficulty]}</Typography>
      </Stack>
      <EndCycleButton mission={mission} />
      <NewGameButton />
    </Paper>
  );
}

/**
 * Interface tactique : cinq zones de la maquette. La carte et les forces alliées ont une taille
 * fixe ; seuls le panneau d'unité et le journal se partagent la colonne de droite.
 */
export function TacticalScreen({ mission }: { mission: engine.MissionState }) {
  const events = useGameStore((s) => s.events);
  const lastError = useGameStore((s) => s.lastError);
  const clearError = useGameStore((s) => s.clearError);
  const move = useMoveDraft(mission);
  const sideRef = useRef<HTMLDivElement>(null);
  const [unitHeight, setUnitHeight] = useState(420);
  const dragSplitter = useCallback((delta: number) => {
    const total = sideRef.current?.clientHeight ?? 0;
    setUnitHeight((h) =>
      clamp(h + delta, MIN_PANEL_HEIGHT, Math.max(MIN_PANEL_HEIGHT, total - MIN_PANEL_HEIGHT)),
    );
  }, []);

  return (
    <Box
      sx={{
        height: '100vh',
        p: 1,
        gap: 1,
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: `minmax(0, 1fr) ${SIDE_WIDTH}`,
        gridTemplateRows: `auto minmax(0, 1fr) ${FLEET_HEIGHT}px`,
      }}
    >
      <Box sx={{ gridColumn: '1 / -1' }}>
        <TopBar mission={mission} />
      </Box>
      <Paper sx={{ position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        <TacticalMap mission={mission} move={move} />
        <MoveBar move={move} />
      </Paper>
      <Box
        ref={sideRef}
        sx={{
          gridColumn: 2,
          gridRow: '2 / 4',
          minHeight: 0,
          display: 'grid',
          gridTemplateRows: `${unitHeight}px 8px minmax(0, 1fr)`,
        }}
      >
        <UnitPanel mission={mission} />
        <Splitter onDrag={dragSplitter} />
        <LogbookPanel events={events} />
      </Box>
      <FleetPanel units={mission.units} />
      <Snackbar open={lastError !== null} autoHideDuration={4000} onClose={clearError}>
        <Alert severity="warning" onClose={clearError}>
          {lastError?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
