import { useCallback, useRef, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import type { MissionState } from '../../engine';
import { constraintLabel, difficultyLabel, missionLabel } from '../../shared/labels';
import { useGameStore } from '../../store/useGameStore';
import { UnitPanel } from '../commands/UnitPanel';
import { FleetPanel } from '../fleet/FleetPanel';
import { LogbookPanel } from '../logbook/LogbookPanel';
import { TacticalMap } from './TacticalMap';
import { palette } from '../../app/theme';

const GUTTER = 8;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Poignée de redimensionnement : met à jour une taille en pixels pendant le glissement. */
function Splitter({
  orientation,
  onDrag,
  label,
}: {
  orientation: 'vertical' | 'horizontal';
  onDrag: (delta: number) => void;
  label: string;
}) {
  const last = useRef(0);
  const vertical = orientation === 'vertical';
  const coordinate = (e: React.PointerEvent) => (vertical ? e.clientX : e.clientY);
  return (
    <Box
      role="separator"
      aria-label={label}
      aria-orientation={orientation}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = coordinate(e);
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        onDrag(coordinate(e) - last.current);
        last.current = coordinate(e);
      }}
      sx={{
        width: '100%',
        height: '100%',
        cursor: vertical ? 'col-resize' : 'row-resize',
        touchAction: 'none',
        '&:hover': { bgcolor: palette.panelBorder },
      }}
    />
  );
}

function TopBar({ mission }: { mission: MissionState }) {
  const reset = useGameStore((s) => s.reset);
  const { setup } = mission;
  const weather = setup.constraints.includes('bad_weather')
    ? constraintLabel.bad_weather.name
    : 'Normale';
  const objective =
    setup.mission === 'escort'
      ? 'Protéger le porte-avions jusqu’au point B'
      : 'Éliminer la flotte ennemie';
  return (
    <Paper component="header" sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 2 }}>
        TACTICOOP
      </Typography>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontWeight: 700 }}>Mission : {missionLabel[setup.mission]}</Typography>
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
        <Typography variant="body2">{difficultyLabel[setup.difficulty]}</Typography>
      </Stack>
      <Button size="small" variant="outlined" onClick={reset}>
        Nouvelle partie
      </Button>
    </Paper>
  );
}

/** Interface tactique : cinq zones de la maquette, panneaux redimensionnables. */
export function TacticalScreen({ mission }: { mission: MissionState }) {
  const events = useGameStore((s) => s.events);
  const [rightWidth, setRightWidth] = useState(380);
  const [bottomHeight, setBottomHeight] = useState(230);
  const dragRight = useCallback((d: number) => setRightWidth((w) => clamp(w - d, 260, 640)), []);
  const dragBottom = useCallback((d: number) => setBottomHeight((h) => clamp(h - d, 140, 480)), []);

  return (
    <Box
      sx={{
        height: '100vh',
        p: 1,
        boxSizing: 'border-box',
        display: 'grid',
        gap: 0,
        gridTemplateColumns: `minmax(0, 1fr) ${GUTTER}px ${rightWidth}px`,
        gridTemplateRows: `auto minmax(0, 1fr) ${GUTTER}px ${bottomHeight}px`,
      }}
    >
      <Box sx={{ gridColumn: '1 / -1', mb: 1 }}>
        <TopBar mission={mission} />
      </Box>
      <Paper sx={{ overflow: 'hidden' }}>
        <TacticalMap mission={mission} />
      </Paper>
      <Splitter
        orientation="vertical"
        label="Redimensionner le panneau latéral"
        onDrag={dragRight}
      />
      <UnitPanel units={mission.units} />
      <Box sx={{ gridColumn: '1 / -1', height: '100%' }}>
        <Splitter
          orientation="horizontal"
          label="Redimensionner le panneau inférieur"
          onDrag={dragBottom}
        />
      </Box>
      <FleetPanel units={mission.units} />
      <Box />
      <LogbookPanel events={events} />
    </Box>
  );
}
