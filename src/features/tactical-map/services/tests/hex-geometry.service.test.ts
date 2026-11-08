import { zoneContour } from '../hex-geometry.service';

/** Nombre de côtés tracés dans un contour (un segment « M … L … » par côté). */
function sides(contour: string): number {
  return contour === '' ? 0 : contour.split('M').length - 1;
}

describe('contour d’une zone', () => {
  it('trace les six côtés d’un hexagone isolé', () => {
    expect(sides(zoneContour([{ col: 4, row: 4 }]))).toBe(6);
  });

  it('retire le côté commun de deux hexagones voisins : 10 côtés', () => {
    expect(
      sides(
        zoneContour([
          { col: 4, row: 4 },
          { col: 5, row: 4 },
        ]),
      ),
    ).toBe(10);
  });

  it('ne trace que le pourtour d’une fleur de sept hexagones : 18 côtés', () => {
    const flower = [
      { col: 4, row: 4 },
      { col: 3, row: 4 },
      { col: 5, row: 4 },
      { col: 3, row: 3 },
      { col: 4, row: 3 },
      { col: 3, row: 5 },
      { col: 4, row: 5 },
    ];
    expect(sides(zoneContour(flower))).toBe(18);
  });

  it('est vide pour une zone vide', () => {
    expect(zoneContour([])).toBe('');
  });
});
