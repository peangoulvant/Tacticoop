import { defaultConfig, type ShipClass } from '../../config/game.config';
import { createRng } from '../../core/rng.service';
import { observeFriend } from '../../detection/observation.service';
import { indexOf, terrainAt } from '../../map/game-map.service';
import { hexDistance } from '../../map/hex.service';
import { isNavigable } from '../../map/terrain.model';
import type { Unit } from '../unit.model';
import { createHostileUnits, drawHostileClasses, hostileZoneOf } from '../hostile-force.service';
import { launchMission, type LaunchedMission } from '../../missions/launch.service';
import { initialSetup, type MissionKind, type MissionSetup } from '../../missions/setup.service';

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const WIDTH = defaultConfig.map.width;

function setupFor(mission: MissionKind, overrides: Partial<MissionSetup> = {}): MissionSetup {
  const base = initialSetup();
  return { ...base, mission, force: { ...base.force, frigate_da: 2 }, ...overrides };
}

function hostilesOf(mission: LaunchedMission): Unit[] {
  return mission.units.filter((unit) => unit.side === 'hostile');
}

function launchAll(mission: MissionKind): LaunchedMission[] {
  return SEEDS.map((seed) => launchMission(setupFor(mission), defaultConfig, seed));
}

describe.each<MissionKind>(['naval_combat', 'escort'])(
  'force ennemie au lancement (%s)',
  (mission) => {
    const missions = launchAll(mission);

    it("aligne trois ennemis en camp hostile, disponibles pour l'IA (AB-39), avec leur fiche de classe", () => {
      for (const launched of missions) {
        const hostiles = hostilesOf(launched);
        expect(hostiles).toHaveLength(3);
        for (const hostile of hostiles) {
          expect(hostile.activation).toBe('available');
          expect(hostile.hp).toBe(defaultConfig.ships[hostile.shipClass].maxHp);
        }
      }
    });

    it('place chaque ennemi sur un hexagone navigable pour son type, jamais deux unités sur le même', () => {
      for (const launched of missions) {
        const keys = launched.units.map((unit) => indexOf(launched.map, unit.position));
        expect(new Set(keys).size).toBe(keys.length);
        for (const hostile of hostilesOf(launched)) {
          const terrain = terrainAt(launched.map, hostile.position);
          expect(isNavigable(terrain, defaultConfig.ships[hostile.shipClass].category)).toBe(true);
        }
      }
    });

    it('respecte la zone de départ et les distances minimales du scénario', () => {
      for (const launched of missions) {
        const zone = hostileZoneOf(mission, launched, defaultConfig);
        for (const hostile of hostilesOf(launched)) {
          expect(hostile.position.col).toBeGreaterThanOrEqual(zone.fromCol);
          expect(hostile.position.col).toBeLessThanOrEqual(zone.toCol);
          for (const { from, distance } of zone.minDistances) {
            expect(hexDistance(hostile.position, from)).toBeGreaterThanOrEqual(distance);
          }
        }
      }
    });

    it('obtient les quatre configurations et les trois classes de frégate sur 200 graines', () => {
      const compositions = new Set<string>();
      const frigateClasses = new Set<ShipClass>();
      for (const launched of missions) {
        const hostiles = hostilesOf(launched);
        const subs = hostiles.filter((unit) => unit.shipClass === 'submarine').length;
        compositions.add(`${3 - subs}F+${subs}S`);
        hostiles
          .filter((u) => u.shipClass !== 'submarine')
          .forEach((u) => frigateClasses.add(u.shipClass));
      }
      expect([...compositions].sort()).toEqual(['0F+3S', '1F+2S', '2F+1S', '3F+0S']);
      expect([...frigateClasses].sort()).toEqual(['fremm', 'frigate_asm', 'frigate_da']);
    });

    it('est reproductible pour une même graine', () => {
      expect(launchMission(setupFor(mission), defaultConfig, 7)).toEqual(
        launchMission(setupFor(mission), defaultConfig, 7),
      );
    });

    it('ne dépend ni de la difficulté, ni des munitions limitées, ni des capteurs dégradés (AB-36)', () => {
      const plain = launchMission(setupFor(mission), defaultConfig, 31);
      const other = launchMission(
        setupFor(mission, {
          difficulty: 'expert',
          constraints: ['limited_ammo', 'degraded_sensors'],
        }),
        defaultConfig,
        31,
      );
      expect(hostilesOf(other)).toEqual(hostilesOf(plain));
    });

    it('la météo défavorable plafonne le déplacement ennemi à 2 hexagones, rien d’autre (AB-36)', () => {
      const plain = launchMission(setupFor(mission), defaultConfig, 31);
      const stormy = launchMission(
        setupFor(mission, { constraints: ['bad_weather'] }),
        defaultConfig,
        31,
      );
      const capped = hostilesOf(stormy);
      expect(capped.every((unit) => unit.movement <= 2)).toBe(true);
      // Mêmes navires, mêmes positions, mêmes dotations : seul le mouvement change, et seulement
      // pour une unité dont la fiche dépasse le plafond.
      const normal = hostilesOf(plain);
      expect(capped.map((u) => [u.id, u.position, u.missiles, u.torpedoes])).toEqual(
        normal.map((u) => [u.id, u.position, u.missiles, u.torpedoes]),
      );
      expect(normal.some((u) => u.movement > 2)).toBe(true);
    });

    it("ne révèle aucun ennemi au joueur : la projection amie n'en contient aucun", () => {
      for (const launched of missions.slice(0, 20)) {
        const state = { ...launched, status: 'in_progress' as const, setup: setupFor(mission) };
        const observed = JSON.stringify(observeFriend({ ...state, cycle: 1, outcome: null, outcomeCause: null }));
        expect(observed).not.toContain('hostile');
      }
    });
  },
);

describe('zones de départ', () => {
  it('lutte navale : bande est de 25 % de la largeur (colonnes 27 à 34 à 35 de large)', () => {
    const launched = launchMission(setupFor('naval_combat'), defaultConfig, 1);
    const zone = hostileZoneOf('naval_combat', launched, defaultConfig);
    expect([zone.fromCol, zone.toCol]).toEqual([27, WIDTH - 1]);
    expect(zone.minDistances.map((d) => d.distance)).toEqual([16]);
  });

  it("escorte : partie centrale (colonnes 10 à 29) à l'écart de A (16) et de B (9)", () => {
    const launched = launchMission(setupFor('escort'), defaultConfig, 1);
    const zone = hostileZoneOf('escort', launched, defaultConfig);
    expect([zone.fromCol, zone.toCol]).toEqual([10, 29]);
    expect(zone.minDistances.map((d) => d.distance)).toEqual([16, 9]);
  });

  it('proportionnelle à la largeur : la bande est suit une carte de 50 de large', () => {
    const launched = launchMission(setupFor('naval_combat'), defaultConfig, 1);
    const wide = { ...launched, map: { ...launched.map, width: 50 } };
    const zone = hostileZoneOf('naval_combat', wide, defaultConfig);
    expect([zone.fromCol, zone.toCol]).toEqual([38, 49]);
    expect(zone.minDistances[0]?.distance).toBe(23);
  });
});

describe('départ des alliés', () => {
  it.each<MissionKind>(['naval_combat', 'escort'])(
    'groupe les alliés près de leur point de départ (%s), sur 200 graines',
    (mission) => {
      for (const launched of launchAll(mission)) {
        for (const unit of launched.units.filter((u) => u.side === 'friend')) {
          expect(hexDistance(unit.position, launched.start)).toBeLessThanOrEqual(2);
        }
      }
    },
  );

  it('lit les colonnes de départ dans GameConfig (A à la colonne 2 et B à la colonne 32 à 35)', () => {
    const escort = launchMission(setupFor('escort'), defaultConfig, 3);
    expect(Math.abs(escort.start.col - 2)).toBeLessThanOrEqual(6);
    expect(escort.goal?.col).toBeGreaterThanOrEqual(28);
  });
});

describe('tirage de la composition', () => {
  it('tire uniquement les poids non nuls et respecte la configuration', () => {
    const force = {
      compositions: [
        { frigates: 0, submarines: 3, weight: 0 },
        { frigates: 1, submarines: 2, weight: 5 },
      ],
      frigateClassWeights: { fremm: 0, frigate_da: 0, frigate_asm: 1 },
    };
    const rng = createRng(2);
    for (let i = 0; i < 100; i++) {
      expect(drawHostileClasses(force, rng)).toEqual(['frigate_asm', 'submarine', 'submarine']);
    }
  });
});

describe('placement impossible', () => {
  it("échoue explicitement au lieu d'élargir la zone", () => {
    const launched = launchMission(setupFor('naval_combat'), defaultConfig, 1);
    const zone = { fromCol: 0, toCol: 0, minDistances: [{ from: launched.start, distance: 99 }] };
    expect(() =>
      createHostileUnits(
        ['frigate_da'],
        launched.map,
        zone,
        new Set(),
        defaultConfig,
        createRng(1),
      ),
    ).toThrow(/Aucun hexagone de départ ennemi/);
  });
});
