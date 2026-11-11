import { defaultConfig } from '../../config/game.config';
import { createRng } from '../../core/rng.service';
import { indexOf, terrainAt, type GameMap } from '../../map/game-map.service';
import { generateTerrain } from '../../map/generate.service';
import { hexDistance, hexNeighbors, sameHex, type Hex } from '../../map/hex.service';
import { isWater, type Terrain } from '../../map/terrain.model';
import { generateWatchZone } from '../watch-zone.service';

const DETECTION = defaultConfig.detection;

function openSea(size: number): GameMap {
  return { width: size, height: size, terrain: Array<Terrain>(size * size).fill('deep_sea') };
}

/** Zone contiguë : chaque hexagone touche au moins un autre hexagone de la zone, de proche en proche. */
function isContiguous(zone: readonly Hex[], map: GameMap): boolean {
  const seen = new Set([indexOf(map, zone[0] as Hex)]);
  const queue = [zone[0] as Hex];
  while (queue.length > 0) {
    const hex = queue.pop() as Hex;
    for (const n of hexNeighbors(hex, map.width, map.height)) {
      const inZone = zone.some((z) => sameHex(z, n));
      if (inZone && !seen.has(indexOf(map, n))) {
        seen.add(indexOf(map, n));
        queue.push(n);
      }
    }
  }
  return seen.size === zone.length;
}

function isSortedByPosition(zone: readonly Hex[]): boolean {
  return zone.every((hex, i) => {
    const previous = zone[i - 1];
    return (
      !previous || previous.row < hex.row || (previous.row === hex.row && previous.col < hex.col)
    );
  });
}

/** Cibles d'essai : une case d'eau sur dix, dans l'ordre de la carte. */
function sampleTargets(map: GameMap): Hex[] {
  const targets: Hex[] = [];
  for (let i = 0; i < map.terrain.length; i += 10) {
    const hex = { col: i % map.width, row: Math.floor(i / map.width) };
    if (isWater(terrainAt(map, hex))) targets.push(hex);
  }
  return targets;
}

describe('zone de contact de veille (AB-20)', () => {
  it('compte 7 hexagones contigus, dans la carte, sans terre, cible comprise, sur 200 cartes', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = createRng(seed);
      const map = generateTerrain(35, 35, rng);
      for (const target of sampleTargets(map).slice(0, 12)) {
        const zone = generateWatchZone(map, target, rng, DETECTION);
        expect(zone.length).toBeLessThanOrEqual(DETECTION.zoneSize);
        expect(zone.some((hex) => sameHex(hex, target))).toBe(true);
        expect(zone.every((hex) => isWater(terrainAt(map, hex)))).toBe(true);
        expect(new Set(zone.map((hex) => indexOf(map, hex))).size).toBe(zone.length);
        expect(isContiguous(zone, map)).toBe(true);
      }
    }
  });

  it('garde 7 hexagones presque partout : la zone raccourcie reste exceptionnelle', () => {
    let total = 0;
    let shortened = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const rng = createRng(seed);
      const map = generateTerrain(35, 35, rng);
      for (const target of sampleTargets(map)) {
        total++;
        if (generateWatchZone(map, target, rng, DETECTION).length < DETECTION.zoneSize) shortened++;
      }
    }
    expect(shortened / total).toBeLessThan(0.01);
  });

  it("livre les cases triées par ligne puis colonne : l'ordre de génération ne fuit pas", () => {
    const rng = createRng(3);
    const map = openSea(15);
    for (let i = 0; i < 200; i++) {
      expect(isSortedByPosition(generateWatchZone(map, { col: 7, row: 7 }, rng, DETECTION))).toBe(
        true,
      );
    }
  });

  it("reste dans la carte : une cible au coin n'est jamais dans une zone débordante", () => {
    const map = openSea(15);
    const rng = createRng(5);
    for (const target of [
      { col: 0, row: 0 },
      { col: 14, row: 14 },
      { col: 0, row: 14 },
      { col: 14, row: 0 },
    ]) {
      for (let i = 0; i < 100; i++) {
        const zone = generateWatchZone(map, target, rng, DETECTION);
        expect(zone.every((h) => h.col >= 0 && h.col < 15 && h.row >= 0 && h.row < 15)).toBe(true);
        expect(zone.some((hex) => sameHex(hex, target))).toBe(true);
      }
    }
  });

  it("place la cible uniformément dans sa forme : elle n'est pas plus centrale qu'une autre case", () => {
    const map = openSea(31);
    const rng = createRng(11);
    const target = { col: 15, row: 15 };
    const distance = (a: Hex, b: Hex) => hexDistance(a, b);
    let targetSpread = 0;
    let cellSpread = 0;
    const draws = 4000;
    for (let i = 0; i < draws; i++) {
      const zone = generateWatchZone(map, target, rng, DETECTION);
      const spread = (hex: Hex) => zone.reduce((sum, other) => sum + distance(hex, other), 0);
      targetSpread += spread(target);
      cellSpread += zone.reduce((sum, hex) => sum + spread(hex), 0) / zone.length;
    }
    // Pour un placement uniforme, la somme des distances de la cible aux autres cases vaut en
    // moyenne celle d'une case quelconque ; une croissance à partir de la cible la ferait nettement baisser.
    expect(Math.abs(targetSpread - cellSpread) / draws).toBeLessThan(0.15);
  });

  it("se replie sur l'eau seule quand la cible est dans un petit lac", () => {
    const map: GameMap = {
      width: 9,
      height: 9,
      terrain: Array<Terrain>(81).fill('mountain'),
    };
    const lake = [
      { col: 4, row: 4 },
      { col: 5, row: 4 },
      { col: 4, row: 5 },
    ];
    const terrain = [...map.terrain];
    for (const hex of lake) terrain[indexOf(map, hex)] = 'sea';
    const zone = generateWatchZone(
      { ...map, terrain },
      { col: 4, row: 4 },
      createRng(2),
      DETECTION,
    );
    expect(zone.length).toBeGreaterThanOrEqual(1);
    expect(zone.length).toBeLessThanOrEqual(lake.length);
    expect(zone.every((hex) => lake.some((l) => sameHex(l, hex)))).toBe(true);
  });

  it('est reproductible pour une même graine', () => {
    const map = openSea(15);
    const a = generateWatchZone(map, { col: 6, row: 6 }, createRng(9), DETECTION);
    const b = generateWatchZone(map, { col: 6, row: 6 }, createRng(9), DETECTION);
    expect(a).toEqual(b);
  });
});
