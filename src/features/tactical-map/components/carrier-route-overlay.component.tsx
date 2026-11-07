import type { CarrierRouteView } from '../../fleet';
import { HEX_POINTS, hexCenter, pathPoints } from '../services/hex-geometry.service';

const ROUTE = '#5fd3ff';
const REFUSED = '#ff5252';

/**
 * Repère du point de passage : l'hexagone cerclé, rouge s'il est refusé. Légèrement réduit pour
 * rester visible à l'intérieur du contour de la case sélectionnée.
 */
function WaypointMarker({ view }: { view: CarrierRouteView }) {
  if (!view.waypoint) return null;
  const { x, y } = hexCenter(view.waypoint);
  const color = view.refused ? REFUSED : ROUTE;
  return (
    <polygon
      points={HEX_POINTS}
      transform={`translate(${x} ${y}) scale(0.78)`}
      fill="none"
      stroke={color}
      strokeWidth="1.4"
    />
  );
}

/**
 * Trajet prévu du porte-avions jusqu'à B (SF-03.15), ou aperçu de l'ordre en préparation :
 * tracé en pointillés, point de passage cerclé. Il ne reçoit aucun clic.
 */
export function CarrierRouteOverlay({ view }: { view: CarrierRouteView | null }) {
  if (!view) return null;
  return (
    <g pointerEvents="none">
      {view.route && (
        <polyline
          points={pathPoints(view.route)}
          fill="none"
          stroke={ROUTE}
          strokeWidth="1.4"
          strokeDasharray="5 3"
          strokeLinecap="round"
        />
      )}
      <WaypointMarker view={view} />
    </g>
  );
}
