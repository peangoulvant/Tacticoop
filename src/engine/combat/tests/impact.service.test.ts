import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../config/game.config';
import { attemptImpact, impactProbability, isCompatible } from '../impact.service';
import { aProjectile, makeUnit } from './combat-fixture.model';

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
    expect(result).toEqual({ result: 'missed', unit: frigate });
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
    });
  });

  it('la torpille tire dans sa plage de 40 à 60 PV', () => {
    const torpedo = aProjectile({ weapon: 'torpedo' });
    expect(attemptImpact(torpedo, frigate, defaultConfig, sequence(0, 0)).unit?.hp).toBe(60);
    expect(attemptImpact(torpedo, frigate, defaultConfig, sequence(0, 0.999)).unit?.hp).toBe(40);
  });
});
