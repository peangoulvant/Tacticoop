import { createRng } from '../../core/rng.service';
import { generateEscortMap, generateTerrain } from '../generate.service';
import { shortestPath } from '../game-map.service';
import { TERRAINS } from '../terrain.model';

describe('génération de carte', () => {
  it('est déterministe pour une même graine', () => {
    const a = generateTerrain(20, 20, createRng(42));
    const b = generateTerrain(20, 20, createRng(42));
    expect(a.terrain).toEqual(b.terrain);
  });

  it('produit les six terrains', () => {
    const { terrain } = generateTerrain(35, 35, createRng(1));
    expect(terrain).toHaveLength(1225);
    for (const t of TERRAINS) expect(terrain).toContain(t);
  });

  it('garantit un trajet navigable A→B pour le porte-avions, quelle que soit la graine', () => {
    for (let seed = 0; seed < 30; seed++) {
      const { map, start, goal } = generateEscortMap(35, 35, createRng(seed));
      expect(shortestPath(map, start, goal, 'carrier')).not.toBeNull();
    }
  });
});
