import { defaultConfig } from '../config/gameConfig';
import { indexOf, type GameMap } from '../map/gameMap';
import { hexDistance, type Hex } from '../map/hex';
import type { Terrain } from '../map/terrain';
import { planMove, reachableHexes } from './movement';
import { createUnit, type Unit } from './unit';

/** Carte carrée de mer classique, avec quelques cases d'un autre terrain. */
function seaMap(size: number, overrides: [Hex, Terrain][] = []): GameMap {
  const terrain = Array<Terrain>(size * size).fill('sea');
  for (const [hex, kind] of overrides) terrain[indexOf({ width: size }, hex)] = kind;
  return { width: size, height: size, terrain };
}

function unit(
  id: string,
  shipClass: Parameters<typeof createUnit>[2],
  position: Hex,
  movementCap: number | null = null,
): Unit {
  return createUnit(id, 'friend', shipClass, position, defaultConfig, {
    ammoFactor: 1,
    movementCap,
  });
}

const centre = { col: 4, row: 4 };

describe('reachableHexes', () => {
  it('couvre tous les hexagones à 3 pas ou moins en pleine mer, sans la case de départ', () => {
    const fremm = unit('a', 'fremm', centre);
    const reached = reachableHexes({ map: seaMap(9), units: [fremm] }, fremm, defaultConfig);
    expect(reached).toHaveLength(36);
    expect(reached.every((h) => hexDistance(h, centre) >= 1 && hexDistance(h, centre) <= 3)).toBe(
      true,
    );
  });

  it('respecte le plafond de mouvement (Météo défavorable : 2 hexagones)', () => {
    const fremm = unit('a', 'fremm', centre, 2);
    expect(reachableHexes({ map: seaMap(9), units: [fremm] }, fremm, defaultConfig)).toHaveLength(
      18,
    );
  });

  it('exclut les terrains interdits : une frégate entre en mer côtière, pas un sous-marin', () => {
    const map = seaMap(9, [[{ col: 5, row: 4 }, 'coastal_sea']]);
    const frigate = unit('a', 'frigate_da', centre);
    const submarine = unit('b', 'submarine', centre);
    const has = (hexes: Hex[]) => hexes.some((h) => h.col === 5 && h.row === 4);
    expect(has(reachableHexes({ map, units: [frigate] }, frigate, defaultConfig))).toBe(true);
    expect(has(reachableHexes({ map, units: [submarine] }, submarine, defaultConfig))).toBe(false);
  });

  it('exclut les cases occupées et ne les traverse pas', () => {
    const mover = unit('a', 'frigate_da', { col: 0, row: 0 });
    const wall = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((row) =>
      unit(`w${row}`, 'frigate_asm', { col: 2, row }),
    );
    const reached = reachableHexes(
      { map: seaMap(9), units: [mover, ...wall] },
      mover,
      defaultConfig,
    );
    expect(reached.some((h) => h.col >= 2)).toBe(false);
  });
});

describe('planMove', () => {
  const field = (units: Unit[], overrides: [Hex, Terrain][] = []) => ({
    map: seaMap(9, overrides),
    units,
  });

  it('renvoie un chemin continu, de la position à la destination, dans la capacité', () => {
    const fremm = unit('a', 'fremm', centre);
    const plan = planMove(field([fremm]), fremm, { col: 6, row: 5 }, defaultConfig);
    if (!plan.ok) throw new Error('déplacement refusé');
    expect(plan.path[0]).toEqual(centre);
    expect(plan.path.at(-1)).toEqual({ col: 6, row: 5 });
    expect(plan.path.length - 1).toBe(hexDistance(centre, { col: 6, row: 5 }));
    for (let i = 1; i < plan.path.length; i++)
      expect(hexDistance(plan.path[i - 1]!, plan.path[i]!)).toBe(1);
  });

  it('est déterministe : même situation, même chemin', () => {
    const fremm = unit('a', 'fremm', centre);
    const plan = () => planMove(field([fremm]), fremm, { col: 6, row: 6 }, defaultConfig);
    expect(plan()).toEqual(plan());
  });

  it('contourne un obstacle quand le chemin le plus court est bloqué', () => {
    const fremm = unit('a', 'fremm', { col: 0, row: 4 });
    const blocker = unit('b', 'frigate_da', { col: 1, row: 4 });
    const plan = planMove(field([fremm, blocker]), fremm, { col: 2, row: 4 }, defaultConfig);
    expect(plan.ok).toBe(true);
    if (plan.ok) expect(plan.path.some((h) => h.col === 1 && h.row === 4)).toBe(false);
  });

  it.each([
    ['SAME_HEX', centre, []],
    ['NOT_NAVIGABLE', { col: 6, row: 4 }, [[{ col: 6, row: 4 }, 'beach']]],
    ['OCCUPIED', { col: 5, row: 4 }, []],
    ['OUT_OF_RANGE', { col: 8, row: 4 }, []],
  ] as const)('refuse avec le motif %s', (reason, destination, overrides) => {
    const fremm = unit('a', 'fremm', centre);
    const other = unit('b', 'frigate_da', { col: 5, row: 4 });
    const plan = planMove(
      field([fremm, other], [...overrides] as [Hex, Terrain][]),
      fremm,
      destination,
      defaultConfig,
    );
    expect(plan).toEqual({ ok: false, reason });
  });

  it('refuse avec « aucun chemin » une destination isolée par la terre', () => {
    const ring: [Hex, Terrain][] = [
      [{ col: 7, row: 3 }, 'plain'],
      [{ col: 8, row: 3 }, 'plain'],
      [{ col: 7, row: 4 }, 'plain'],
      [{ col: 7, row: 5 }, 'plain'],
      [{ col: 8, row: 5 }, 'plain'],
    ];
    const fremm = unit('a', 'fremm', centre);
    expect(planMove(field([fremm], ring), fremm, { col: 8, row: 4 }, defaultConfig)).toEqual({
      ok: false,
      reason: 'NO_PATH',
    });
  });

  it('refuse une destination hors de la carte', () => {
    const fremm = unit('a', 'fremm', centre);
    expect(planMove(field([fremm]), fremm, { col: 20, row: 20 }, defaultConfig)).toEqual({
      ok: false,
      reason: 'NOT_NAVIGABLE',
    });
  });
});
