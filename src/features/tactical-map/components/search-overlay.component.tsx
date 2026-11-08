import { palette } from '../../../app/theme.config';
import type { SearchDraft } from '../../commands';
import { HEX_POINTS, hexCenter } from '../services/hex-geometry.service';

/** Surcouche de carte pendant la préparation d'une recherche active : cases à portée surlignées (AB-30). */
export function SearchOverlay({ search }: { search: SearchDraft | null }) {
  if (!search) return null;
  return (
    <g pointerEvents="none" data-testid="search-range">
      {search.area.map((hex) => {
        const { x, y } = hexCenter(hex);
        return (
          <polygon
            key={`${hex.col},${hex.row}`}
            points={HEX_POINTS}
            transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
            fill={palette.searchRange}
            fillOpacity={0.16}
            stroke={palette.searchRange}
            strokeOpacity={0.55}
            strokeWidth="0.5"
          />
        );
      })}
    </g>
  );
}
