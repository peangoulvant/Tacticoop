import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../config/game.config';
import { attemptImpact, impactProbability, isCompatible } from '../impact.service';
import { COMPONENT_KINDS } from '../../config/game.config';
import { aProjectile, makeUnit, withWeapons } from './combat-fixture.model';

/** Générateur qui rend les valeurs données, l'une après l'autre. */
function sequence(...values: number[]) {
  let i = 0;
  return () => values[i++] ?? 0;
}

const frigate = makeUnit('f', 'friend', 'frigate_da', { col: 1, row: 1 });
const submarine = makeUnit('s', 'friend', 'submarine', { col: 1, row: 1 });
const carrier = makeUnit('c', 'friend', 'carrier', { col: 1, row: 1 });

describe('compatibilité arme / cible (AB-46)', () => {
  it('un missile touche les navires de surface, pas les sous-marins', () => {
    expect(isCompatible('missile', frigate, defaultConfig)).toBe(true);
    expect(isCompatible('missile', carrier, defaultConfig)).toBe(true);
    expect(isCompatible('missile', submarine, defaultConfig)).toBe(false);
  });

  it('une torpille touche tous les navires', () => {
    for (const unit of [frigate, submarine, carrier]) {
      expect(isCompatible('torpedo', unit, defaultConfig)).toBe(true);
    }
  });
});

describe('probabilité d’impact (AB-47)', () => {
  it('reprend celle de l’arme : 75 % et 70 %', () => {
    expect(impactProbability(aProjectile(), defaultConfig)).toBe(0.75);
    expect(impactProbability(aProjectile({ weapon: 'torpedo' }), defaultConfig)).toBe(0.7);
  });

  it('retire 25 points pour un tir sur zone suspecte : 50 % et 45 %', () => {
    expect(impactProbability(aProjectile({ onSuspectZone: true }), defaultConfig)).toBeCloseTo(0.5);
    expect(
      impactProbability(aProjectile({ weapon: 'torpedo', onSuspectZone: true }), defaultConfig),
    ).toBeCloseTo(0.45);
  });
});

describe('tentative d’impact', () => {
  it('rate quand le tirage atteint la probabilité', () => {
    const result = attemptImpact(aProjectile(), frigate, defaultConfig, sequence(0.75));
    expect(result).toEqual({ result: 'missed', unit: frigate, disabled: null });
  });

  it('réussit sous la probabilité et retire les PV tirés dans la plage', () => {
    const low = attemptImpact(aProjectile(), frigate, defaultConfig, sequence(0.1, 0));
    expect(low.unit?.hp).toBe(100 - 30);
    const high = attemptImpact(aProjectile(), frigate, defaultConfig, sequence(0.1, 0.999));
    expect(high.unit?.hp).toBe(100 - 50);
  });

  it('détruit l’unité quand ses PV tombent à zéro ou moins', () => {
    const weak = { ...frigate, hp: 30 };
    expect(attemptImpact(aProjectile(), weak, defaultConfig, sequence(0.1, 0))).toEqual({
      result: 'destroyed',
      unit: null,
      disabled: null,
    });
  });

  it('la torpille tire dans sa plage de 40 à 60 PV', () => {
    const torpedo = aProjectile({ weapon: 'torpedo' });
    expect(attemptImpact(torpedo, frigate, defaultConfig, sequence(0, 0)).unit?.hp).toBe(60);
    expect(attemptImpact(torpedo, frigate, defaultConfig, sequence(0, 0.999)).unit?.hp).toBe(40);
  });
});

describe('panne de composant à l’impact (G-09 §3.2, AB-54)', () => {
  /** Configuration où l'impact réussit toujours, avec la probabilité de panne donnée. */
  const failing = (probability: number) =>
    withWeapons({
      missile: { impactProbability: 1, componentFailureProbability: probability },
      torpedo: { impactProbability: 1, componentFailureProbability: probability },
    });

  it('est configurable par arme : 50 % pour le missile comme pour la torpille', () => {
    expect(defaultConfig.combat.weapons.missile.componentFailureProbability).toBe(0.5);
    expect(defaultConfig.combat.weapons.torpedo.componentFailureProbability).toBe(0.5);
    const config = withWeapons({
      missile: { impactProbability: 1, componentFailureProbability: 0 },
      torpedo: { impactProbability: 1, componentFailureProbability: 1 },
    });
    const missile = attemptImpact(aProjectile(), frigate, config, sequence(0, 0, 0, 0));
    const torpedo = attemptImpact(
      aProjectile({ weapon: 'torpedo' }),
      frigate,
      config,
      sequence(0, 0, 0, 0),
    );
    expect(missile.disabled).toBeNull();
    expect(torpedo.disabled).not.toBeNull();
  });

  it('met hors service un composant quand le tirage passe sous la probabilité', () => {
    const result = attemptImpact(aProjectile(), frigate, failing(0.5), sequence(0, 0, 0.49, 0));
    expect(result.disabled).toBe('propulsion');
    expect(result.unit?.disabledComponents).toEqual(['propulsion']);
  });

  it('ne met rien hors service quand le tirage atteint la probabilité', () => {
    const result = attemptImpact(aProjectile(), frigate, failing(0.5), sequence(0, 0, 0.5, 0));
    expect(result.disabled).toBeNull();
    expect(result.unit?.disabledComponents).toEqual([]);
  });

  it('choisit le composant selon le second tirage, parmi les quatre', () => {
    const picks = [0, 0.3, 0.6, 0.99].map(
      (draw) => attemptImpact(aProjectile(), frigate, failing(1), sequence(0, 0, 0, draw)).disabled,
    );
    expect(picks).toEqual([...COMPONENT_KINDS]);
  });

  it('exclut les composants déjà hors service de la sélection', () => {
    const damaged = { ...frigate, disabledComponents: ['propulsion' as const, 'hull' as const] };
    const first = attemptImpact(aProjectile(), damaged, failing(1), sequence(0, 0, 0, 0));
    const last = attemptImpact(aProjectile(), damaged, failing(1), sequence(0, 0, 0, 0.99));
    expect(first.disabled).toBe('sensors');
    expect(last.disabled).toBe('armament');
    expect(last.unit?.disabledComponents).toEqual(['propulsion', 'hull', 'armament']);
  });

  it('ne change que les PV quand tous les composants sont déjà hors service', () => {
    const wreck = { ...frigate, disabledComponents: [...COMPONENT_KINDS] };
    const result = attemptImpact(aProjectile(), wreck, failing(1), sequence(0, 0, 0, 0));
    expect(result.result).toBe('hit');
    expect(result.disabled).toBeNull();
    expect(result.unit?.disabledComponents).toEqual(COMPONENT_KINDS);
  });

  it('ne traite aucun composant quand l’unité est détruite (G-09 §3.2.6)', () => {
    const weak = { ...frigate, hp: 30 };
    const result = attemptImpact(aProjectile(), weak, failing(1), sequence(0, 0, 0, 0));
    expect(result).toEqual({ result: 'destroyed', unit: null, disabled: null });
  });

  it('ne panne jamais sur un tir manqué', () => {
    const missed = withWeapons({
      missile: { impactProbability: 0, componentFailureProbability: 1 },
    });
    expect(attemptImpact(aProjectile(), frigate, missed, sequence(0.5, 0, 0)).disabled).toBeNull();
  });

  it('ne consomme pas le tirage de panne selon la configuration : même suite du hasard', () => {
    // Avec ou sans panne, le tirage de panne est effectué ; seul le choix du composant s'y ajoute.
    const draws = (probability: number) => {
      const used: number[] = [];
      const rng = () => {
        used.push(used.length);
        return 0.9;
      };
      attemptImpact(aProjectile(), frigate, failing(probability), rng);
      return used.length;
    };
    expect(draws(0)).toBe(3);
    expect(draws(1)).toBe(4);
  });
});
