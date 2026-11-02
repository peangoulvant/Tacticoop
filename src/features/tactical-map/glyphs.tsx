import type { ShipClass, Terrain } from '../../engine';
import { shipIcon } from '../../shared/assets';

/** Couleurs de fond par terrain (aplats de la maquette, contours conservés). */
export const terrainFill: Record<Terrain, string> = {
  deep_sea: '#14335f',
  sea: '#1f5a9a',
  coastal_sea: '#5aa0d8',
  beach: '#efe0a4',
  plain: '#8cbf64',
  mountain: '#9c7b5a',
};

/** Silhouette d'un bâtiment centrée sur (0,0), dans un cadre de 13 × 7. */
export function ShipGlyph({ shipClass }: { shipClass: ShipClass }) {
  return (
    <image
      href={shipIcon[shipClass]}
      x="-6.5"
      y="-3.5"
      width="13"
      height="7"
      preserveAspectRatio="xMidYMid meet"
    />
  );
}
