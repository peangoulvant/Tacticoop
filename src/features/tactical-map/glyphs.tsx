import type { ShipClass, Terrain } from '../../engine';
import { shipIcon, terrainIcon } from '../../shared/assets';
import { TERRAIN_LIST } from './terrainList';

/** Couleurs de fond par terrain (aplats de la maquette, contours conservés). */
export const terrainFill: Record<Terrain, string> = {
  deep_sea: '#14335f',
  sea: '#1f5a9a',
  coastal_sea: '#5aa0d8',
  beach: '#efe0a4',
  plain: '#8cbf64',
  mountain: '#9c7b5a',
};

/** Symboles réutilisés via `<use>` : une seule définition par terrain pour ~2 500 cases. */
export function TerrainSymbols() {
  return (
    <defs>
      {TERRAIN_LIST.map((t) => (
        <symbol key={t} id={`terrain-${t}`} viewBox="0 0 10 6" overflow="visible">
          <image
            href={terrainIcon[t]}
            width="10"
            height="6"
            preserveAspectRatio="xMidYMid meet"
            opacity="0.9"
          />
        </symbol>
      ))}
    </defs>
  );
}

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
