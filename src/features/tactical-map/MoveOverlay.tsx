import type { Hex } from '../../engine';
import type { MovePreparation } from '../commands/useMovePlan';
import { HEX_POINTS, hexCenter } from './hexGeometry';

const ACCESSIBLE = '#7cfc9a';
const REFUSED = '#ff5252';

/** Liste de points « x,y » d'un tracé passant par le centre de chaque hexagone. */
function pointsOf(path: readonly Hex[]): string {
  return path
    .map((hex) => {
      const { x, y } = hexCenter(hex);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

/** Tracé en pointillés : vert si l'itinéraire est valide, rouge s'il est bloqué ou interdit. */
function PathLine({ move }: { move: MovePreparation }) {
  const { unit, destination, plan } = move;
  if (!plan || !destination) return null;
  const color = plan.ok ? ACCESSIBLE : REFUSED;
  const path = plan.ok ? plan.path : [unit.position, destination];
  const end = hexCenter(destination);
  return (
    <g pointerEvents="none">
      <polyline
        points={pointsOf(path)}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeDasharray="3 2"
        strokeLinecap="round"
      />
      <circle cx={end.x} cy={end.y} r="2.2" fill={color} />
    </g>
  );
}

/** Surcouche de carte pendant la préparation d'un déplacement : destinations accessibles et trajet. */
export function MoveOverlay({ move }: { move: MovePreparation | null }) {
  if (!move) return null;
  return (
    <g pointerEvents="none">
      {move.reachable.map((hex) => {
        const { x, y } = hexCenter(hex);
        return (
          <polygon
            key={`${hex.col},${hex.row}`}
            points={HEX_POINTS}
            transform={`translate(${x} ${y})`}
            fill="rgba(124,252,154,0.22)"
            stroke={ACCESSIBLE}
            strokeWidth="0.5"
          />
        );
      })}
      <PathLine move={move} />
    </g>
  );
}
