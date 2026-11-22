import * as engine from '../../../engine';
import { palette } from '../../../app/theme.config';
import * as assets from '../../../shared/assets.config';
import * as labels from '../../../shared/ui.label';
import { hexCenter, pathPoints } from '../services/hex-geometry.service';
import type { HeadingMemory } from '../services/projectile-heading.service';

/*
 * Projectiles sur la carte (AB-49) : les siens, et ceux des hostiles identifiés d'office. Chacun
 * est l'icône de son arme (`weaponIcon`) sur une pastille à la couleur de son camp, tournée dans
 * le sens de sa marche quand son tracé est connu (les siens). Le missile (en vol) est posé en haut
 * de la case, la torpille (immergée, pastille pointillée et translucide) en bas : les deux
 * peuvent partager une case (AB-47) sans se masquer. Plusieurs projectiles de même arme s'alignent.
 */

/** Écart horizontal entre deux projectiles de même arme sur une case, et décalage vertical des armes. */
const SPREAD = 5;
const LANE = { missile: -4.2, torpedo: 4.4 };

/** Position d'un projectile dans sa case : sa file (missile en haut, torpille en bas) et son rang. */
function slotOf(
  projectile: engine.ObservedProjectile,
  all: readonly engine.ObservedProjectile[],
  occupied: boolean,
): { x: number; y: number } {
  const sameLane = all.filter(
    (p) => p.weapon === projectile.weapon && engine.sameHex(p.position, projectile.position),
  );
  // Seul sur une case vide, le projectile est centré ; sur la case d'une unité (un projectile qui
  // vient d'être lancé est sur son tireur) ou avec un autre projectile, il prend sa file.
  const alone =
    !occupied &&
    all.every((p) => p.id === projectile.id || !engine.sameHex(p.position, projectile.position));
  const rank = sameLane.findIndex((p) => p.id === projectile.id);
  return {
    x: (rank - (sameLane.length - 1) / 2) * SPREAD,
    y: alone ? 0 : LANE[projectile.weapon],
  };
}

/** Dimensions de l'icône et de la pastille qui la porte, dans l'espace du viewBox. */
const ICON = { width: 8, height: { missile: 1.8, torpedo: 1.4 } };
const BADGE = { width: 10, height: 4.6 };

function ProjectileToken({
  projectile,
  all,
  occupied,
  degrees,
  selected,
}: {
  projectile: engine.ObservedProjectile;
  all: readonly engine.ObservedProjectile[];
  occupied: boolean;
  /** Sens de marche observé, en degrés ; `null` si inconnu (icône vers la droite). */
  degrees: number | null;
  selected: boolean;
}) {
  const center = hexCenter(projectile.position);
  const slot = slotOf(projectile, all, occupied);
  const color = projectile.side === 'friend' ? palette.projectileAlly : palette.projectileHostile;
  const submerged = projectile.weapon === 'torpedo';
  const height = ICON.height[projectile.weapon];
  return (
    <g
      transform={`translate(${(center.x + slot.x).toFixed(2)} ${(center.y + slot.y).toFixed(2)})`}
      pointerEvents="none"
      data-testid={`projectile-${projectile.id}`}
      data-weapon={projectile.weapon}
      data-side={projectile.side}
    >
      <title>{labels.projectileCaption(projectile)}</title>
      <g transform={`rotate(${(degrees ?? 0).toFixed(1)})`} opacity={submerged ? 0.8 : 1}>
        <rect
          x={-BADGE.width / 2}
          y={-BADGE.height / 2}
          width={BADGE.width}
          height={BADGE.height}
          rx={BADGE.height / 2}
          fill="#0a1a33"
          fillOpacity={0.9}
          stroke={selected ? '#ffffff' : color}
          strokeWidth={selected ? 1 : 0.8}
          strokeDasharray={submerged ? '1.6 1' : undefined}
        />
        <image
          href={assets.weaponIcon[projectile.weapon]}
          x={-ICON.width / 2}
          y={-height / 2}
          width={ICON.width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    </g>
  );
}

/** Tous les projectiles connus du joueur, au-dessus des unités ; le projectile sélectionné est cerclé. */
export function ProjectileOverlay({
  projectiles,
  occupiedHexes,
  headings,
  selectedId,
}: {
  projectiles: readonly engine.ObservedProjectile[];
  /** Cases déjà occupées par une unité ou un navire identifié : le projectile n'y est pas centré. */
  occupiedHexes: readonly engine.Hex[];
  headings: ReadonlyMap<string, HeadingMemory>;
  selectedId: string | null;
}) {
  return (
    <>
      {projectiles.map((projectile) => (
        <ProjectileToken
          key={projectile.id}
          projectile={projectile}
          all={projectiles}
          occupied={occupiedHexes.some((hex) => engine.sameHex(hex, projectile.position))}
          degrees={headings.get(projectile.id)?.degrees ?? null}
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
