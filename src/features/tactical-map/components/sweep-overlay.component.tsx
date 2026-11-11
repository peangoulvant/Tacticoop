import { palette } from '../../../app/theme.config';
import type { SweepDraft } from '../../commands';
import { HEX_POINTS, hexCenter } from '../services/hex-geometry.service';

/** Surcouche de carte pendant la préparation d'un balayage : cases à portée surlignées (AB-30). */
export function SweepOverlay({ sweep }: { sweep: SweepDraft | null }) {
  if (!sweep) return null;
  return (
    <g pointerEvents="none" data-testid="sweep-range">
      {sweep.area.map((hex) => {
        const { x, y } = hexCenter(hex);
        return (
          <polygon
            key={`${hex.col},${hex.row}`}
            points={HEX_POINTS}
            transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
            fill={palette.sweepRange}
            fillOpacity={0.16}
            stroke={palette.sweepRange}
            strokeOpacity={0.55}
            strokeWidth="0.5"
          />
        );
      })}
    </g>
  );
}
