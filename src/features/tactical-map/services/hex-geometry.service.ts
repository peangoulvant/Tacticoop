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

/** Liste de points « x,y » d'un tracé passant par le centre de chaque hexagone. */
export function pathPoints(path: readonly engine.Hex[]): string {
  return path
    .map((hex) => {
      const { x, y } = hexCenter(hex);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

/**
 * Contour d'une zone : tracé SVG des seuls côtés d'hexagones qui ne touchent pas un autre
 * hexagone de la zone. Les voisins se reconnaissent à leur centre, sans refaire la géométrie du
 * décalage des lignes impaires.
 */
export function zoneContour(zone: readonly engine.Hex[]): string {
  const key = (x: number, y: number) => `${Math.round(x * 100)},${Math.round(y * 100)}`;
  const inZone = new Set(zone.map((hex) => key(hexCenter(hex).x, hexCenter(hex).y)));
  const apothem = Math.sqrt(3) * HEX_SIZE;
  const segments: string[] = [];
  for (const hex of zone) {
    const { x, y } = hexCenter(hex);
    for (let side = 0; side < 6; side++) {
      const middle = (Math.PI / 180) * (60 * side);
      if (inZone.has(key(x + apothem * Math.cos(middle), y + apothem * Math.sin(middle)))) continue;
      const from = (Math.PI / 180) * (60 * side - 30);
      const to = (Math.PI / 180) * (60 * side + 30);
      const a = `${(x + HEX_SIZE * Math.cos(from)).toFixed(2)} ${(y + HEX_SIZE * Math.sin(from)).toFixed(2)}`;
      const b = `${(x + HEX_SIZE * Math.cos(to)).toFixed(2)} ${(y + HEX_SIZE * Math.sin(to)).toFixed(2)}`;
      segments.push(`M ${a} L ${b}`);
    }
  }
  return segments.join(' ');
}
