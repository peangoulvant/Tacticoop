import * as engine from '../../engine';
import { SAVE_SCHEMA_VERSION, SaveErrorCode, parseSave, serializeSave } from './saveFormat';

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
      save.schemaVersion = 2;
    });
    expect(result).toMatchObject({ ok: false, code: SaveErrorCode.UNSUPPORTED_VERSION });
    expect(result.ok ? '' : result.detail).toMatch(/version 2/);
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

  it('refuse un ordre du porte-avions inconnu dans le journal', () => {
    const result = parseTampered('escort', (s) => {
      const index = s.events.findIndex((e: { type: string }) => e.type === 'CARRIER_ORDERED');
      s.events[index].order = { kind: 'foncer' };
    });
    expectInvalidData(result, /du journal invalide/);
  });
});
