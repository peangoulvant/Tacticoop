import * as engine from '../../../engine';

/** Rayon d'un hexagone (pointy-top) dans l'espace du viewBox SVG. */
export const HEX_SIZE = 10;
const W = Math.sqrt(3) * HEX_SIZE;

/** Centre d'un hexagone ; les lignes impaires sont décalées d'une demi-largeur. */
export function hexCenter({ col, row }: engine.Hex): { x: number; y: number } {
  return {
    x: col * W + (row % 2 === 1 ? W / 2 : 0) + W / 2,
    y: row * 1.5 * HEX_SIZE + HEX_SIZE,
  };
}

export function mapViewBox(map: Pick<engine.GameMap, 'width' | 'height'>) {
  return {
    width: map.width * W + W / 2,
    height: (map.height - 1) * 1.5 * HEX_SIZE + 2 * HEX_SIZE,
  };
}

/** Sommets d'un hexagone centré sur l'origine, tels qu'attendus par `<polygon points>`. */
export const HEX_POINTS = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * (60 * i - 30);
  return `${(HEX_SIZE * Math.cos(angle)).toFixed(3)},${(HEX_SIZE * Math.sin(angle)).toFixed(3)}`;
}).join(' ');
