import { defaultConfig, type GameConfig, type ShipClass } from '../../config/game.config';
import type { MissionState } from '../../core/game.types';
import { createRng } from '../../core/rng.service';
import type { Hex } from '../../map/hex.service';
import type { Terrain } from '../../map/terrain.model';
import { initialSetup, type Constraint } from '../../missions/setup.service';
import { createUnit, type Side, type Unit } from '../../units/unit.model';
import { sweepArea, effectiveSweepRange, resolveSweep } from '../sweep.service';
import type { Contact } from '../contact.types';
import { observeFriend } from '../observation.service';
import { resolveWatch } from '../watch-sensor.service';

const SIZE = 15;
const AT: Hex = { col: 7, row: 7 };

/** Portées du balayage et de la veille d'une frégate, avec et sans « Capteurs dégradés » (configuration). */
const SWEEP = defaultConfig.ships.frigate_asm.detection!.sweepRange;
const WATCH = defaultConfig.ships.frigate_asm.detection!.watchRange;
const DEGRADED_SWEEP = Math.floor(SWEEP * defaultConfig.constraints.sensorsFactor);

/** Nombre d'hexagones à une distance de 1 à `range` d'un hexagone : 6 + 12 + 18 + … */
function cellsWithin(range: number): number {
  return 3 * range * (range + 1);
}

function unit(id: string, side: Side, shipClass: ShipClass, position: Hex): Unit {
  return createUnit(id, side, shipClass, position, defaultConfig, {
    ammoFactor: 1,
    movementCap: null,
  });
}

/** Mission d'essai en mer ouverte : seuls les navires fournis comptent. */
function mission(
  units: Unit[],
  options: {
    seed?: number;
    cycle?: number;
    constraints?: Constraint[];
    contacts?: Contact[];
    terrain?: Terrain;
  } = {},
): MissionState {
  const { seed = 1, cycle = 1, constraints = [], contacts = [], terrain = 'deep_sea' } = options;
  return {
    status: 'in_progress',
    setup: { ...initialSetup(), mission: 'naval_combat', constraints },
    map: { width: SIZE, height: SIZE, terrain: Array<Terrain>(SIZE * SIZE).fill(terrain) },
    start: { col: 0, row: 7 },
    goal: null,
    units,
    cycle,
    carrierNavigation: null,
    outcome: null,
    friendContacts: contacts,
    nextContactNumber: contacts.length + 1,
    hostileContacts: [],
    nextHostileContactNumber: 1,
    rngState: createRng(seed).state(),
  };
}

function searcher(shipClass: ShipClass = 'frigate_da'): Unit {
  return unit('f1', 'friend', shipClass, AT);
}

function hostile(
  id = 'h1',
  shipClass: ShipClass = 'frigate_asm',
  position: Hex = { col: 10, row: 7 },
): Unit {
  return unit(id, 'hostile', shipClass, position);
}

/** Configuration où le balayage réussit toujours, pour isoler la portée et les contacts. */
const SURE: GameConfig = {
  ...defaultConfig,
  ships: {
    ...defaultConfig.ships,
    frigate_da: {
      ...defaultConfig.ships.frigate_da,
      detection: { ...defaultConfig.ships.frigate_da.detection!, sweepProbability: 1 },
    },
  },
};

/** Part des tirages réussis sur autant de graines. */
function successRate(build: (seed: number) => MissionState, runs = 3000): number {
  let identified = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const state = build(seed);
    const result = resolveSweep(state, searcher(), defaultConfig);
    if (result.state.friendContacts.length > 0) identified++;
  }
  return identified / runs;
}

describe('balayage : tirage et portée (AB-25)', () => {
  it('identifie à environ 90 % un navire à portée (distance 3)', () => {
    const rate = successRate((seed) => mission([searcher(), hostile()], { seed }));
    expect(rate).toBeGreaterThan(0.87);
    expect(rate).toBeLessThan(0.93);
  });

  it('porte jusqu’à sa portée sans contrainte, jamais au-delà', () => {
    const atRange = hostile('h1', 'frigate_asm', { col: AT.col + SWEEP, row: 7 });
    const beyond = hostile('h1', 'frigate_asm', { col: AT.col + SWEEP + 1, row: 7 });
    expect(successRate((seed) => mission([searcher(), atRange], { seed }), 500)).toBeGreaterThan(
      0.8,
    );
    expect(successRate((seed) => mission([searcher(), beyond], { seed }), 500)).toBe(0);
  });

  it('avec « Capteurs dégradés », la portée est réduite de 20 % (arrondi inférieur)', () => {
    const constraints: Constraint[] = ['degraded_sensors'];
    const atRange = hostile('h1', 'frigate_asm', { col: AT.col + DEGRADED_SWEEP, row: 7 });
    const beyond = hostile('h1', 'frigate_asm', { col: AT.col + DEGRADED_SWEEP + 1, row: 7 });
    expect(
      successRate((seed) => mission([searcher(), atRange], { seed, constraints }), 500),
    ).toBeGreaterThan(0.8);
    expect(successRate((seed) => mission([searcher(), beyond], { seed, constraints }), 500)).toBe(
      0,
    );
    expect(effectiveSweepRange(searcher(), constraints, defaultConfig)).toBe(DEGRADED_SWEEP);
    expect(effectiveSweepRange(searcher(), [], defaultConfig)).toBe(SWEEP);
  });

  it('ne donne aucun bonus côtier : un sous-marin en mer côtière reste à 90 %', () => {
    const submarine = hostile('h1', 'submarine');
    const rate = successRate((seed) =>
      mission([searcher(), submarine], { seed, terrain: 'coastal_sea' }),
    );
    expect(rate).toBeGreaterThan(0.87);
    expect(rate).toBeLessThan(0.93);
  });

  it('un sous-marin allié cherche comme une frégate', () => {
    let identified = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const result = resolveSweep(
        mission([unit('f1', 'friend', 'submarine', AT), hostile()], { seed }),
        unit('f1', 'friend', 'submarine', AT),
        defaultConfig,
      );
      if (result.state.friendContacts.length > 0) identified++;
    }
    expect(identified / 1000).toBeGreaterThan(0.86);
  });

  it('ne cherche ni les alliés ni les navires détruits, et ne tire rien sans cible', () => {
    const ally = unit('f2', 'friend', 'fremm', { col: 8, row: 7 });
    const wreck = { ...hostile(), hp: 0 };
    const state = mission([searcher(), ally, wreck], { seed: 5 });
    const result = resolveSweep(state, searcher(), SURE);
    expect(result.state.friendContacts).toEqual([]);
    expect(result.state.rngState).toBe(state.rngState);
  });

  it('est déterministe par graine et rend le générateur à la mission (AB-24)', () => {
    const state = mission([searcher(), hostile()], { seed: 9 });
    const a = resolveSweep(state, searcher(), defaultConfig);
    const b = resolveSweep(state, searcher(), defaultConfig);
    expect(a).toEqual(b);
    expect(a.state.rngState).not.toBe(state.rngState);
  });
});

describe('balayage : contacts identifiés (AB-25, AB-26)', () => {
  it('révèle le type (jamais la classe) et la position exacte, avec la cible en donnée interne', () => {
    const frigate = hostile('h1', 'frigate_asm', { col: 9, row: 7 });
    const submarine = hostile('h2', 'submarine', { col: 8, row: 9 });
    const { state } = resolveSweep(mission([searcher(), frigate, submarine]), searcher(), SURE);
    expect(state.friendContacts).toEqual([
      {
        kind: 'identified',
        id: 'C-1',
        cycle: 1,
        targetType: 'frigate',
        position: { col: 9, row: 7 },
        source: 'h1',
      },
      {
        kind: 'identified',
        id: 'C-2',
        cycle: 1,
        targetType: 'submarine',
        position: { col: 8, row: 9 },
        source: 'h2',
      },
    ]);
    expect(state.nextContactNumber).toBe(3);
  });

  it('identifie plusieurs navires dans une même recherche, jusqu’à deux sur deux', () => {
    let both = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const state = mission(
        [searcher(), hostile('h1'), hostile('h2', 'submarine', { col: 8, row: 8 })],
        { seed },
      );
      const result = resolveSweep(state, searcher(), defaultConfig);
      if (result.state.friendContacts.length === 2) both++;
    }
    // 0,9 × 0,9 ≈ 81 %
    expect(both / 400).toBeGreaterThan(0.74);
    expect(both / 400).toBeLessThan(0.88);
  });

  it('actualise le contact identifié du même navire : même identifiant, position et cycle à jour', () => {
    const previous: Contact = {
      kind: 'identified',
      id: 'C-4',
      cycle: 1,
      targetType: 'frigate',
      position: { col: 1, row: 1 },
      source: 'h1',
    };
    const moved = hostile('h1', 'frigate_asm', { col: 9, row: 8 });
    const state = mission([searcher(), moved], { cycle: 2, contacts: [previous] });
    const { state: after, events } = resolveSweep(state, searcher(), SURE);
    expect(after.friendContacts).toEqual([
      {
        kind: 'identified',
        id: 'C-4',
        cycle: 2,
        targetType: 'frigate',
        position: { col: 9, row: 8 },
        source: 'h1',
      },
    ]);
    expect(after.nextContactNumber).toBe(state.nextContactNumber);
    expect(events).toMatchObject([{ identified: [{ contactId: 'C-4' }] }]);
  });

  it('ne retire que les zones de la cible identifiée ; un échec ne retire rien', () => {
    const zoneOf = (id: string, source: string): Contact => ({
      kind: 'suspect',
      id,
      cycle: 1,
      zone: [{ col: 3, row: 3 }],
      source,
    });
    const contacts = [zoneOf('C-1', 'h1'), zoneOf('C-2', 'h2')];
    const targets = [hostile('h1'), hostile('h2', 'submarine', { col: 2, row: 2 })];
    const found = resolveSweep(mission([searcher(), ...targets], { contacts }), searcher(), SURE);
    expect(found.state.friendContacts.map((c) => [c.id, c.kind])).toEqual([
      ['C-2', 'suspect'],
      ['C-3', 'identified'],
    ]);
    const missed = resolveSweep(mission([searcher(), ...targets], { contacts }), searcher(), {
      ...SURE,
      ships: {
        ...SURE.ships,
        frigate_da: {
          ...SURE.ships.frigate_da,
          detection: { ...SURE.ships.frigate_da.detection!, sweepProbability: 0 },
        },
      },
    });
    expect(missed.state.friendContacts).toEqual(contacts);
  });

  it('retire aussi les zones plus anciennes de la même cible', () => {
    const zone = (id: string, cycle: number): Contact => ({
      kind: 'suspect',
      id,
      cycle,
      zone: [{ col: 3, row: 3 }],
      source: 'h1',
    });
    const state = mission([searcher(), hostile()], {
      cycle: 2,
      contacts: [zone('C-1', 1), zone('C-2', 2)],
    });
    const after = resolveSweep(state, searcher(), SURE).state;
    expect(after.friendContacts.map((c) => c.kind)).toEqual(['identified']);
  });

  it('laisse la veille de fin de cycle s’appliquer au navire identifié : nouvelle zone', () => {
    const near = hostile('h1', 'frigate_asm', { col: 9, row: 7 });
    let zones = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const searched = resolveSweep(mission([searcher(), near], { seed }), searcher(), SURE).state;
      const ended = resolveWatch(searched, defaultConfig).state;
      const kinds = ended.friendContacts.map((c) => c.kind);
      expect(kinds).toContain('identified');
      if (kinds.includes('suspect')) zones++;
    }
    // veille : probabilité de base 50 %, plus 20 points pour une cible qui a balayé
    expect(zones / 300).toBeGreaterThan(0.5);
    expect(zones / 300).toBeLessThan(0.7);
  });
});

describe('balayage : durée de vie et état « ancien » (AB-27)', () => {
  it('suit la règle des zones : visible au cycle et au suivant, « ancien » au suivant, retiré ensuite', () => {
    // Juste au-delà de la veille : seul le balayage le voit, la veille de fin de cycle ne crée rien.
    const beyondWatch = hostile('h1', 'frigate_asm', { col: AT.col + WATCH + 1, row: 7 });
    const searched = resolveSweep(mission([searcher(), beyondWatch]), searcher(), SURE).state;
    expect(observeFriend(searched).contacts).toMatchObject([{ id: 'C-1', stale: false }]);
    const endOfCycle1 = resolveWatch(searched, defaultConfig).state;
    const cycle2 = { ...endOfCycle1, cycle: 2 };
    expect(observeFriend(cycle2).contacts).toMatchObject([{ id: 'C-1', stale: true }]);
    const endOfCycle2 = resolveWatch(cycle2, defaultConfig).state;
    expect(endOfCycle2.friendContacts.filter((c) => c.kind === 'identified')).toEqual([]);
  });

  it('ne suit pas le navire : la position reste celle de l’identification', () => {
    const searched = resolveSweep(mission([searcher(), hostile()]), searcher(), SURE).state;
    const moved = {
      ...searched,
      cycle: 2,
      units: searched.units.map((u) =>
        u.side === 'hostile' ? { ...u, position: { col: 12, row: 12 } } : u,
      ),
    };
    expect(observeFriend(moved).contacts).toMatchObject([{ position: { col: 10, row: 7 } }]);
  });

  it('crée un nouveau contact quand l’ancien a expiré', () => {
    const expired = { ...mission([searcher(), hostile()], { cycle: 3 }) };
    const after = resolveSweep({ ...expired, nextContactNumber: 5 }, searcher(), SURE).state;
    expect(after.friendContacts.map((c) => c.id)).toEqual(['C-5']);
  });
});

describe('cases à portée (brouillon de recherche)', () => {
  it('renvoie les cases à distance 1 jusqu’à la portée, la case de l’unité exclue', () => {
    const observation = observeFriend(mission([searcher()]));
    const area = sweepArea(observation, searcher(), defaultConfig);
    expect(area).toHaveLength(cellsWithin(SWEEP));
    expect(area.some((h) => h.col === AT.col && h.row === AT.row)).toBe(false);
    expect(area.every((h) => h.col >= 0 && h.col < SIZE && h.row >= 0 && h.row < SIZE)).toBe(true);
  });

  it('se réduit avec « Capteurs dégradés »', () => {
    const full = sweepArea(observeFriend(mission([searcher()])), searcher(), defaultConfig);
    const degraded = sweepArea(
      observeFriend(mission([searcher()], { constraints: ['degraded_sensors'] })),
      searcher(),
      defaultConfig,
    );
    expect(full).toHaveLength(cellsWithin(SWEEP));
    expect(degraded).toHaveLength(cellsWithin(DEGRADED_SWEEP));
  });
});

describe('balayage du camp hostile : mêmes règles que le joueur (AB-35)', () => {
  /** Navire de l'IA qui balaie, en `AT` (frégate DA : balayage sûr dans `SURE`). */
  const aiSearcher = (): Unit => unit('h1', 'hostile', 'frigate_da', AT);
  const ally = (position: Hex = { col: 10, row: 7 }): Unit =>
    unit('f1', 'friend', 'frigate_asm', position);

  it('identifie une unité alliée à portée : le contact va au camp hostile seulement', () => {
    const state = mission([aiSearcher(), ally()]);
    const result = resolveSweep(state, aiSearcher(), SURE);
    expect(result.state.hostileContacts).toEqual([
      {
        kind: 'identified',
        id: 'C-1',
        cycle: 1,
        targetType: 'frigate',
        position: { col: 10, row: 7 },
        source: 'f1',
      },
    ]);
    expect(result.state.nextHostileContactNumber).toBe(2);
    // Le joueur n'apprend rien de ce que l'IA identifie : ni contact, ni compteur, ni événement.
    expect(result.state.friendContacts).toEqual(state.friendContacts);
    expect(result.state.nextContactNumber).toBe(state.nextContactNumber);
    expect(result.events).toEqual([]);
  });

  it('révèle le porte-avions allié comme tel, jamais comme une frégate', () => {
    const carrier = unit('c', 'friend', 'carrier', { col: 9, row: 7 });
    const result = resolveSweep(mission([aiSearcher(), carrier]), aiSearcher(), SURE);
    expect(result.state.hostileContacts).toMatchObject([
      { kind: 'identified', targetType: 'carrier', source: 'c' },
    ]);
  });

  it('respecte la portée et ne cherche jamais son propre camp', () => {
    const far = ally({ col: AT.col + SWEEP + 1, row: 7 }); // juste hors de portée
    const sister = unit('h2', 'hostile', 'frigate_asm', { col: 8, row: 7 });
    const result = resolveSweep(mission([aiSearcher(), far, sister]), aiSearcher(), SURE);
    expect(result.state.hostileContacts).toEqual([]);
  });

  it('ne subit pas « Capteurs dégradés », propre au joueur : portée conservée (AB-36)', () => {
    // À la portée normale, hors de la portée dégradée.
    const atNormalRange = ally({ col: AT.col + DEGRADED_SWEEP + 1, row: 7 });
    const state = mission([aiSearcher(), atNormalRange], { constraints: ['degraded_sensors'] });
    expect(resolveSweep(state, aiSearcher(), SURE).state.hostileContacts).toHaveLength(1);
    // Le même balayage côté joueur est, lui, réduit.
    const hostileTarget = unit('h3', 'hostile', 'frigate_asm', {
      col: AT.col + DEGRADED_SWEEP + 1,
      row: 7,
    });
    const friendState = mission([searcher(), hostileTarget], { constraints: ['degraded_sensors'] });
    expect(resolveSweep(friendState, searcher(), SURE).state.friendContacts).toEqual([]);
  });
});
