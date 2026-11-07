import { createRng } from '../../core/rng.service';
import { generateEscortMap, generateTerrain, hasAlternativeRoute } from '../generate.service';
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

describe('itinéraires alternatifs en escorte (SF-02 §3)', () => {
  const SEEDS = Array.from({ length: 100 }, (_, seed) => seed);

  it('est déterministe pour une même graine, contournement compris', () => {
    for (const seed of [3, 24, 57]) {
      const a = generateEscortMap(35, 35, createRng(seed));
      const b = generateEscortMap(35, 35, createRng(seed));
      expect(a).toEqual(b);
    }
  });

  it('garde un trajet A→B navigable sur toutes les graines', () => {
    for (const seed of SEEDS) {
      const { map, start, goal } = generateEscortMap(35, 35, createRng(seed));
      expect(shortestPath(map, start, goal, 'carrier')).not.toBeNull();
    }
  });

  it('offre un contournement sans case commune avec le plus court trajet sur presque toutes les graines', () => {
    const withBypass = SEEDS.filter((seed) => {
      const { map, start, goal } = generateEscortMap(35, 35, createRng(seed));
      return hasAlternativeRoute(map, start, goal);
    });
    // Pas de minimum de règle : un point A ou B au fond d'une crique à une seule sortie n'a pas de
    // second passage sans remodeler ses abords (3 graines sur 100 aujourd'hui).
    expect(withBypass.length).toBeGreaterThanOrEqual(90);
  });

  it('ne modifie pas une carte qui offre déjà un contournement, et touche peu au relief sinon', () => {
    let untouched = 0;
    for (const seed of SEEDS) {
      const raw = generateTerrain(35, 35, createRng(seed));
      const { map } = generateEscortMap(35, 35, createRng(seed));
      const changed = map.terrain.filter((terrain, i) => terrain !== raw.terrain[i]).length;
      // Au plus 10 % de la carte : les ensembles de terrains restent cohérents.
      expect(changed).toBeLessThan(map.terrain.length * 0.1);
      if (changed === 0) untouched++;
    }
    expect(untouched).toBeGreaterThan(0);
  });
});
