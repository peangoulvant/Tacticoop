import { memo, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import {
  defaultConfig,
  sameHex,
  terrainAt,
  type GameMap,
  type Hex,
  type MissionState,
  type Unit,
} from '../../engine';
import { palette } from '../../app/theme';
import { terrainLabel } from '../../shared/labels';
import { useSelectionStore } from '../../store/useSelectionStore';
import { ShipGlyph, TerrainSymbols, terrainFill } from './glyphs';
import { HEX_POINTS, hexCenter, mapViewBox } from './hexGeometry';

/** Échelle de repli (avant mesure du conteneur, ou sans ResizeObserver). */
const FALLBACK_PIXELS_PER_UNIT = 1.2;

/** Terrain statique : mémoïsé car la carte ne change pas pendant la mission (SF-02 §3). */
const TerrainLayer = memo(function TerrainLayer({ map }: { map: GameMap }) {
  const cells = [];
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const terrain = terrainAt(map, { col, row });
      const { x, y } = hexCenter({ col, row });
      cells.push(
        <g
          key={`${col},${row}`}
          transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
          data-col={col}
          data-row={row}
        >
          <polygon
            points={HEX_POINTS}
            fill={terrainFill[terrain]}
            stroke="#0a1a33"
            strokeWidth="0.6"
          />
          <use href={`#terrain-${terrain}`} x="-4.5" y="-7.2" width="9" height="5.4" />
        </g>,
      );
    }
  }
  return <>{cells}</>;
});

function UnitToken({ unit, selected }: { unit: Unit; selected: boolean }) {
  const { x, y } = hexCenter(unit.position);
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none" data-testid={`unit-${unit.id}`}>
      <polygon
        points={HEX_POINTS}
        transform="scale(0.92)"
        fill={palette.ally}
        stroke={selected ? '#5fd3ff' : '#9cc7ff'}
        strokeWidth={selected ? 1.8 : 0.8}
        style={selected ? { filter: 'drop-shadow(0 0 3px #5fd3ff)' } : undefined}
      />
      <g transform="translate(0 1.5)">
        <ShipGlyph shipClass={unit.shipClass} />
      </g>
    </g>
  );
}

function Waypoint({ hex, label }: { hex: Hex; label: string }) {
  const { x, y } = hexCenter(hex);
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <circle r="4" cy="-8" fill="#fff" stroke={palette.bg} strokeWidth="0.8" />
      <text y="-6.3" textAnchor="middle" fontSize="5.5" fontWeight="700" fill={palette.bg}>
        {label}
      </text>
    </g>
  );
}

/** Carte tactique : rendu SVG 2D simplifié (docs/maquette), zoom et sélection d'hexagone. */
export function TacticalMap({ mission }: { mission: MissionState }) {
  const { map, units, start, goal } = mission;
  const { selectedUnitId, selectedHex, zoom, selectUnit, selectHex, setZoom } = useSelectionStore();
  const box = mapViewBox(map);
  // Zoom 1 = carte entière visible dans le conteneur, quelle que soit la taille des panneaux.
  const viewportRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(FALLBACK_PIXELS_PER_UNIT);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setFitScale(Math.min(el.clientWidth / box.width, el.clientHeight / box.height));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [box.width, box.height]);
  const scale = fitScale * zoom;

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const cell = (event.target as Element).closest('[data-col]');
    if (!cell) return;
    const hex = {
      col: Number(cell.getAttribute('data-col')),
      row: Number(cell.getAttribute('data-row')),
    };
    selectHex(hex);
    selectUnit(units.find((u) => sameHex(u.position, hex))?.id ?? null);
  };

  const hoveredUnit = selectedHex ? units.find((u) => sameHex(u.position, selectedHex)) : undefined;

  return (
    <Box sx={{ position: 'relative', height: '100%', minHeight: 0, bgcolor: '#050c19' }}>
      <Box
        ref={viewportRef}
        sx={{ position: 'absolute', inset: 0, overflow: 'auto' }}
        onWheel={(e) => e.ctrlKey && setZoom(zoom * (e.deltaY < 0 ? 1.1 : 0.9))}
      >
        <svg
          role="img"
          aria-label="Carte tactique"
          width={box.width * scale}
          height={box.height * scale}
          viewBox={`0 0 ${box.width} ${box.height}`}
          onClick={handleClick}
          style={{ display: 'block' }}
        >
          <TerrainSymbols />
          <TerrainLayer map={map} />
          {selectedHex && (
            <g
              transform={`translate(${hexCenter(selectedHex).x} ${hexCenter(selectedHex).y})`}
              pointerEvents="none"
            >
              <polygon points={HEX_POINTS} fill="none" stroke="#5fd3ff" strokeWidth="1.6" />
            </g>
          )}
          <Waypoint hex={start} label="A" />
          {goal && <Waypoint hex={goal} label="B" />}
          {units.map((u) => (
            <UnitToken key={u.id} unit={u} selected={u.id === selectedUnitId} />
          ))}
        </svg>
      </Box>

      <Stack
        sx={{
          position: 'absolute',
          top: 8,
          right: 16,
          bgcolor: 'rgba(6,15,31,0.85)',
          borderRadius: 1,
        }}
      >
        <IconButton size="small" aria-label="Zoom avant" onClick={() => setZoom(zoom * 1.25)}>
          <AddIcon />
        </IconButton>
        <IconButton size="small" aria-label="Zoom arrière" onClick={() => setZoom(zoom / 1.25)}>
          <RemoveIcon />
        </IconButton>
        <IconButton size="small" aria-label="Réinitialiser le zoom" onClick={() => setZoom(1)}>
          <FitScreenIcon />
        </IconButton>
      </Stack>

      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          left: 8,
          bottom: 8,
          px: 1,
          py: 0.25,
          bgcolor: 'rgba(6,15,31,0.85)',
          borderRadius: 1,
        }}
      >
        {selectedHex
          ? `(${selectedHex.col}, ${selectedHex.row}) — ${terrainLabel[terrainAt(map, selectedHex)]}${
              hoveredUnit ? ` — ${defaultConfig.ships[hoveredUnit.shipClass].label}` : ''
            }`
          : 'Sélectionnez un hexagone'}
        {` · ${map.width}×${map.height}`}
      </Typography>
    </Box>
  );
}
