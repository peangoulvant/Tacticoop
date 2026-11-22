import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../config/game.config';
import { executeCommand } from '../../core/execute-command.service';
import { observeFriend, observeHostile } from '../../detection/observation.service';
import type { Loss } from '../projectile.types';
import { observedWrecks } from '../wreck-observation.service';
import { makeUnit, missionOf, openSea } from './combat-fixture.model';

function loss(patch: Partial<Loss>): Loss {
  return {
    unitId: 'hostile-frigate_da-1',
    side: 'hostile',
    shipClass: 'frigate_da',
    cycle: 1,
    position: { col: 4, row: 4 },
    destroyedBy: 'friend',
    ...patch,
  };
}

function mission(losses: Loss[]) {
  return {
    ...missionOf({
      map: openSea(12, 9),
      units: [
        makeUnit('f', 'friend', 'fremm', { col: 1, row: 1 }),
        // Un navire hostile encore en jeu : sans lui, la lutte navale est gagnée dès la clôture.
        makeUnit('h', 'hostile', 'frigate_da', { col: 11, row: 8 }),
      ],
    }),
    losses,
  };
}

describe('épaves connues du joueur (AB-52)', () => {
  it('connaît ses navires détruits, quel qu’en soit l’auteur', () => {
    const wrecks = observedWrecks(
      mission([
        loss({ unitId: 'a', side: 'friend', destroyedBy: 'hostile', position: { col: 2, row: 2 } }),
        loss({ unitId: 'b', side: 'friend', destroyedBy: 'friend', position: { col: 3, row: 3 } }),
      ]),
      'friend',
    );
    expect(wrecks.map((w) => w.side)).toEqual(['friend', 'friend']);
  });

  it('connaît un navire hostile qu’il a détruit, mais pas celui que l’IA a détruit elle-même', () => {
    const wrecks = observedWrecks(
      mission([
        loss({ unitId: 'kill', position: { col: 9, row: 6 }, destroyedBy: 'friend' }),
        loss({ unitId: 'ia', position: { col: 2, row: 7 }, destroyedBy: 'hostile' }),
      ]),
      'friend',
    );
    expect(wrecks).toEqual([{ position: { col: 9, row: 6 }, side: 'hostile' }]);
  });

  it('ne garde qu’une épave par case, la première', () => {
    const wrecks = observedWrecks(
      mission([
        loss({ unitId: 'a', side: 'friend', destroyedBy: 'hostile' }),
        loss({ unitId: 'b' }),
      ]),
      'friend',
    );
    expect(wrecks).toEqual([{ position: { col: 4, row: 4 }, side: 'friend' }]);
  });

  it('ne dit ni l’identifiant ni la classe du navire détruit', () => {
    const seen = observeFriend(mission([loss({ unitId: 'hostile-secret-7' })])).wrecks;
    expect(JSON.stringify(seen)).not.toMatch(/hostile-secret|frigate_da|unitId|shipClass/);
  });

  it('la projection de l’IA ne porte pas d’épave (hors périmètre de la V1)', () => {
    expect(observeHostile(mission([loss({})]))).not.toHaveProperty('wrecks');
  });
});

describe('l’épave reste jusqu’à la fin de la partie (AB-52)', () => {
  it('survit à la clôture de plusieurs cycles', () => {
    let state: Parameters<typeof executeCommand>[0] = mission([loss({})]);
    for (let cycle = 0; cycle < 3; cycle++) {
      const result = executeCommand(state, { type: 'END_CYCLE_EARLY' }, defaultConfig);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      state = result.state;
    }
    if (state.status !== 'in_progress') throw new Error('mission terminée');
    expect(state.cycle).toBeGreaterThan(1);
    expect(observeFriend(state).wrecks).toEqual([
      { position: { col: 4, row: 4 }, side: 'hostile' },
    ]);
  });
});
