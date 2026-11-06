import { memo } from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import * as engine from '../../../engine';
import { palette } from '../../../app/theme';
import * as assets from '../../../shared/assets';
import * as labels from '../../../shared/labels';
import { useCarrierOrderDraftStore } from '../../../store/useCarrierOrderDraftStore';
import { useMoveDraftStore } from '../../../store/useMoveDraftStore';
import { useSelectionStore } from '../../../store/useSelectionStore';
import type { CarrierRouteView } from '../../fleet';
import type { MoveDraft } from '../../commands';
import { ShipGlyph, terrainFill } from './glyphs';
import { HEX_POINTS, hexCenter, mapViewBox } from '../services/hexGeometry';
import { CarrierRouteOverlay } from './CarrierRouteOverlay';
import { MoveOverlay } from './MoveOverlay';
import { useMapView } from '../services/useMapView';

/**
 * Terrain statique : mémoïsé car la carte ne change pas pendant la mission (SF-02 §3).
 * L'opacité réduite fait ressortir les cases occupées par une unité.
 */
const TerrainLayer = memo(function TerrainLayer({ map }: { map: engine.GameMap }) {
  const cells = [];
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const { x, y } = hexCenter({ col, row });
      cells.push(
        <g
          key={`${col},${row}`}
          transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
          data-col={col}
          data-row={row}
          style={{ opacity: 0.7 }}
        >
          <polygon
            points={HEX_POINTS}
            fill={terrainFill[engine.terrainAt(map, { col, row })]}
            stroke="#0a1a33"
            strokeWidth="0.6"
          />
        </g>,
      );
    }
  }
  return <>{cells}</>;
});

function UnitToken({ unit, selected }: { unit: engine.Unit; selected: boolean }) {
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

/** Drapeau d'arrivée, centré dans la case du point d'arrivée (B). */
function FinishFlag({ hex }: { hex: engine.Hex }) {
  const { x, y } = hexCenter(hex);
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <title>Arrivée</title>
      <image
        href={assets.finishFlagIcon}
        x="-6"
        y="-5"
        width="12"
        height="10"
        preserveAspectRatio="xMidYMid meet"
      />
    </g>
  );
}

const overlay = { position: 'absolute', bgcolor: 'rgba(6,15,31,0.85)', borderRadius: 1 } as const;

function ZoomControls({
  onZoom,
  onReset,
}: {
  onZoom: (factor: number) => void;
  onReset: () => void;
}) {
  return (
    <Stack sx={{ ...overlay, top: 8, right: 16 }}>
      <IconButton size="small" aria-label="Zoom avant" onClick={() => onZoom(1.25)}>
        <AddIcon />
      </IconButton>
      <IconButton size="small" aria-label="Zoom arrière" onClick={() => onZoom(0.8)}>
        <RemoveIcon />
      </IconButton>
      <IconButton size="small" aria-label="Réinitialiser la vue" onClick={onReset}>
        <FitScreenIcon />
      </IconButton>
    </Stack>
  );
}

/** Légende de la case sélectionnée : coordonnées, terrain et bâtiment éventuel. */
function HexCaption({
  map,
  hex,
  unit,
}: {
  map: engine.GameMap;
  hex: engine.Hex | null;
  unit?: engine.Unit;
}) {
  const text = hex
    ? `(${hex.col}, ${hex.row}) — ${labels.terrainLabel[engine.terrainAt(map, hex)]}`
    : 'Sélectionnez un hexagone';
  const ship = unit ? ` — ${engine.defaultConfig.ships[unit.shipClass].label}` : '';
  return (
    <Typography variant="caption" sx={{ ...overlay, left: 8, bottom: 8, px: 1, py: 0.25 }}>
      {`${text}${ship} · ${map.width}×${map.height}`}
    </Typography>
  );
}

/**
 * Carte tactique : rendu SVG 2D simplifié (docs/maquette). Occupe toute la zone (tronquée si
 * besoin), se déplace par glisser-déposer et se zoome à la molette, comme une carte en ligne.
 */
export function TacticalMap({
  mission,
  move,
  carrierRoute,
}: {
  mission: engine.MissionState;
  move: MoveDraft | null;
  carrierRoute: CarrierRouteView | null;
}) {
  const { map, units, start, goal } = mission;
  const { selectedUnitId, selectedHex, selectUnit, selectHex } = useSelectionStore();
  const content = mapViewBox(map);

  const previewDestination = useMoveDraftStore((s) => s.previewDestination);
  const previewWaypoint = useCarrierOrderDraftStore((s) => s.previewWaypoint);

  // Une unité cliquée est consultée (sa fiche s'affiche). Une case vide choisit la destination du
  // déplacement ou le point de passage en préparation ; sans rien en préparation, elle
  // désélectionne l'unité.
  const onCellClick = (hex: engine.Hex) => {
    selectHex(hex);
    const here = units.find((u) => engine.sameHex(u.position, hex));
    if (here) selectUnit(here.id);
    else if (move) previewDestination(hex);
    else if (carrierRoute?.picking) previewWaypoint(hex);
    else selectUnit(null);
  };
  const { containerRef, viewport, view, zoomBy, resetView, pointerHandlers } = useMapView(
    content.width,
    content.height,
    hexCenter(start).y,
    onCellClick,
  );
  const selected = selectedHex ? hexCenter(selectedHex) : null;

  return (
    <Box sx={{ position: 'relative', height: '100%', minHeight: 0, bgcolor: '#050c19' }}>
      <Box
        ref={containerRef}
        {...pointerHandlers}
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
          {view && (
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              <TerrainLayer map={map} />
              <MoveOverlay move={move} />
              <CarrierRouteOverlay view={carrierRoute} />
              {selected && (
                <g transform={`translate(${selected.x} ${selected.y})`} pointerEvents="none">
                  <polygon points={HEX_POINTS} fill="none" stroke="#5fd3ff" strokeWidth="1.6" />
                </g>
              )}
              {goal && <FinishFlag hex={goal} />}
              {units.map((u) => (
                <UnitToken key={u.id} unit={u} selected={u.id === selectedUnitId} />
              ))}
            </g>
          )}
        </svg>
      </Box>
      <ZoomControls onZoom={zoomBy} onReset={resetView} />
      <HexCaption
        map={map}
        hex={selectedHex}
        unit={units.find((u) => selectedHex && engine.sameHex(u.position, selectedHex))}
      />
    </Box>
  );
}
