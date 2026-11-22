import * as engine from '../../../../engine';
import { nextHeadings } from '../projectile-heading.service';

function shot(
  id: string,
  position: engine.Hex,
  route: engine.Hex[] = [],
  side: engine.Side = 'friend',
) {
  return { id, weapon: 'missile', side, position, route } as engine.ObservedProjectile;
}

describe('orientation observée des projectiles', () => {
  it('un projectile hostile vu deux fois pointe dans le sens de son déplacement', () => {
    const first = nextHeadings(new Map(), [shot('P-1', { col: 5, row: 4 }, [], 'hostile')]);
    expect(first.get('P-1')?.degrees).toBeNull();
    const second = nextHeadings(first, [shot('P-1', { col: 3, row: 4 }, [], 'hostile')]);
    expect(Math.abs(second.get('P-1')?.degrees ?? 0)).toBeCloseTo(180, 0);
  });

  it('un projectile allié vu pour la première fois suit son tracé', () => {
    const [memory] = nextHeadings(new Map(), [
      shot('P-1', { col: 5, row: 4 }, [{ col: 6, row: 4 }]),
    ]).values();
    expect(memory?.degrees).toBeCloseTo(0, 0);
  });

  it('le déplacement observé l’emporte sur le tracé (torpille qui suit sa cible)', () => {
    const first = nextHeadings(new Map(), [shot('P-1', { col: 5, row: 4 }, [{ col: 6, row: 4 }])]);
    // Elle est repartie vers la gauche alors que son tracé annonce encore la droite.
    const second = nextHeadings(first, [
      shot('P-1', { col: 4, row: 4 }, [
        { col: 5, row: 4 },
        { col: 6, row: 4 },
      ]),
    ]);
    expect(Math.abs(second.get('P-1')?.degrees ?? 0)).toBeCloseTo(180, 0);
  });

  it('un projectile immobile garde son sens, et un projectile disparu est oublié', () => {
    const first = nextHeadings(new Map(), [
      shot('P-1', { col: 5, row: 4 }),
      shot('P-2', { col: 1, row: 1 }),
    ]);
    const moved = nextHeadings(first, [shot('P-1', { col: 6, row: 4 })]);
    const still = nextHeadings(moved, [shot('P-1', { col: 6, row: 4 })]);
    expect(still.get('P-1')?.degrees).toBe(moved.get('P-1')?.degrees);
    expect(still.has('P-2')).toBe(false);
  });
});
