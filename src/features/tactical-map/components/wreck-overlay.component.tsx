import * as engine from '../../../engine';
import { palette } from '../../../app/theme.config';
import * as assets from '../../../shared/assets.config';
import * as labels from '../../../shared/ui.label';
import { HEX_POINTS, hexCenter } from '../services/hex-geometry.service';

/** Côté de l'image d'épave : le pictogramme n'occupe que les deux tiers de son cadre, il remplit ainsi la case. */
const ICON_SIZE = 26;

/**
 * Épaves (AB-52) : l'icône d'un navire brisé en pleine case, là où un navire allié ou hostile a
 * été détruit, jusqu'à la fin de la partie. Le fond prend la teinte du camp du navire. Une épave
 * est purement visuelle : elle ne bloque rien et ne reçoit aucun clic. Dessinée sous les unités et
 * les projectiles, au-dessus du terrain.
 */
export function WreckOverlay({ wrecks }: { wrecks: readonly engine.ObservedWreck[] }) {
  return (
    <>
      {wrecks.map((wreck) => {
        const { x, y } = hexCenter(wreck.position);
        return (
          <g
            key={`${wreck.position.col},${wreck.position.row}`}
            transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}
            pointerEvents="none"
            data-testid="wreck"
            data-side={wreck.side}
          >
            <title>{labels.wreckCaption(wreck.side)}</title>
            <polygon
              points={HEX_POINTS}
              transform="scale(0.92)"
              fill={wreck.side === 'friend' ? palette.ally : palette.enemy}
              fillOpacity={0.35}
              stroke="#8ba3c4"
              strokeWidth="0.8"
              strokeDasharray="2 1.4"
            />
            <image
              href={assets.destroyedShipIcon}
              x={-ICON_SIZE / 2}
              y={-ICON_SIZE / 2}
              width={ICON_SIZE}
              height={ICON_SIZE}
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        );
      })}
    </>
  );
}
