import { memo, useCallback, useEffect, useRef, useState } from 'react';
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
import { clampView, initialView, zoomAt, type Size, type View } from './viewTransform';

/** Déplacement (px) au-delà duquel un appui devient un glisser et non un clic. */
const DRAG_THRESHOLD = 4;

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
          <use href={`#terrain-${terrain}`} x="-3.5" y="-7.6" width="7" height="4.2" />
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

/**
 * Carte tactique : rendu SVG 2D simplifié (docs/maquette). Occupe toute la zone (tronquée si
 * besoin), se déplace par glisser-déposer et se zoome à la molette, comme une carte en ligne.
 */
export function TacticalMap({ mission }: { mission: MissionState }) {
  const { map, units, start, goal } = mission;
  const { selectedUnitId, selectedHex, selectUnit, selectHex } = useSelectionStore();
  const content: Size = mapViewBox(map);

  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  // Vue choisie par le joueur ; tant qu'il n'a rien touché, la vue initiale est recalculée.
  const [custom, setCustom] = useState<View | null>(null);
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);

  // Mesure de la zone ; la vue est recalée à chaque redimensionnement de la fenêtre.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setViewport({ width: el.clientWidth, height: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const startY = hexCenter(start).y;
  const contentWidth = content.width;
  const contentHeight = content.height;
  const ready = viewport.width > 0 && viewport.height > 0;
  const view: View | null = !ready
    ? null
    : custom
      ? clampView(custom, viewport, content)
      : initialView(viewport, content, startY);

  const zoomBy = useCallback(
    (factor: number, anchor?: { x: number; y: number }) => {
      if (!view) return;
      const center = anchor ?? { x: viewport.width / 2, y: viewport.height / 2 };
      setCustom(zoomAt(view, factor, center, viewport, content));
    },
    // `content` est dérivé de `map` : ses dimensions suffisent comme dépendances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view?.k, view?.x, view?.y, viewport, contentWidth, contentHeight],
  );

  // La molette doit empêcher le défilement de la page : écouteur natif non passif.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomBy(Math.exp(-e.deltaY * 0.0015), { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!view || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    setCustom(clampView({ ...d.view, x: d.view.x + dx, y: d.view.y + dy }, viewport, content));
  };

  // Appui sans glisser = clic. Avec la capture du pointeur, on retrouve la case sous le curseur.
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-col]');
    if (!cell) return;
    const hex = {
      col: Number(cell.getAttribute('data-col')),
      row: Number(cell.getAttribute('data-row')),
    };
    selectHex(hex);
    selectUnit(units.find((u) => sameHex(u.position, hex))?.id ?? null);
  };

  const hexUnit = selectedHex ? units.find((u) => sameHex(u.position, selectedHex)) : undefined;
  const selected = selectedHex ? hexCenter(selectedHex) : null;

  return (
    <Box sx={{ position: 'relative', height: '100%', minHeight: 0, bgcolor: '#050c19' }}>
      <Box
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
        sx={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
          touchAction: 'none',
        }}
      >
        <svg
          role="img"
          aria-label="Carte tactique"
          width={viewport.width}
          height={viewport.height}
          style={{ display: 'block' }}
        >
          <TerrainSymbols />
          {view && (
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              <TerrainLayer map={map} />
              {selected && (
                <g transform={`translate(${selected.x} ${selected.y})`} pointerEvents="none">
                  <polygon points={HEX_POINTS} fill="none" stroke="#5fd3ff" strokeWidth="1.6" />
                </g>
              )}
              <Waypoint hex={start} label="A" />
              {goal && <Waypoint hex={goal} label="B" />}
              {units.map((u) => (
                <UnitToken key={u.id} unit={u} selected={u.id === selectedUnitId} />
              ))}
            </g>
          )}
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
        <IconButton size="small" aria-label="Zoom avant" onClick={() => zoomBy(1.25)}>
          <AddIcon />
        </IconButton>
        <IconButton size="small" aria-label="Zoom arrière" onClick={() => zoomBy(0.8)}>
          <RemoveIcon />
        </IconButton>
        <IconButton size="small" aria-label="Réinitialiser la vue" onClick={() => setCustom(null)}>
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
              hexUnit ? ` — ${defaultConfig.ships[hexUnit.shipClass].label}` : ''
            }`
          : 'Sélectionnez un hexagone'}
        {` · ${map.width}×${map.height}`}
      </Typography>
    </Box>
  );
}
