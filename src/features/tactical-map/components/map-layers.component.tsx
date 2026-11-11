import { memo } from 'react';
import * as engine from '../../../engine';
import { palette } from '../../../app/theme.config';
import * as assets from '../../../shared/assets.config';
import { ShipGlyph, terrainFill } from './glyphs.component';
import { HEX_POINTS, hexCenter } from '../services/hex-geometry.service';

/*
 * Couches SVG de la carte : le terrain, les unités alliées et le drapeau d'arrivée. Elles ne
 * calculent rien : elles dessinent ce que `TacticalMap` leur donne (la projection `observeFriend`).
 */

/**
 * Terrain statique : mémoïsé car la carte ne change pas pendant la mission (SF-02 §3).
 * L'opacité réduite fait ressortir les cases occupées par une unité.
 */
export const TerrainLayer = memo(function TerrainLayer({ map }: { map: engine.GameMap }) {
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

export function UnitToken({ unit, selected }: { unit: engine.Unit; selected: boolean }) {
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
export function FinishFlag({ hex }: { hex: engine.Hex }) {
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
