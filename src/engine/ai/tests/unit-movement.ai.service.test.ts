import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../config/game.config';
import { createRng } from '../../core/rng.service';
import { observeHostile } from '../../detection/observation.service';
import { hexDistance } from '../../map/hex.service';
import { terrainAt } from '../../map/game-map.service';
import type { Hex } from '../../map/hex.service';
import type { Intent } from '../objective.ai.service';
import { chooseDestination, stepsLeft } from '../unit-movement.ai.service';
import { makeUnit, mapFromDrawing, missionOf, openSea } from './mission-fixture.model';

const HOLD_2 = 2;

function intentAt(anchor: Hex, holdDistance = HOLD_2): Intent {
  return { source: 'objective', anchor, holdDistance };
}

/** Une FREMM hostile (mouvement 3) en `from` dans la carte donnée, et son observation. */
function setup(map: ReturnType<typeof openSea>, from: Hex, others: Hex[] = []) {
  const unit = makeUnit('hostile-a', 'hostile', 'fremm', from);
  const extra = others.map((p, i) => makeUnit(`hostile-x${i}`, 'hostile', 'frigate_da', p));
  const mission = missionOf({ map, units: [unit, ...extra] });
  return { unit, observation: observeHostile(mission) };
}

describe("déplacement de l'IA", () => {
  it("vise les cases qui rapprochent le plus de l'ancre dans sa capacité de mouvement", () => {
    const map = openSea(20, 9);
    const { unit, observation } = setup(map, { col: 14, row: 4 });
    const intent = intentAt({ col: 2, row: 4 });
    expect(stepsLeft(observation, unit, intent, defaultConfig)).toBe(12);
    const destination = chooseDestination(observation, unit, intent, defaultConfig, createRng(1));
    expect(destination && hexDistance(destination, intent.anchor)).toBe(9);
  });

  it("ne s'enfonce pas dans l'ancre : elle s'arrête au bord de sa distance d'arrêt", () => {
    const { unit, observation } = setup(openSea(20, 9), { col: 5, row: 4 });
    const intent = intentAt({ col: 2, row: 4 });
    const destination = chooseDestination(observation, unit, intent, defaultConfig, createRng(1));
    expect(destination && hexDistance(destination, intent.anchor)).toBe(HOLD_2);
  });

  it('tient position à la distance d’arrêt', () => {
    const { unit, observation } = setup(openSea(20, 9), { col: 4, row: 4 });
    const intent = intentAt({ col: 2, row: 4 });
    expect(chooseDestination(observation, unit, intent, defaultConfig, createRng(1))).toBeNull();
  });

  it('contourne le relief au lieu de rester coincée contre lui', () => {
    // Un mur de montagne entre l'unité (à droite) et l'ancre (à gauche), ouvert en bas.
    const map = mapFromDrawing([
      '.....#.....',
      '.....#.....',
      '.....#.....',
      '.....#.....',
      '.....#.....',
      '...........',
      '...........',
    ]);
    const { unit, observation } = setup(map, { col: 7, row: 2 });
    const intent = intentAt({ col: 3, row: 2 }, 1);
    // À vol d'oiseau l'ancre est à 4 hexagones, mais il faut contourner le mur.
    expect(stepsLeft(observation, unit, intent, defaultConfig)).toBeGreaterThan(
      hexDistance(unit.position, intent.anchor),
    );
    const destination = chooseDestination(observation, unit, intent, defaultConfig, createRng(1));
    expect(destination).not.toBeNull();
    expect(terrainAt(map, destination as Hex)).toBe('sea');
    expect((destination as Hex).row).toBeGreaterThan(2);
  });

  it("vise la case la plus proche de son bassin quand l'ancre est dans une mer fermée", () => {
    const map = mapFromDrawing(['.....#...', '.....#...', '.....#...', '.....#...']);
    const { unit, observation } = setup(map, { col: 8, row: 1 });
    const intent = intentAt({ col: 1, row: 1 }, 0);
    const destination = chooseDestination(observation, unit, intent, defaultConfig, createRng(1));
    expect(destination).not.toBeNull();
    expect((destination as Hex).col).toBeGreaterThanOrEqual(6);
    expect((destination as Hex).col).toBeLessThan(8);
  });

  it("n'entre jamais sur une case occupée par une autre de ses unités", () => {
    const { unit, observation } = setup(openSea(20, 3), { col: 8, row: 1 }, [{ col: 5, row: 1 }]);
    const intent = intentAt({ col: 0, row: 1 }, 0);
    const destination = chooseDestination(observation, unit, intent, defaultConfig, createRng(1));
    expect(destination).not.toBeNull();
    expect(destination).not.toEqual({ col: 5, row: 1 });
  });

  it('respecte le plafond de déplacement de la météo (2 hexagones)', () => {
    const unit = { ...makeUnit('hostile-a', 'hostile', 'fremm', { col: 14, row: 4 }), movement: 2 };
    const observation = observeHostile(missionOf({ map: openSea(20, 9), units: [unit] }));
    const intent = intentAt({ col: 2, row: 4 });
    const destination = chooseDestination(observation, unit, intent, defaultConfig, createRng(1));
    expect(destination && hexDistance(destination, unit.position)).toBe(2);
  });

  it('est reproductible : même graine, même case ; la variété vient des égalités', () => {
    // Cible en diagonale : plusieurs cases atteignables sont aussi proches l'une que l'autre.
    const { unit, observation } = setup(openSea(20, 12), { col: 14, row: 1 });
    const intent = intentAt({ col: 2, row: 9 });
    const pick = (seed: number) =>
      chooseDestination(observation, unit, intent, defaultConfig, createRng(seed));
    expect(pick(3)).toEqual(pick(3));
    const distinct = new Set(
      Array.from({ length: 40 }, (_, seed) => JSON.stringify(pick(seed + 1))),
    );
    expect(distinct.size).toBeGreaterThan(1);
  });
});
