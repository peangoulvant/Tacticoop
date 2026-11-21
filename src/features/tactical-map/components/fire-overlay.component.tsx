import { palette } from '../../../app/theme.config';
import type { FireDraft } from '../../commands';
import { HEX_POINTS, hexCenter, pathPoints } from '../services/hex-geometry.service';

/** Couleur du tracé d'aperçu quand la ligne de tir croise une unité alliée (AB-45). */
const WARNING = '#ffd23f';

/**
 * Surcouche de carte pendant la préparation d'un tir : cases que l'on peut viser (contact identifié
 * du cycle courant, cases de zone à portée), et pour la cible choisie le tracé d'aperçu jusqu'à la
 * case visée, jaune si une unité alliée est sur la ligne de tir. Tout vient du moteur (AB-45, AB-46).
 */
export function FireOverlay({ fire }: { fire: FireDraft | null }) {
  if (!fire) return null;
  const { unit, candidates, preview } = fire;
  const aimable = candidates.flatMap((candidate) => candidate.hexes);
  const color = preview?.ok && preview.warnings.length > 0 ? WARNING : palette.fireRange;
  return (
    <g pointerEvents="none" data-testid="fire-range">
      {aimable.map((hex) => {
        const { x, y } = hexCenter(hex);
        return (
          <polygon
            key={`${hex.col},${hex.row}`}
            points={HEX_POINTS}
            transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
            fill={palette.fireRange}
            fillOpacity={0.22}
            stroke={palette.fireRange}
            strokeOpacity={0.7}
            strokeWidth="0.8"
          />
        );
      })}
      {preview?.ok && (
        <>
          <polyline
            points={pathPoints([unit.position, ...preview.route])}
            fill="none"
            stroke={color}
            strokeWidth="1.4"
            strokeDasharray="5 3"
            strokeLinecap="round"
          />
          <polygon
            points={HEX_POINTS}
            transform={`translate(${hexCenter(preview.aimedHex).x} ${hexCenter(preview.aimedHex).y}) scale(0.78)`}
            fill="none"
            stroke={color}
            strokeWidth="1.4"
          />
        </>
      )}
    </g>
  );
}
