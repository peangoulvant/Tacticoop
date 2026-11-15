import { defaultConfig, type ShipClass } from '../../config/game.config';
import type { MissionState } from '../../core/game.types';
import { createRng } from '../../core/rng.service';
import type { Hex } from '../../map/hex.service';
import type { Terrain } from '../../map/terrain.model';
import { initialSetup, type Constraint } from '../../missions/setup.service';
import { createUnit, type Side, type Unit } from '../../units/unit.model';
import type { Contact } from '../contact.types';
import { contactHexes } from '../contact.types';
import { observeFriend } from '../observation.service';
import { resolveWatch } from '../watch-sensor.service';

const SIZE = 15;
const NO_MODIFIERS = { ammoFactor: 1, movementCap: null } as const;

function unit(id: string, side: Side, shipClass: ShipClass, position: Hex): Unit {
  return createUnit(id, side, shipClass, position, defaultConfig, NO_MODIFIERS);
}

/** Mission d'essai en mer ouverte : seuls les détecteurs et cibles fournis comptent. */
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

/** Contact suspect d'essai, issu de la cible `h1`. */
function suspect(id: string, cycle: number, zone: Hex[]): Contact {
  return { kind: 'suspect', id, cycle, zone, source: 'h1' };
}

const AT = { col: 7, row: 7 };

/** Portée de veille d'une frégate et sa valeur avec « Capteurs dégradés » (lues dans la configuration). */
const WATCH = defaultConfig.ships.frigate_asm.detection!.watchRange;
const DEGRADED_WATCH = Math.floor(WATCH * defaultConfig.constraints.sensorsFactor);
function friend(shipClass: ShipClass = 'frigate_da', position: Hex = AT): Unit {
  return unit('f1', 'friend', shipClass, position);
}

function hostile(shipClass: ShipClass = 'frigate_asm', position: Hex = { col: 9, row: 7 }): Unit {
  return unit('h1', 'hostile', shipClass, position);
}

/** Nombre de cycles, sur autant de graines, où la veille crée au moins un contact. */
function detectionRate(build: (seed: number) => MissionState, runs = 3000): number {
  let detected = 0;
  for (let seed = 1; seed <= runs; seed++) {
    if (resolveWatch(build(seed), defaultConfig).state.friendContacts.length > 0) detected++;
  }
  return detected / runs;
}

describe('veille : éligibilité et probabilité (G-08.2, G-08.4)', () => {
  it('détecte à environ 50 % une cible à portée', () => {
    const rate = detectionRate((seed) => mission([friend(), hostile()], { seed }));
    expect(rate).toBeGreaterThan(0.45);
    expect(rate).toBeLessThan(0.55);
  });

  it('ne détecte jamais une cible juste au-delà de la portée', () => {
    const far = hostile('frigate_asm', { col: AT.col + WATCH + 1, row: 7 });
    expect(detectionRate((seed) => mission([friend(), far], { seed }), 500)).toBe(0);
  });

  it('un sous-marin allié détecte comme une frégate', () => {
    const rate = detectionRate((seed) => mission([friend('submarine'), hostile()], { seed }));
    expect(rate).toBeGreaterThan(0.45);
    expect(rate).toBeLessThan(0.55);
  });

  it('le porte-avions ne détecte pas (aucune ligne dans G-08.4, D-04)', () => {
    const carrier = unit('c', 'friend', 'carrier', AT);
    expect(detectionRate((seed) => mission([carrier, hostile()], { seed }), 500)).toBe(0);
  });

  it('ne tire rien sans cible ni détecteur, et ne crée aucun contact', () => {
    const result = resolveWatch(mission([friend()]), defaultConfig);
    expect(result.state.friendContacts).toEqual([]);
    expect(result.events).toEqual([]);
  });

  it('une unité hostile ne crée pas de contact : seuls les détecteurs alliés comptent', () => {
    const hostileDetector = unit('h0', 'hostile', 'frigate_da', AT);
    const carrier = unit('c', 'friend', 'carrier', { col: 8, row: 7 });
    expect(detectionRate((seed) => mission([hostileDetector, carrier], { seed }), 500)).toBe(0);
  });
});

describe('veille : mer côtière (AB-22)', () => {
  it('relève à 70 % la détection d’un sous-marin hostile en mer côtière', () => {
    const submarine = hostile('submarine');
    const rate = detectionRate((seed) =>
      mission([friend(), submarine], { seed, terrain: 'coastal_sea' }),
    );
    expect(rate).toBeGreaterThan(0.65);
    expect(rate).toBeLessThan(0.75);
  });

  it('ne relève pas la détection d’une frégate en mer côtière', () => {
    const rate = detectionRate((seed) =>
      mission([friend(), hostile()], { seed, terrain: 'coastal_sea' }),
    );
    expect(rate).toBeGreaterThan(0.45);
    expect(rate).toBeLessThan(0.55);
  });

  it('ne relève pas la détection d’un sous-marin en haute mer', () => {
    const rate = detectionRate((seed) => mission([friend(), hostile('submarine')], { seed }));
    expect(rate).toBeLessThan(0.55);
  });
});

describe('veille : bruit du balayage (AB-33)', () => {
  /** Navire hostile qui a fait un balayage au cycle donné. */
  function sweeper(shipClass: ShipClass, sweptAt: number): Unit {
    return { ...hostile(shipClass), lastSpecialActionCycle: { sweep: sweptAt } };
  }

  it('relève de 50 à 70 % la détection d’une frégate qui a balayé pendant le cycle', () => {
    const rate = detectionRate((seed) => mission([friend(), sweeper('frigate_asm', 1)], { seed }));
    expect(rate).toBeGreaterThan(0.65);
    expect(rate).toBeLessThan(0.75);
  });

  it('ne relève pas la détection d’un balayage fait un cycle plus tôt', () => {
    const rate = detectionRate((seed) =>
      mission([friend(), sweeper('frigate_asm', 1)], { seed, cycle: 2 }),
    );
    expect(rate).toBeGreaterThan(0.45);
    expect(rate).toBeLessThan(0.55);
  });

  it('se cumule avec le bonus côtier du sous-marin : 50 + 20 + 20 = 90 %', () => {
    const rate = detectionRate((seed) =>
      mission([friend(), sweeper('submarine', 1)], { seed, terrain: 'coastal_sea' }),
    );
    expect(rate).toBeGreaterThan(0.85);
    expect(rate).toBeLessThan(0.95);
  });

  it('ne change rien pour un sous-marin en haute mer qui n’a pas balayé', () => {
    const rate = detectionRate((seed) => mission([friend(), hostile('submarine')], { seed }));
    expect(rate).toBeLessThan(0.55);
  });
});

describe('veille : capteurs dégradés (SF-01 §4)', () => {
  it('réduit la portée de veille des alliés : une cible à la portée normale n’est plus détectée', () => {
    expect(DEGRADED_WATCH).toBeLessThan(WATCH);
    const atNormalRange = hostile('frigate_asm', { col: AT.col + WATCH, row: 7 });
    const build = (seed: number) =>
      mission([friend(), atNormalRange], { seed, constraints: ['degraded_sensors'] });
    expect(detectionRate(build, 500)).toBe(0);
  });

  it('garde une cible adjacente détectable à 50 %', () => {
    const adjacent = hostile('frigate_asm', { col: 8, row: 7 });
    const rate = detectionRate((seed) =>
      mission([friend(), adjacent], { seed, constraints: ['degraded_sensors'] }),
    );
    expect(rate).toBeGreaterThan(0.45);
    expect(rate).toBeLessThan(0.55);
  });
});

describe('veille : contacts (AB-18, AB-21)', () => {
  /** Mission où la détection est sûre : sous-marin hostile côtier face à plusieurs détecteurs. */
  function sureDetection(units: Unit[], seed = 1): MissionState {
    return mission(units, { seed, terrain: 'coastal_sea' });
  }

  it('crée un contact par cible détectée, numéroté à partir de 1, avec un événement', () => {
    let state = sureDetection([
      friend(),
      friend('frigate_asm', { col: 8, row: 8 }),
      hostile('submarine'),
    ]);
    for (let seed = 1; state.friendContacts.length === 0 && seed < 100; seed++) {
      state = resolveWatch(
        sureDetection([friend(), hostile('submarine')], seed),
        defaultConfig,
      ).state;
    }
    expect(state.friendContacts.map((c) => c.id)).toEqual(['C-1']);
    expect(state.nextContactNumber).toBe(2);
  });

  it('une cible vue par deux détecteurs ne donne qu’un contact et une zone', () => {
    const detectors = [friend(), friend('frigate_asm', { col: 8, row: 8 })].map((u, i) => ({
      ...u,
      id: `f${i}`,
    }));
    for (let seed = 1; seed <= 300; seed++) {
      const result = resolveWatch(
        sureDetection([...detectors, hostile('submarine', { col: 8, row: 7 })], seed),
        defaultConfig,
      );
      expect(result.state.friendContacts.length).toBeLessThanOrEqual(1);
      expect(result.events.length).toBe(result.state.friendContacts.length);
    }
  });

  it('numérote sans réutiliser les identifiants et crée un contact par cible', () => {
    const targets = [
      unit('h1', 'hostile', 'submarine', { col: 8, row: 7 }),
      unit('h2', 'hostile', 'submarine', { col: 6, row: 7 }),
    ];
    let found = false;
    for (let seed = 1; seed <= 300 && !found; seed++) {
      const state = resolveWatch(sureDetection([friend(), ...targets], seed), defaultConfig).state;
      if (state.friendContacts.length === 2) {
        expect(state.friendContacts.map((c) => c.id)).toEqual(['C-1', 'C-2']);
        expect(state.nextContactNumber).toBe(3);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it('un contact de zone contient la cible, jamais ne la désigne, et porte le cycle de détection', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const target = hostile('submarine', { col: 8, row: 7 });
      const result = resolveWatch(sureDetection([friend(), target], seed), defaultConfig);
      for (const contact of result.state.friendContacts) {
        expect(contact.cycle).toBe(1);
        expect(contact.kind).toBe('suspect');
        expect(contactHexes(contact).some((h) => h.col === 8 && h.row === 7)).toBe(true);
      }
    }
  });

  it("n'écrit aucune information cachée dans l'événement ni dans la projection : ni cible, ni classe, ni détecteur", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const result = resolveWatch(
        sureDetection([friend(), hostile('submarine', { col: 8, row: 7 })], seed),
        defaultConfig,
      );
      const text = JSON.stringify([result.events, observeFriend(result.state).contacts]);
      expect(text).not.toContain('hostile');
      expect(text).not.toContain('h1');
      expect(text).not.toContain('f1');
      expect(text).not.toContain('submarine');
      expect(text).not.toContain('frigate');
    }
  });

  it('expire les contacts détectés avant ce cycle et garde ceux du cycle', () => {
    const old: Contact = suspect('C-1', 1, [{ col: 1, row: 1 }]);
    const recent: Contact = suspect('C-2', 2, [{ col: 2, row: 2 }]);
    const state = resolveWatch(
      mission([friend()], { cycle: 2, contacts: [old, recent] }),
      defaultConfig,
    ).state;
    expect(state.friendContacts.map((c) => c.id)).toEqual(['C-2']);
  });

  it('un contact reste visible jusqu’à la fin du cycle suivant sa détection', () => {
    const detectedAt1: Contact = suspect('C-1', 1, [{ col: 1, row: 1 }]);
    const endOfCycle1 = resolveWatch(
      mission([friend()], { cycle: 1, contacts: [detectedAt1] }),
      defaultConfig,
    ).state;
    expect(endOfCycle1.friendContacts.map((c) => c.id)).toEqual(['C-1']);
    const endOfCycle2 = resolveWatch({ ...endOfCycle1, cycle: 2 }, defaultConfig).state;
    expect(endOfCycle2.friendContacts).toEqual([]);
  });

  it('une nouvelle détection crée un nouveau contact, sans actualiser le précédent (AB-18)', () => {
    const previous: Contact = suspect('C-1', 1, [{ col: 1, row: 1 }]);
    for (let seed = 1; seed <= 300; seed++) {
      const state = resolveWatch(
        mission([friend(), hostile('submarine', { col: 8, row: 7 })], {
          seed,
          cycle: 2,
          terrain: 'coastal_sea',
          contacts: [previous],
        }),
        defaultConfig,
      ).state;
      if (state.friendContacts.length > 0) {
        // C-1 (cycle 1) expire à la fin du cycle 2 ; le nouveau contact a un nouvel identifiant.
        expect(state.friendContacts.map((c) => [c.id, c.cycle])).toEqual([['C-2', 2]]);
        return;
      }
    }
    throw new Error('aucune détection obtenue');
  });
});

describe('veille : hasard conservé (AB-24)', () => {
  it('est reproductible et fait avancer l’état du générateur', () => {
    const start = mission([friend(), hostile()], { seed: 4 });
    const a = resolveWatch(start, defaultConfig);
    const b = resolveWatch(start, defaultConfig);
    expect(a).toEqual(b);
    expect(a.state.rngState).not.toBe(start.rngState);
  });

  it("reprend la même suite après une sauvegarde : l'état conservé donne les mêmes résultats", () => {
    const start = mission([friend(), hostile()], { seed: 4 });
    const first = resolveWatch(start, defaultConfig).state;
    const reloaded = JSON.parse(JSON.stringify(first)) as MissionState;
    expect(resolveWatch({ ...reloaded, cycle: 2 }, defaultConfig)).toEqual(
      resolveWatch({ ...first, cycle: 2 }, defaultConfig),
    );
  });

  it("ne tire rien quand aucune paire n'est éligible : l'état du générateur est inchangé", () => {
    const start = mission([friend(), hostile('frigate_asm', { col: 12, row: 7 })]);
    expect(resolveWatch(start, defaultConfig).state.rngState).toBe(start.rngState);
  });
});

/** Part des tirages où la veille donne au moins un contact au camp hostile (l'IA). */
function hostileDetectionRate(build: (seed: number) => MissionState, runs = 3000): number {
  let detected = 0;
  for (let seed = 1; seed <= runs; seed++) {
    if (resolveWatch(build(seed), defaultConfig).state.hostileContacts.length > 0) detected++;
  }
  return detected / runs;
}

describe('veille du camp hostile : mêmes règles que le joueur (AB-35)', () => {
  /** Détecteur hostile en `AT`, unité alliée à 2 hexagones (dans la portée de veille, même dégradée). */
  const target = (shipClass: ShipClass = 'frigate_da', patch: Partial<Unit> = {}): Unit => ({
    ...unit('f1', 'friend', shipClass, { col: 9, row: 7 }),
    ...patch,
  });
  const watcher = (): Unit => unit('h1', 'hostile', 'frigate_asm', AT);

  it('détecte à environ 50 % une unité alliée à portée, comme le joueur détecte un ennemi', () => {
    const rate = hostileDetectionRate((seed) => mission([watcher(), target()], { seed }));
    expect(rate).toBeGreaterThan(0.45);
    expect(rate).toBeLessThan(0.55);
  });

  it('crée un contact propre à l’IA, avec l’unité alliée pour cible interne, et rien pour le joueur', () => {
    // Le porte-avions n'a pas de capteurs : il ne détecte pas l'ennemi, seul l'ennemi le détecte.
    const carrier = target('carrier');
    for (let seed = 1; seed <= 100; seed++) {
      const result = resolveWatch(mission([watcher(), carrier], { seed }), defaultConfig);
      for (const contact of result.state.hostileContacts) {
        expect(contact).toMatchObject({ kind: 'suspect', cycle: 1, source: 'f1' });
      }
      // Le journal du joueur ne montre jamais ce que l'IA détecte (SF-06 §2, SF-07 §3).
      expect(result.events).toEqual([]);
      expect(result.state.friendContacts).toEqual([]);
    }
  });

  it('détecte aussi le porte-avions allié', () => {
    const rate = hostileDetectionRate((seed) => mission([watcher(), target('carrier')], { seed }));
    expect(rate).toBeGreaterThan(0.45);
    expect(rate).toBeLessThan(0.55);
  });

  it('relève de 50 à 70 % la détection d’une unité alliée qui a balayé pendant le cycle (bruit)', () => {
    const rate = hostileDetectionRate((seed) =>
      mission([watcher(), target('frigate_da', { lastSpecialActionCycle: { sweep: 1 } })], {
        seed,
      }),
    );
    expect(rate).toBeGreaterThan(0.65);
    expect(rate).toBeLessThan(0.75);
  });

  it('relève de 50 à 70 % la détection d’un sous-marin allié en mer côtière', () => {
    const rate = hostileDetectionRate((seed) =>
      mission([watcher(), target('submarine')], { seed, terrain: 'coastal_sea' }),
    );
    expect(rate).toBeGreaterThan(0.65);
    expect(rate).toBeLessThan(0.75);
  });

  it('ne subit pas « Capteurs dégradés », propre au joueur (AB-36)', () => {
    // Cible à la portée normale, hors de la portée dégradée : elle reste détectable à 50 %.
    const atNormalRange = target('frigate_da', { position: { col: AT.col + WATCH, row: 7 } });
    const rate = hostileDetectionRate((seed) =>
      mission([watcher(), atNormalRange], { seed, constraints: ['degraded_sensors'] }),
    );
    expect(rate).toBeGreaterThan(0.45);
    expect(rate).toBeLessThan(0.55);
  });

  it('numérote ses contacts à part : C-1 même si le joueur en est à C-5', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const state = resolveWatch(
        { ...mission([watcher(), target()], { seed }), nextContactNumber: 5 },
        defaultConfig,
      ).state;
      if (state.hostileContacts.length === 0) continue;
      expect(state.hostileContacts.map((c) => c.id)).toEqual(['C-1']);
      expect(state.nextHostileContactNumber).toBe(2);
      expect(state.nextContactNumber).toBe(5);
      return;
    }
    throw new Error('aucune détection sur 200 graines');
  });

  it('applique la même expiration : un contact de l’IA détecté avant ce cycle disparaît', () => {
    const old: Contact = { kind: 'suspect', id: 'C-1', cycle: 1, zone: [AT], source: 'f1' };
    const state = resolveWatch(
      {
        ...mission([watcher()], { cycle: 2 }),
        hostileContacts: [old],
        nextHostileContactNumber: 2,
      },
      defaultConfig,
    ).state;
    expect(state.hostileContacts).toEqual([]);
  });

  it('ne change pas les tirages du joueur : le camp ami tire d’abord', () => {
    // Un porte-avions allié n'est pas un détecteur : il n'ajoute des tirages que côté hostile.
    for (let seed = 1; seed <= 100; seed++) {
      const alone = resolveWatch(mission([friend(), hostile()], { seed }), defaultConfig).state;
      const carrier = unit('c', 'friend', 'carrier', { col: 8, row: 8 });
      const withCarrier = resolveWatch(
        mission([friend(), hostile(), carrier], { seed }),
        defaultConfig,
      ).state;
      expect(withCarrier.friendContacts).toEqual(alone.friendContacts);
    }
  });
});
