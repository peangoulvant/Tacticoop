import { describe, expect, it } from 'vitest';
import { hexDistance, hexNeighbors } from '../../map/hex.service';
import { headingOf, missileTrajectory, stepAlong, torpedoTrajectory } from '../trajectory.service';
import { mapFromDrawing, openSea } from './combat-fixture.model';

describe('trajectoire du missile (AB-47)', () => {
  it('suit la ligne droite, sans la case du tireur, jusqu’à la case visée', () => {
    const route = missileTrajectory({ col: 0, row: 4 }, { col: 3, row: 4 });
    expect(route).toEqual([
      { col: 1, row: 4 },
      { col: 2, row: 4 },
      { col: 3, row: 4 },
    ]);
  });

  it('compte autant de cases que la distance, quelle que soit la direction', () => {
    const from = { col: 5, row: 5 };
    for (const to of [
      { col: 9, row: 7 },
      { col: 2, row: 1 },
      { col: 5, row: 9 },
    ]) {
      expect(missileTrajectory(from, to)).toHaveLength(hexDistance(from, to));
    }
  });

  it('est identique à chaque calcul (reproductible)', () => {
    const a = missileTrajectory({ col: 1, row: 1 }, { col: 8, row: 6 });
    expect(missileTrajectory({ col: 1, row: 1 }, { col: 8, row: 6 })).toEqual(a);
  });
});

describe('trajectoire de la torpille (AB-47)', () => {
  it('prend le plus court chemin en mer ouverte, de longueur égale à la distance', () => {
    const map = openSea(12, 9);
    const route = torpedoTrajectory(map, { col: 1, row: 4 }, { col: 4, row: 4 })!;
    expect(route).toHaveLength(3);
    expect(route.at(-1)).toEqual({ col: 4, row: 4 });
  });

  it('chaque pas est un voisin du précédent', () => {
    const map = openSea(12, 9);
    const from = { col: 2, row: 2 };
    const route = torpedoTrajectory(map, from, { col: 6, row: 5 })!;
    let previous = from;
    for (const hex of route) {
      expect(hexNeighbors(previous, map.width, map.height)).toContainEqual(hex);
      previous = hex;
    }
  });

  it('contourne un obstacle par l’eau', () => {
    const map = mapFromDrawing(['.......', '...#...', '...#...', '...#...', '.......']);
    const route = torpedoTrajectory(map, { col: 1, row: 2 }, { col: 5, row: 2 })!;
    expect(route.length).toBeGreaterThan(4);
    expect(route.every((hex) => map.terrain[hex.row * map.width + hex.col] === 'sea')).toBe(true);
  });

  it('est refusée vers la terre ou vers une poche d’eau fermée', () => {
    const map = mapFromDrawing(['.....', '.###.', '.#.#.', '.###.', '.....']);
    expect(torpedoTrajectory(map, { col: 0, row: 0 }, { col: 2, row: 2 })).toBeNull();
    expect(torpedoTrajectory(map, { col: 0, row: 0 }, { col: 2, row: 1 })).toBeNull();
  });

  it('départage les chemins égaux de façon fixe', () => {
    const map = openSea(12, 9);
    const first = torpedoTrajectory(map, { col: 1, row: 1 }, { col: 7, row: 6 });
    expect(torpedoTrajectory(map, { col: 1, row: 1 }, { col: 7, row: 6 })).toEqual(first);
  });
});

describe('cap d’une torpille', () => {
  it('le cap est le pas entre deux cases voisines, et le pas suivant le prolonge', () => {
    const from = { col: 3, row: 4 };
    const to = { col: 4, row: 4 };
    const heading = headingOf(from, to);
    expect(stepAlong(from, heading)).toEqual(to);
    expect(stepAlong(to, heading)).toEqual({ col: 5, row: 4 });
  });
});
