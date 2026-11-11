import { defaultConfig } from '../../config/game.config';
import { createRng } from '../../core/rng.service';
import { generateEscortMap, generateNavalCombatMap } from '../generate.service';
import {
  type GameMap,
  indexOf,
  nearestNavigableHex,
  shortestPath,
  terrainAt,
} from '../game-map.service';
import { hexDistance } from '../hex.service';
import { isNavigable } from '../terrain.model';

const ESCORT = defaultConfig.missions.escort;
const NAVAL = defaultConfig.missions.navalCombat;

/** Carte 4×1 : mer, plage, mer, mer. */
const strip: GameMap = { width: 4, height: 1, terrain: ['sea', 'beach', 'sea', 'sea'] };

describe('nearestNavigableHex', () => {
  it('ignore les terrains non navigables et les cases occupées', () => {
    expect(nearestNavigableHex(strip, { col: 1, row: 0 }, 'frigate')).toEqual({ col: 0, row: 0 });
    const taken = new Set([indexOf(strip, { col: 0, row: 0 })]);
    expect(nearestNavigableHex(strip, { col: 1, row: 0 }, 'frigate', taken)).toEqual({
      col: 2,
      row: 0,
    });
  });

  it("refuse de placer quand aucune case n'est disponible", () => {
    const land: GameMap = { width: 2, height: 1, terrain: ['plain', 'mountain'] };
    expect(() => nearestNavigableHex(land, { col: 0, row: 0 }, 'frigate')).toThrow();
  });
});

describe('shortestPath', () => {
  it('ne traverse pas la terre', () => {
    expect(shortestPath(strip, { col: 0, row: 0 }, { col: 3, row: 0 }, 'frigate')).toBeNull();
    const open: GameMap = { width: 3, height: 1, terrain: ['sea', 'sea', 'sea'] };
    expect(shortestPath(open, { col: 0, row: 0 }, { col: 2, row: 0 }, 'frigate')).toHaveLength(3);
  });
});

describe('cartes de scénario', () => {
  it("lutte navale : départ à l'ouest sur une case navigable pour tous, sans point B", () => {
    const { map, start, goal } = generateNavalCombatMap(
      35,
      35,
      createRng(9),
      NAVAL.alliedStartColumnRatio,
      defaultConfig.map.generation,
    );
    expect(goal).toBeNull();
    expect(isNavigable(terrainAt(map, start), 'submarine')).toBe(true);
    expect(hexDistance(start, { col: 2, row: 17 })).toBeLessThan(10);
  });

  it('escorte : A et B sont navigables et reliés', () => {
    const { map, start, goal } = generateEscortMap(
      35,
      35,
      createRng(9),
      ESCORT.startColumnRatio,
      ESCORT.goalColumnRatio,
      defaultConfig.map.generation,
    );
    expect(isNavigable(terrainAt(map, goal), 'carrier')).toBe(true);
    expect(shortestPath(map, start, goal, 'carrier')).not.toBeNull();
  });
});
