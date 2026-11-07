import { areConstraintsValid, initialSetup } from '../setup.service';

describe('initialSetup', () => {
  it('propose la difficulté Classique par défaut, sans contrainte ni bâtiment', () => {
    expect(initialSetup()).toMatchObject({ difficulty: 'classic', constraints: [] });
    expect(Object.values(initialSetup().force).every((n) => n === 0)).toBe(true);
  });
});

describe('areConstraintsValid', () => {
  it('respecte la borne maximale fournie par la configuration', () => {
    const three = ['limited_means', 'limited_ammo', 'bad_weather'] as const;
    expect(areConstraintsValid(three, 2)).toBe(false);
    expect(areConstraintsValid(three, 3)).toBe(true);
  });

  it('refuse les doublons', () => {
    expect(areConstraintsValid(['bad_weather', 'bad_weather'], 2)).toBe(false);
  });
});
