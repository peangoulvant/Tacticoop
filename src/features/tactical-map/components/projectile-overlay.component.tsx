import * as engine from '../../../engine';
import { palette } from '../../../app/theme.config';
import * as labels from '../../../shared/ui.label';
import { hexCenter, pathPoints } from '../services/hex-geometry.service';

/*
 * Projectiles sur la carte (AB-49) : les siens, et ceux des hostiles identifiés d'office. Un
 * missile (en vol) est un triangle plein posé en haut de la case ; une torpille (immergée) une
 * capsule translucide à contour pointillé posée en bas : un missile et une torpille peuvent
 * partager une case (AB-47) sans se masquer. Plusieurs projectiles de même arme s'alignent.
 */

/** Écart horizontal entre deux projectiles de même arme sur une case, et décalage vertical des armes. */
const SPREAD = 4.2;
const LANE = { missile: -3.4, torpedo: 3.4 };

/** Position d'un projectile dans sa case : sa file (missile en haut, torpille en bas) et son rang. */
function slotOf(
  projectile: engine.ObservedProjectile,
  all: readonly engine.ObservedProjectile[],
): { x: number; y: number } {
  const sameLane = all.filter(
    (p) => p.weapon === projectile.weapon && engine.sameHex(p.position, projectile.position),
  );
  const alone = all.every(
    (p) => p.id === projectile.id || !engine.sameHex(p.position, projectile.position),
  );
  const rank = sameLane.findIndex((p) => p.id === projectile.id);
  return {
    x: (rank - (sameLane.length - 1) / 2) * SPREAD,
    y: alone ? 0 : LANE[projectile.weapon],
  };
}

function ProjectileToken({
  projectile,
  all,
  selected,
}: {
  projectile: engine.ObservedProjectile;
  all: readonly engine.ObservedProjectile[];
  selected: boolean;
}) {
  const center = hexCenter(projectile.position);
  const slot = slotOf(projectile, all);
  const color = projectile.side === 'friend' ? palette.projectileAlly : palette.projectileHostile;
  return (
    <g
      transform={`translate(${(center.x + slot.x).toFixed(2)} ${(center.y + slot.y).toFixed(2)})`}
      pointerEvents="none"
      data-testid={`projectile-${projectile.id}`}
      data-weapon={projectile.weapon}
      data-side={projectile.side}
    >
      <title>{labels.projectileCaption(projectile)}</title>
      {selected && <circle r="3.9" fill="none" stroke="#ffffff" strokeWidth="0.9" />}
      {projectile.weapon === 'missile' ? (
        <polygon points="0,-3 2.3,2.4 -2.3,2.4" fill={color} stroke="#0a1a33" strokeWidth="0.6" />
      ) : (
        <rect
          x="-3"
          y="-1.5"
          width="6"
          height="3"
          rx="1.5"
          fill={color}
          fillOpacity={0.55}
          stroke={color}
          strokeWidth="0.7"
          strokeDasharray="1.4 0.9"
        />
      )}
    </g>
  );
}

/** Tous les projectiles connus du joueur, au-dessus des unités ; le projectile sélectionné est cerclé. */
export function ProjectileOverlay({
  projectiles,
  selectedId,
}: {
  projectiles: readonly engine.ObservedProjectile[];
  selectedId: string | null;
}) {
  return (
    <>
      {projectiles.map((projectile) => (
        <ProjectileToken
          key={projectile.id}
          projectile={projectile}
          all={projectiles}
          selected={projectile.id === selectedId}
        />
      ))}
    </>
  );
}

/**
 * Tracé du projectile allié sélectionné, de sa position à sa case visée, comme l'itinéraire du
 * porte-avions (AB-49 4). Le moteur ne donne que le tracé jusqu'à la dernière position connue : rien
 * qui révèle une cible non identifiée.
 */
export function ProjectileRouteOverlay({
  projectile,
}: {
  projectile: engine.ObservedProjectile | undefined;
}) {
  if (!projectile || projectile.route.length === 0) return null;
  const end = hexCenter(projectile.route[projectile.route.length - 1] as engine.Hex);
  return (
    <g pointerEvents="none" data-testid={`projectile-route-${projectile.id}`}>
      <polyline
        points={pathPoints([projectile.position, ...projectile.route])}
        fill="none"
        stroke={palette.projectileAlly}
        strokeWidth="1.2"
        strokeDasharray="4 3"
        strokeLinecap="round"
      />
      <circle
        cx={end.x}
        cy={end.y}
        r="2.2"
        fill="none"
        stroke={palette.projectileAlly}
        strokeWidth="1"
      />
    </g>
  );
}
