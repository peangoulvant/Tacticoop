import { clampView, coverScale, initialView, resolveView, zoomAt } from '../view-transform.service';

const viewport = { width: 1000, height: 600 };
const content = { width: 800, height: 700 };

describe('viewTransform', () => {
  it('couvre toute la zone : largeur complète, hauteur tronquée si besoin', () => {
    expect(coverScale(viewport, content)).toBeCloseTo(1.25);
    const view = initialView(viewport, content, 350);
    expect(view.x).toBe(0);
    expect(view.y).toBeLessThanOrEqual(0);
    expect(view.y).toBeGreaterThanOrEqual(viewport.height - content.height * view.k);
  });

  it('ne laisse jamais apparaître de zone vide en déplaçant la carte', () => {
    const view = clampView({ k: 2, x: 500, y: -9999 }, viewport, content);
    expect(view.x).toBe(0);
    expect(view.y).toBe(viewport.height - content.height * 2);
  });

  it('borne le zoom entre la couverture et 8 fois celle-ci', () => {
    const min = coverScale(viewport, content);
    expect(clampView({ k: 0.01, x: 0, y: 0 }, viewport, content).k).toBe(min);
    expect(clampView({ k: 999, x: 0, y: 0 }, viewport, content).k).toBe(min * 8);
  });

  it('garde fixe le point sous le curseur pendant le zoom', () => {
    const start = { k: 2, x: -300, y: -200 };
    const anchor = { x: 400, y: 300 };
    const next = zoomAt(start, 1.5, anchor, viewport, content);
    const before = (anchor.x - start.x) / start.k;
    expect((anchor.x - next.x) / next.k).toBeCloseTo(before);
  });

  it("ne calcule aucune vue tant que la zone n'a pas de taille", () => {
    expect(resolveView(null, { width: 0, height: 0 }, content, 0)).toBeNull();
    expect(resolveView(null, viewport, content, 350)).toEqual(initialView(viewport, content, 350));
  });
});
