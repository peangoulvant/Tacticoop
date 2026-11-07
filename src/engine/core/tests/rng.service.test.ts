import { defaultConfig } from '../../config/game.config';
import { initialSetup } from '../../missions/setup.service';
import { executeCommand } from '../execute-command.service';
import type { GameState } from '../game.types';
import { createRng, randomInt, shuffle } from '../rng.service';

/** Les `count` premiers tirages d'un générateur. */
function draws(seed: number, count: number): number[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng());
}

describe('générateur pseudo-aléatoire à graine', () => {
  it('donne la même suite pour une même graine', () => {
    expect(draws(42, 20)).toEqual(draws(42, 20));
  });

  it('donne des suites différentes pour des graines différentes', () => {
    expect(draws(1, 20)).not.toEqual(draws(2, 20));
  });

  it("reste dans [0, 1[ et n'a pas d'état partagé entre deux générateurs", () => {
    const a = createRng(7);
    const b = createRng(7);
    const first = a();
    a();
    a();
    expect(b()).toBe(first);
    for (const value of draws(99, 500)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('tire des entiers bornés', () => {
    const rng = createRng(5);
    for (let i = 0; i < 200; i++) {
      const value = randomInt(rng, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(6);
    }
  });

  it('mélange de façon reproductible, sans modifier le tableau reçu', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = shuffle(items, createRng(3));
    expect(shuffled).toEqual(shuffle(items, createRng(3)));
    expect([...shuffled].sort((x, y) => x - y)).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('hasard au lancement : la graine suffit à reproduire la mission', () => {
  /** Lance la mission d'escorte avec une graine et renvoie l'état obtenu. */
  function launched(seed: number): GameState {
    const setup = {
      ...initialSetup(),
      mission: 'escort' as const,
      force: { ...initialSetup().force, fremm: 1 },
    };
    const result = executeCommand(
      { status: 'preparation', setup },
      { type: 'LAUNCH_MISSION', seed },
      defaultConfig,
    );
    if (!result.ok) throw new Error(result.error.message);
    return result.state;
  }

  it('produit exactement le même état pour une même graine', () => {
    expect(launched(11)).toEqual(launched(11));
  });

  it('produit des cartes différentes pour des graines différentes', () => {
    expect(launched(11)).not.toEqual(launched(12));
  });

  it("ne conserve aucune graine dans l'état de la mission : le hasard ne sert qu'au lancement", () => {
    const state = launched(11);
    expect(JSON.stringify(state)).not.toMatch(/seed|rng/i);
  });
});
