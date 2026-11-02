import type { ShipClass, Terrain } from '../../engine';

/** Couleurs de fond par terrain (aplats de la maquette, contours conservés). */
export const terrainFill: Record<Terrain, string> = {
  deep_sea: '#14335f',
  sea: '#1f5a9a',
  coastal_sea: '#5aa0d8',
  beach: '#efe0a4',
  plain: '#8cbf64',
  mountain: '#9c7b5a',
};

/** Icônes de terrain (infographie) : dessinées dans un cadre de 20 × 12. */
const terrainIconPath: Record<Terrain, string> = {
  deep_sea: 'M2 4q2-3 4 0t4 0t4 0t4 0M2 9q2-3 4 0t4 0t4 0t4 0',
  sea: 'M2 6q2-3 4 0t4 0t4 0t4 0',
  coastal_sea: 'M1 8q2-3 4 0t4 0M11 9l3-5 2 2 2-2 2 5z',
  beach: 'M10 12q1-6 2-7M12 5q-3-3-7-1M12 5q3-3 7-1M12 5q0-4-1-5',
  plain: 'M4 12l1-6M8 12l0-9M12 12l1-7M16 12l-1-5',
  mountain: 'M1 11l6-9 3 4 2-3 7 8z',
};

/** Symboles réutilisés via `<use>` : évite de dupliquer ~2 500 chemins dans le DOM. */
export function TerrainSymbols() {
  return (
    <defs>
      {(Object.keys(terrainIconPath) as Terrain[]).map((t) => (
        <symbol key={t} id={`terrain-${t}`} viewBox="0 0 20 12" overflow="visible">
          <path
            d={terrainIconPath[t]}
            fill="none"
            stroke="#fff"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
        </symbol>
      ))}
    </defs>
  );
}

/** Silhouette blanche centrée sur (0,0), dans un cadre d'environ 14 × 8. */
export function ShipGlyph({ shipClass }: { shipClass: ShipClass }) {
  const common = { fill: '#fff', stroke: 'none' };
  switch (shipClass) {
    case 'submarine':
      return (
        <g {...common}>
          <ellipse cx="0" cy="1" rx="6.5" ry="1.9" />
          <path d="M-1.5 -0.8h3l-0.6-2.4h-1.8z" />
        </g>
      );
    case 'carrier':
      return (
        <g {...common}>
          <path d="M-7 0.2h14l-1.6 3.6h-10.8z" />
          <path d="M-6 -0.8h12v1h-12z" />
          <path d="M1.5 -0.8v-2.4h2v2.4z" />
        </g>
      );
    default:
      return (
        <g {...common}>
          <path d="M-6.5 0.5h13l-2 3h-9z" />
          <path d="M-2.5 0.5v-2.2h5v2.2zM0 -1.7v-2.6h0.7v2.6z" />
        </g>
      );
  }
}
