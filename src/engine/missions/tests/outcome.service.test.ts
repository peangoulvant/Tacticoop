import { describe, expect, it } from 'vitest';
import { makeUnit, missionOf, openSea } from '../../combat/tests/combat-fixture.model';
import type { MissionState } from '../../core/game.types';
import type { Unit } from '../../units/unit.model';
import { defeatCause, determineOutcome, victoryCause } from '../outcome.service';

function friend(id: string, cls: 'fremm' | 'carrier' = 'fremm', col = 2): Unit {
  return makeUnit(id, 'friend', cls, { col, row: 4 });
}
function hostile(id: string): Unit {
  return makeUnit(id, 'hostile', 'frigate_da', { col: 9, row: 4 });
}

function naval(units: Unit[]): MissionState {
  return missionOf({ map: openSea(12, 9), units, kind: 'naval_combat' });
}

function escort(units: Unit[], carrierAt = { col: 3, row: 4 }): MissionState {
  const base = missionOf({
    map: openSea(12, 9),
    units,
    kind: 'escort',
    goal: { col: 10, row: 4 },
  });
  return {
    ...base,
    units: base.units.map((u) => (u.shipClass === 'carrier' ? { ...u, position: carrierAt } : u)),
  };
}

describe('lutte navale : victoire et défaite (G-02.2, AB-03.1)', () => {
  it('continue tant qu’il reste des unités des deux camps', () => {
    expect(determineOutcome(naval([friend('a'), hostile('h')]))).toBeNull();
  });

  it('gagne quand toute la flotte ennemie est détruite', () => {
    expect(determineOutcome(naval([friend('a')]))).toEqual({
      outcome: 'victory',
      cause: 'hostile_fleet_destroyed',
    });
  });

  it('perd quand toutes les unités alliées sont détruites', () => {
    expect(determineOutcome(naval([hostile('h')]))).toEqual({
      outcome: 'defeat',
      cause: 'all_units_destroyed',
    });
  });

  it('la défaite prévaut quand les deux camps sont anéantis ensemble (G-13.1 Q3)', () => {
    expect(determineOutcome(naval([]))).toEqual({
      outcome: 'defeat',
      cause: 'all_units_destroyed',
    });
  });
});

describe('escorte : défaite (AB-03.2) et victoire (G-02.4)', () => {
  it('continue avec le porte-avions, une escorte et un ennemi', () => {
    const units = [friend('carrier', 'carrier'), friend('a'), hostile('h')];
    expect(determineOutcome(escort(units))).toBeNull();
  });

  it('perd quand le porte-avions est détruit, même avec une escorte intacte', () => {
    expect(defeatCause(escort([friend('a'), hostile('h')]))).toBe('carrier_destroyed');
  });

  it('perd quand tous les navires d’escorte sont détruits, le porte-avions étant intact', () => {
    expect(defeatCause(escort([friend('carrier', 'carrier'), hostile('h')]))).toBe(
      'all_escorts_destroyed',
    );
  });

  it('éliminer tous les ennemis ne gagne pas : il faut arriver en B (G-02)', () => {
    const units = [friend('carrier', 'carrier'), friend('a')];
    expect(victoryCause(escort(units))).toBeNull();
    expect(determineOutcome(escort(units))).toBeNull();
  });

  it('gagne à l’arrivée du porte-avions en B', () => {
    const units = [friend('carrier', 'carrier'), friend('a'), hostile('h')];
    expect(determineOutcome(escort(units, { col: 10, row: 4 }))).toEqual({
      outcome: 'victory',
      cause: 'carrier_arrived',
    });
  });

  it('la défaite prévaut sur l’arrivée en B (AB-01)', () => {
    const units = [friend('carrier', 'carrier'), hostile('h')];
    expect(determineOutcome(escort(units, { col: 10, row: 4 }))).toEqual({
      outcome: 'defeat',
      cause: 'all_escorts_destroyed',
    });
  });
});
