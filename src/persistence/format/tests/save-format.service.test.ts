import * as engine from '../../../engine';
import {
  SAVE_SCHEMA_VERSION,
  SaveErrorCode,
  parseSave,
  serializeSave,
} from '../save-format.service';

/** Joue une mission avec le moteur, comme l'application : lancement, déplacement, ordre, cycle. */
function playedMission(mission: engine.MissionKind): {
  state: engine.MissionState;
  events: engine.GameEvent[];
} {
  let current: engine.GameState = { status: 'preparation', setup: engine.initialSetup() };
  const events: engine.GameEvent[] = [];
  function run(command: engine.GameCommand): void {
    const result = engine.executeCommand(current, command, engine.defaultConfig);
    if (!result.ok) throw new Error(result.error.message);
    current = result.state;
    events.push(...result.events);
  }
  function missionInProgress(): engine.MissionState {
    if (current.status !== 'in_progress') throw new Error('mission non en cours');
    return current;
  }
  run({ type: 'SELECT_MISSION', mission });
  run({ type: 'ADD_SHIP', shipClass: 'fremm' });
  run({ type: 'ADD_SHIP', shipClass: 'submarine' });
  run({ type: 'LAUNCH_MISSION', seed: 11 });
  const unit = missionInProgress().units.find((u) => u.shipClass === 'fremm')!;
  const [destination] = engine.reachableHexes(missionInProgress(), unit, engine.defaultConfig);
  run({ type: 'MOVE_UNIT', unitId: unit.id, destination: destination! });
  run({ type: 'END_ACTIVATION', unitId: unit.id });
  if (mission === 'escort') {
    run({ type: 'ORDER_CARRIER', order: { kind: engine.CarrierOrderKind.STOP } });
  }
  run({ type: 'END_CYCLE_EARLY' });
  return { state: missionInProgress(), events };
}

const SAVED_AT = new Date('2026-11-06T12:00:00.000Z');

/** Sauvegarde valide, modifiée par `mutate`, puis relue. */
// `any` assumé : les tests altèrent volontairement un JSON de forme quelconque pour provoquer un refus.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TamperedSave = any;

function parseTampered(mission: engine.MissionKind, mutate: (save: TamperedSave) => void) {
  const { state, events } = playedMission(mission);
  const save = JSON.parse(serializeSave(state, events, SAVED_AT));
  mutate(save);
  return parseSave(JSON.stringify(save));
}

function expectInvalidData(result: ReturnType<typeof parseSave>, detail: RegExp): void {
  expect(result).toMatchObject({ ok: false, code: SaveErrorCode.INVALID_DATA });
  expect(result.ok ? '' : result.detail).toMatch(detail);
}

describe('aller-retour', () => {
  it.each(['escort', 'naval_combat'] as const)(
    'relit exactement une mission %s jouée : état et journal',
    (mission) => {
      const { state, events } = playedMission(mission);
      const result = parseSave(serializeSave(state, events, SAVED_AT));
      expect(result).toEqual({
        ok: true,
        save: {
          schemaVersion: SAVE_SCHEMA_VERSION,
          savedAt: SAVED_AT.toISOString(),
          state,
          events,
        },
      });
    },
  );

  it.each<engine.MissionKind>(['naval_combat', 'escort'])(
    'conserve la force ennemie cachée dans la sauvegarde (%s)',
    (mission) => {
      const { state, events } = playedMission(mission);
      const result = parseSave(serializeSave(state, events, SAVED_AT));
      const hostiles = (result.ok ? result.save.state.units : []).filter(
        (u) => u.side === 'hostile',
      );
      expect(hostiles).toHaveLength(3);
      expect(hostiles).toEqual(state.units.filter((u) => u.side === 'hostile'));
    },
  );

  it('relit une mission gagnée', () => {
    const { state, events } = playedMission('escort');
    const won: engine.MissionState = { ...state, outcome: 'victory' };
    const result = parseSave(serializeSave(won, events, SAVED_AT));
    expect(result.ok && result.save.state.outcome).toBe('victory');
  });

  it("le moteur reprend la partie relue comme l'original", () => {
    const { state, events } = playedMission('escort');
    const result = parseSave(serializeSave(state, events, SAVED_AT));
    if (!result.ok) throw new Error(result.detail);
    const command: engine.GameCommand = { type: 'END_CYCLE_EARLY' };
    expect(engine.executeCommand(result.save.state, command, engine.defaultConfig)).toEqual(
      engine.executeCommand(state, command, engine.defaultConfig),
    );
  });
});

describe('refus du contenu illisible ou de version inconnue', () => {
  it("refuse un texte qui n'est pas du JSON", () => {
    expect(parseSave('{pas du json')).toMatchObject({
      ok: false,
      code: SaveErrorCode.INVALID_JSON,
    });
  });

  it.each(['[]', 'null', '12', '"texte"'])(
    "refuse un JSON qui n'est pas une sauvegarde : %s",
    (json) => {
      expect(parseSave(json)).toMatchObject({ ok: false, code: SaveErrorCode.INVALID_DATA });
    },
  );

  it('refuse une version inconnue, avec son numéro', () => {
    const result = parseTampered('escort', (save) => {
      save.schemaVersion = 7;
    });
    expect(result).toMatchObject({ ok: false, code: SaveErrorCode.UNSUPPORTED_VERSION });
    expect(result.ok ? '' : result.detail).toMatch(/version 7/);
  });

  it('refuse une sauvegarde sans version', () => {
    const result = parseTampered('escort', (save) => {
      delete save.schemaVersion;
    });
    expect(result).toMatchObject({ ok: false, code: SaveErrorCode.UNSUPPORTED_VERSION });
  });
});

describe("refus d'un état incohérent", () => {
  it('refuse une date de sauvegarde invalide', () => {
    expectInvalidData(
      parseTampered('escort', (s) => (s.savedAt = 'hier')),
      /date/,
    );
  });

  it('refuse une préparation : seule une mission en cours se sauvegarde', () => {
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.status = 'preparation')),
      /mission en cours/,
    );
  });

  it('refuse une mission, une difficulté ou une contrainte inconnues', () => {
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.setup.mission = 'peche')),
      /mission inconnue/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.setup.difficulty = 'facile')),
      /difficulté/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.setup.constraints = ['brouillard'])),
      /contrainte inconnue/,
    );
  });

  it('refuse des contraintes en double ou trop nombreuses', () => {
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.setup.constraints = ['bad_weather', 'bad_weather'])),
      /en double/,
    );
    expectInvalidData(
      parseTampered(
        'escort',
        (s) => (s.state.setup.constraints = ['bad_weather', 'limited_ammo', 'limited_means']),
      ),
      /trop de contraintes/,
    );
  });

  it('refuse un tableau de terrains tronqué ou un terrain inconnu', () => {
    expectInvalidData(
      parseTampered('escort', (s) => s.state.map.terrain.pop()),
      /taille inattendue/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.map.terrain[3] = 'lave')),
      /terrain inconnu/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.map.width = 0)),
      /dimensions/,
    );
  });

  it('refuse un cycle invalide ou une issue inconnue', () => {
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.cycle = 0)),
      /cycle/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.outcome = 'defeat')),
      /issue/,
    );
  });

  it('refuse un point de départ ou d’arrivée incohérent', () => {
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.start = { col: 99, row: 0 })),
      /départ/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.goal = null)),
      /arrivée/,
    );
    expectInvalidData(
      parseTampered('naval_combat', (s) => (s.state.goal = { col: 1, row: 1 })),
      /arrivée/,
    );
  });

  it('refuse une unité hors carte, inconnue, ou aux valeurs invalides', () => {
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.units[1].position = { col: 80, row: 2 })),
      /hors de la carte/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.units[1].shipClass = 'croiseur')),
      /classe de bâtiment inconnue/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.units[1].side = 'neutre')),
      /camp inconnu/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.units[1].hp = -5)),
      /valeurs numériques/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.units[1].activation = 'repos')),
      /activation/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.units[1].hasMoved = 'oui')),
      /déplacement/,
    );
  });

  it('refuse des identifiants ou des cases en double', () => {
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.units[2].id = s.state.units[1].id)),
      /identifiants/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.units[2].position = s.state.units[1].position)),
      /même case/,
    );
  });

  it('refuse une escorte sans porte-avions, ou un porte-avions hors escorte', () => {
    expectInvalidData(
      parseTampered('escort', (s) => s.state.units.shift()),
      /porte-avions incohérent/,
    );
    expectInvalidData(
      parseTampered('naval_combat', (s) => (s.state.units[0].shipClass = 'carrier')),
      /porte-avions incohérent/,
    );
  });

  it('refuse une activation en cours : la sauvegarde serait incomplète', () => {
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.units[1].activation = 'in_progress')),
      /incomplète/,
    );
  });

  it('refuse une navigation du porte-avions incohérente', () => {
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.carrierNavigation = null)),
      /absente/,
    );
    expectInvalidData(
      parseTampered(
        'naval_combat',
        (s) => (s.state.carrierNavigation = { mode: 'stop', waypoint: null, orderUsed: false }),
      ),
      /hors escorte/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.carrierNavigation.mode = 'reroute')),
      /mode de navigation/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.carrierNavigation.orderUsed = 'non')),
      /quota/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.state.carrierNavigation.waypoint = { col: 90, row: 1 })),
      /point de passage/,
    );
  });
});

describe('refus d’un journal invalide', () => {
  it('refuse un journal absent ou qui n’est pas une liste', () => {
    expectInvalidData(
      parseTampered('escort', (s) => (s.events = {})),
      /journal/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => delete s.events),
      /journal/,
    );
  });

  it('refuse un événement de type inconnu ou incomplet, en indiquant son rang', () => {
    expectInvalidData(
      parseTampered('escort', (s) => (s.events[1] = { type: 'EXPLOSION', cycle: 1 })),
      /événement 2/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => delete s.events[0].cycle),
      /événement 1/,
    );
    expectInvalidData(
      parseTampered('escort', (s) => (s.events[2] = 'texte')),
      /événement 3/,
    );
  });

  it('accepte un déplacement interrompu dans le journal, et refuse une valeur invalide du drapeau', () => {
    const index = (s: TamperedSave) =>
      s.events.findIndex((e: { type: string }) => e.type === 'UNIT_MOVED');
    const interrupted = parseTampered('escort', (s) => (s.events[index(s)].interrupted = true));
    expect(interrupted.ok).toBe(true);
    for (const invalid of [false, 'oui', 1]) {
      expectInvalidData(
        parseTampered('escort', (s) => (s.events[index(s)].interrupted = invalid)),
        /du journal invalide/,
      );
    }
  });

  it('refuse un ordre du porte-avions inconnu dans le journal', () => {
    const result = parseTampered('escort', (s) => {
      const index = s.events.findIndex((e: { type: string }) => e.type === 'CARRIER_ORDERED');
      s.events[index].order = { kind: 'foncer' };
    });
    expectInvalidData(result, /du journal invalide/);
  });
});

/** Identifiant d'un navire hostile de la sauvegarde, cible interne des contacts d'essai. */
function hostileId(save: TamperedSave): string {
  return save.state.units.find((u: { side: string }) => u.side === 'hostile').id;
}

/** Contact suspect valide de la sauvegarde, modifié par `patch`. */
function validContact(save: TamperedSave, patch: object = {}) {
  return {
    kind: 'suspect',
    id: 'C-1',
    cycle: 1,
    zone: [{ col: 3, row: 3 }],
    source: hostileId(save),
    ...patch,
  };
}

describe('contacts et état du hasard (version 2)', () => {
  it('relit une mission avec contacts, compteur et état du générateur', () => {
    let expected: unknown;
    const result = parseTampered('naval_combat', (s) => {
      expected = validContact(s);
      s.state.friendContacts = [expected];
      s.state.nextContactNumber = 2;
    });
    expect(result.ok && result.save.state.friendContacts).toEqual([expected]);
  });

  it('relit un événement de contact', () => {
    const result = parseTampered('naval_combat', (s) => {
      s.events.push({
        type: 'CONTACT_DETECTED',
        contactId: 'C-1',
        cycle: 1,
        zone: [{ col: 3, row: 3 }],
      });
    });
    expect(result.ok).toBe(true);
  });

  it.each([
    [
      'un identifiant mal formé',
      (s: TamperedSave) => (s.state.friendContacts = [validContact(s, { id: 'X-1' })]),
      /identifiant de contact/,
    ],
    [
      'un cycle futur',
      (s: TamperedSave) => (s.state.friendContacts = [validContact(s, { cycle: 999 })]),
      /cycle invalide/,
    ],
    [
      'une zone hors de la carte',
      (s: TamperedSave) =>
        (s.state.friendContacts = [validContact(s, { zone: [{ col: 999, row: 0 }] })]),
      /zone invalide/,
    ],
    [
      'une zone vide',
      (s: TamperedSave) => (s.state.friendContacts = [validContact(s, { zone: [] })]),
      /zone invalide/,
    ],
    [
      'une zone de plus de 7 hexagones',
      (s: TamperedSave) =>
        (s.state.friendContacts = [
          validContact(s, { zone: Array.from({ length: 8 }, (_, col) => ({ col, row: 0 })) }),
        ]),
      /zone invalide/,
    ],
    [
      'des identifiants en double',
      (s: TamperedSave) => (s.state.friendContacts = [validContact(s), validContact(s)]),
      /en double/,
    ],
    [
      'des contacts illisibles',
      (s: TamperedSave) => (s.state.friendContacts = 'aucun'),
      /contacts illisibles/,
    ],
    [
      'un compteur invalide',
      (s: TamperedSave) => (s.state.nextContactNumber = 0),
      /compteur de contacts/,
    ],
    ['un état du hasard négatif', (s: TamperedSave) => (s.state.rngState = -1), /état du hasard/],
    [
      'un état du hasard trop grand',
      (s: TamperedSave) => (s.state.rngState = 2 ** 32),
      /état du hasard/,
    ],
    ['un état du hasard absent', (s: TamperedSave) => delete s.state.rngState, /état du hasard/],
  ])('refuse %s', (_name, mutate, detail) => {
    expectInvalidData(parseTampered('naval_combat', mutate), detail);
  });

  it('refuse un événement de contact incomplet ou mal formé', () => {
    expectInvalidData(
      parseTampered('naval_combat', (s) => s.events.push({ type: 'CONTACT_DETECTED', cycle: 1 })),
      /événement \d+ du journal invalide/,
    );
    expectInvalidData(
      parseTampered('naval_combat', (s) =>
        s.events.push({ type: 'CONTACT_DETECTED', contactId: 'C-1', cycle: 1, zone: [] }),
      ),
      /événement \d+ du journal invalide/,
    );
  });

  it.each([1, 2])(
    'refuse une sauvegarde de version %i, sans migration (AB-08, AB-24, AB-30)',
    (version) => {
      const result = parseTampered('escort', (s) => {
        s.schemaVersion = version;
      });
      expect(result).toMatchObject({ ok: false, code: SaveErrorCode.UNSUPPORTED_VERSION });
    },
  );
});

/**
 * Mission jouée jusqu'à un balayage menée près d'un navire hostile, puis l'activation
 * terminée : une sauvegarde ne se fait qu'entre deux séquences complètes.
 */
function searchedMission(): { state: engine.MissionState; events: engine.GameEvent[] } {
  const { state, events } = playedMission('naval_combat');
  const target = state.units.find((u) => u.side === 'hostile')!;
  const searcher = state.units.find((u) => u.side === 'friend' && u.activation === 'available')!;
  const position = { col: target.position.col - 1, row: target.position.row };
  const placed = state.units.map((u) => (u.id === searcher.id ? { ...u, position } : u));
  // Recherche sûre : le test porte sur la sauvegarde, pas sur le tirage.
  const detection = { ...engine.defaultConfig.ships.fremm.detection!, sweepProbability: 1 };
  const config: engine.GameConfig = {
    ...engine.defaultConfig,
    ships: {
      ...engine.defaultConfig.ships,
      fremm: { ...engine.defaultConfig.ships.fremm, detection },
      submarine: { ...engine.defaultConfig.ships.submarine, detection },
    },
  };
  let current: engine.GameState = { ...state, units: placed };
  const produced: engine.GameEvent[] = [];
  for (const command of [
    { type: 'SWEEP', unitId: searcher.id },
    { type: 'END_ACTIVATION', unitId: searcher.id },
  ] satisfies engine.GameCommand[]) {
    const result = engine.executeCommand(current, command, config);
    if (!result.ok) throw new Error(result.error.message);
    current = result.state;
    produced.push(...result.events);
  }
  if (current.status !== 'in_progress') throw new Error('mission non en cours');
  return { state: current, events: [...events, ...produced] };
}

describe('balayage (version 3) et délai de récupération (version 4)', () => {
  const identified = (s: TamperedSave, patch: object = {}) => ({
    kind: 'identified',
    id: 'C-1',
    cycle: 1,
    targetType: 'frigate',
    position: { col: 4, row: 4 },
    source: hostileId(s),
    ...patch,
  });

  it("aller-retour d'une mission où un balayage a eu lieu", () => {
    const { state, events } = searchedMission();
    const result = parseSave(serializeSave(state, events, SAVED_AT));
    expect(result).toMatchObject({ ok: true, save: { schemaVersion: 6 } });
    expect(result.ok && result.save.state).toEqual(state);
    expect(events.some((e) => e.type === 'SWEEP_PERFORMED')).toBe(true);
    expect(state.friendContacts.some((c) => c.kind === 'identified')).toBe(true);
  });

  it('le journal sauvegardé ne contient aucune cible (non-divulgation, AB-26, AB-28)', () => {
    const { state, events } = searchedMission();
    const saved = JSON.parse(serializeSave(state, events, SAVED_AT));
    const text = JSON.stringify(saved.events);
    expect(text).not.toContain('source');
    for (const unit of state.units.filter((u) => u.side === 'hostile')) {
      expect(text).not.toContain(unit.id);
    }
  });

  it('relit un contact identifié et un événement de recherche, avec ou sans résultat', () => {
    const result = parseTampered('naval_combat', (s) => {
      s.state.friendContacts = [identified(s)];
      s.state.nextContactNumber = 2;
      s.events.push(
        {
          type: 'SWEEP_PERFORMED',
          cycle: 1,
          unitId: 'x',
          shipClass: 'fremm',
          identified: [],
        },
        {
          type: 'SWEEP_PERFORMED',
          cycle: 1,
          unitId: 'x',
          shipClass: 'fremm',
          identified: [{ contactId: 'C-1', targetType: 'frigate', position: { col: 4, row: 4 } }],
        },
      );
    });
    expect(result.ok).toBe(true);
  });

  it.each([
    [
      'une forme de contact inconnue',
      (s: TamperedSave) => (s.state.friendContacts = [identified(s, { kind: 'autre' })]),
      /forme inconnue/,
    ],
    [
      'un type de navire inconnu',
      (s: TamperedSave) => (s.state.friendContacts = [identified(s, { targetType: 'fremm' })]),
      /identification invalide/,
    ],
    [
      'une position hors de la carte',
      (s: TamperedSave) =>
        (s.state.friendContacts = [identified(s, { position: { col: 999, row: 0 } })]),
      /identification invalide/,
    ],
    [
      'une cible inconnue',
      (s: TamperedSave) => (s.state.friendContacts = [identified(s, { source: 'fantome' })]),
      /cible de contact/,
    ],
    [
      'une cible alliée',
      (s: TamperedSave) =>
        (s.state.friendContacts = [
          identified(s, {
            source: s.state.units.find((u: { side: string }) => u.side === 'friend').id,
          }),
        ]),
      /cible de contact/,
    ],
    [
      'une cible absente',
      (s: TamperedSave) => (s.state.friendContacts = [identified(s, { source: undefined })]),
      /cible de contact/,
    ],
    [
      'deux contacts identifiés pour un même navire',
      (s: TamperedSave) => (s.state.friendContacts = [identified(s), identified(s, { id: 'C-2' })]),
      /même navire/,
    ],
    [
      'une action spéciale illisible',
      (s: TamperedSave) => (s.state.units[1].specialActionUsed = 'oui'),
      /action spéciale/,
    ],
    [
      'une action spéciale absente',
      (s: TamperedSave) => delete s.state.units[1].specialActionUsed,
      /action spéciale/,
    ],
  ])('refuse %s', (_name, mutate, detail) => {
    expectInvalidData(parseTampered('naval_combat', mutate), detail);
  });

  it.each([
    ['sans unité', { unitId: undefined }],
    ['avec une classe inconnue', { shipClass: 'croiseur' }],
    ['avec un résultat non listé', { identified: 'aucun' }],
    [
      'avec un type inconnu',
      { identified: [{ contactId: 'C-1', targetType: 'fremm', position: { col: 1, row: 1 } }] },
    ],
    [
      'avec une position invalide',
      { identified: [{ contactId: 'C-1', targetType: 'frigate', position: { col: 'a', row: 1 } }] },
    ],
    [
      'avec un identifiant mal formé',
      { identified: [{ contactId: 'X', targetType: 'frigate', position: { col: 1, row: 1 } }] },
    ],
  ])('refuse un événement de balayage %s', (_name, patch) => {
    const event = {
      type: 'SWEEP_PERFORMED',
      cycle: 1,
      unitId: 'x',
      shipClass: 'fremm',
      identified: [],
      ...patch,
    };
    expectInvalidData(
      parseTampered('naval_combat', (s) => s.events.push(event)),
      /du journal invalide/,
    );
  });
});

/** Identifiant d'une unité alliée de la sauvegarde, cible interne des contacts de l'IA. */
function friendId(save: TamperedSave): string {
  return save.state.units.find((u: { side: string }) => u.side === 'friend').id;
}

describe('contacts du camp hostile (version 5)', () => {
  const aiContact = (s: TamperedSave, patch: object = {}) => ({
    kind: 'suspect',
    id: 'C-1',
    cycle: 1,
    zone: [{ col: 3, row: 3 }],
    source: friendId(s),
    ...patch,
  });

  it('relit une mission où l’IA a des contacts, séparés de ceux du joueur', () => {
    let expected: unknown;
    const result = parseTampered('naval_combat', (s) => {
      expected = aiContact(s);
      s.state.hostileContacts = [expected];
      s.state.nextHostileContactNumber = 2;
      // Le même identifiant peut exister dans les deux camps : la numérotation est propre à chacun.
      s.state.friendContacts = [validContact(s)];
      s.state.nextContactNumber = 2;
    });
    expect(result.ok && result.save.state.hostileContacts).toEqual([expected]);
  });

  it.each([
    [
      'une cible hostile pour un contact de l’IA',
      (s: TamperedSave) => (s.state.hostileContacts = [aiContact(s, { source: hostileId(s) })]),
      /cible de contact/,
    ],
    [
      'une cible alliée pour un contact du joueur',
      (s: TamperedSave) => (s.state.friendContacts = [validContact(s, { source: friendId(s) })]),
      /cible de contact/,
    ],
    [
      'une cible inconnue pour un contact de l’IA',
      (s: TamperedSave) => (s.state.hostileContacts = [aiContact(s, { source: 'fantome' })]),
      /cible de contact/,
    ],
    [
      'des contacts de l’IA absents',
      (s: TamperedSave) => delete s.state.hostileContacts,
      /contacts illisibles/,
    ],
    [
      'des identifiants en double chez l’IA',
      (s: TamperedSave) => (s.state.hostileContacts = [aiContact(s), aiContact(s)]),
      /en double/,
    ],
    [
      'un compteur de contacts de l’IA invalide',
      (s: TamperedSave) => (s.state.nextHostileContactNumber = 0),
      /compteur de contacts/,
    ],
    [
      'un type de navire inconnu',
      (s: TamperedSave) =>
        (s.state.hostileContacts = [
          {
            kind: 'identified',
            id: 'C-1',
            cycle: 1,
            targetType: 'croiseur',
            position: { col: 1, row: 1 },
            source: friendId(s),
          },
        ]),
      /identification invalide/,
    ],
  ])('refuse %s', (_name, mutate, detail) => {
    expectInvalidData(parseTampered('naval_combat', mutate), detail);
  });

  it('accepte le porte-avions comme type identifié par l’IA', () => {
    const result = parseTampered('escort', (s) => {
      const carrier = s.state.units.find((u: { shipClass: string }) => u.shipClass === 'carrier');
      s.state.hostileContacts = [
        {
          kind: 'identified',
          id: 'C-1',
          cycle: 1,
          targetType: 'carrier',
          position: carrier.position,
          source: carrier.id,
        },
      ];
      s.state.nextHostileContactNumber = 2;
    });
    expect(result.ok).toBe(true);
  });
});
