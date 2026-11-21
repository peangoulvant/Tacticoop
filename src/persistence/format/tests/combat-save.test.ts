import * as engine from '../../../engine';
import { SaveErrorCode, parseSave, serializeSave } from '../save-format.service';

/*
 * Sauvegarde des projectiles, des pertes et des événements de combat (schemaVersion 7, AB-47 à
 * AB-49) : aller-retour fidèle, et refus d'un contenu incohérent.
 */

const SAVED_AT = new Date('2026-11-17T12:00:00.000Z');

/** Lance une mission de lutte navale, puis y pose un projectile en vol et une perte. */
function combatMission(): engine.MissionState {
  let current: engine.GameState = { status: 'preparation', setup: engine.initialSetup() };
  for (const command of [
    { type: 'SELECT_MISSION', mission: 'naval_combat' },
    { type: 'ADD_SHIP', shipClass: 'fremm' },
    { type: 'ADD_SHIP', shipClass: 'submarine' },
    { type: 'LAUNCH_MISSION', seed: 5 },
  ] as engine.GameCommand[]) {
    const result = engine.executeCommand(current, command, engine.defaultConfig);
    if (!result.ok) throw new Error(result.error.message);
    current = result.state;
  }
  if (current.status !== 'in_progress') throw new Error('mission non lancée');
  const projectile: engine.Projectile = {
    id: 'P-3',
    launchNumber: 3,
    weapon: 'torpedo',
    side: 'hostile',
    launcherId: 'detruit-1',
    launchCycle: 1,
    position: { col: 10, row: 10 },
    aimedHex: { col: 12, row: 10 },
    targetId: 'friend-fremm-1',
    onSuspectZone: false,
    route: [
      { col: 11, row: 10 },
      { col: 12, row: 10 },
    ],
    tracking: false,
    heading: { q: 1, r: 0 },
    autonomyLeft: 3,
    detected: true,
  };
  return {
    ...current,
    projectiles: [projectile],
    nextLaunchNumber: 4,
    losses: [{ unitId: 'detruit-1', side: 'hostile', shipClass: 'frigate_da', cycle: 1 }],
  };
}

type Tampered = any; // eslint-disable-line @typescript-eslint/no-explicit-any

function parseTampered(mutate: (save: Tampered) => void, events: engine.GameEvent[] = []) {
  const save = JSON.parse(serializeSave(combatMission(), events, SAVED_AT));
  mutate(save);
  return parseSave(JSON.stringify(save));
}

function expectInvalid(result: ReturnType<typeof parseSave>, detail: RegExp): void {
  expect(result).toMatchObject({ ok: false, code: SaveErrorCode.INVALID_DATA });
  expect(result.ok ? '' : result.detail).toMatch(detail);
}

describe('aller-retour du combat', () => {
  it('relit à l’identique les projectiles en vol et les pertes', () => {
    const state = combatMission();
    const result = parseSave(serializeSave(state, [], SAVED_AT));
    expect(result.ok && result.save.state).toEqual(state);
  });

  it('relit une mission perdue avec sa cause', () => {
    const lost: engine.MissionState = {
      ...combatMission(),
      outcome: 'defeat',
      outcomeCause: 'all_units_destroyed',
    };
    const result = parseSave(serializeSave(lost, [], SAVED_AT));
    expect(result.ok && [result.save.state.outcome, result.save.state.outcomeCause]).toEqual([
      'defeat',
      'all_units_destroyed',
    ]);
  });

  it('relit le journal du combat', () => {
    const events: engine.GameEvent[] = [
      {
        type: 'SHOT_FIRED',
        cycle: 1,
        unitId: 'a',
        shipClass: 'fremm',
        weapon: 'missile',
        contactId: 'C-1',
      },
      {
        type: 'SHOT_FIRED',
        cycle: 1,
        unitId: 'a',
        shipClass: 'fremm',
        weapon: 'torpedo',
        contactId: 'C-2',
        hex: { col: 3, row: 3 },
      },
      {
        type: 'PROJECTILE_DETECTED',
        cycle: 1,
        projectileId: 'P-2',
        weapon: 'torpedo',
        position: { col: 4, row: 4 },
      },
      {
        type: 'PROJECTILE_IMPACT',
        cycle: 1,
        projectileId: 'P-2',
        weapon: 'torpedo',
        result: 'destroyed',
        victim: { side: 'friend', unitId: 'a', shipClass: 'fremm' },
      },
      {
        type: 'PROJECTILE_IMPACT',
        cycle: 1,
        projectileId: 'P-1',
        weapon: 'missile',
        result: 'hit',
        victim: { side: 'hostile' },
      },
      { type: 'PROJECTILE_NEUTRALISED', cycle: 1, projectileId: 'P-1', weapon: 'missile' },
      { type: 'MISSION_LOST', cycle: 2, cause: 'carrier_destroyed' },
    ];
    const result = parseSave(serializeSave(combatMission(), events, SAVED_AT));
    expect(result.ok && result.save.events).toEqual(events);
  });

  it('accepte un contact dont la cible a été détruite depuis (zone de veille non expirée)', () => {
    const state = combatMission();
    const withContact: engine.MissionState = {
      ...state,
      hostileContacts: [],
      friendContacts: [
        { kind: 'suspect', id: 'C-1', cycle: 1, zone: [{ col: 20, row: 20 }], source: 'detruit-1' },
      ],
      nextContactNumber: 2,
    };
    expect(parseSave(serializeSave(withContact, [], SAVED_AT)).ok).toBe(true);
  });
});

describe('refus d’un combat incohérent', () => {
  it.each([
    ['une arme inconnue', (s: Tampered) => (s.state.projectiles[0].weapon = 'canon'), /arme/],
    ['un camp inconnu', (s: Tampered) => (s.state.projectiles[0].side = 'neutre'), /camp/],
    ['un identifiant altéré', (s: Tampered) => (s.state.projectiles[0].id = 'P-9'), /identifiant/],
    [
      'une trajectoire hors carte',
      (s: Tampered) => (s.state.projectiles[0].route = [{ col: 99, row: 0 }]),
      /trajectoire/,
    ],
    [
      'une position hors carte',
      (s: Tampered) => (s.state.projectiles[0].position = { col: 99, row: 0 }),
      /trajectoire/,
    ],
    [
      'un cap illisible',
      (s: Tampered) => (s.state.projectiles[0].heading = { q: 5, r: 0 }),
      /état invalide/,
    ],
    [
      'une autonomie négative',
      (s: Tampered) => (s.state.projectiles[0].autonomyLeft = -1),
      /état invalide/,
    ],
    [
      'un drapeau illisible',
      (s: Tampered) => (s.state.projectiles[0].detected = 'oui'),
      /état invalide/,
    ],
    [
      'un compteur de lancement dépassé',
      (s: Tampered) => (s.state.nextLaunchNumber = 3),
      /compteur/,
    ],
    ['un compteur nul', (s: Tampered) => (s.state.nextLaunchNumber = 0), /compteur/],
    ['des projectiles illisibles', (s: Tampered) => (s.state.projectiles = {}), /projectiles/],
    ['une perte illisible', (s: Tampered) => (s.state.losses = [{ unitId: 4 }]), /perte/],
    [
      'une perte en double',
      (s: Tampered) => s.state.losses.push({ ...s.state.losses[0] }),
      /double/,
    ],
  ])('refuse %s', (_name, mutate, detail) => {
    expectInvalid(parseTampered(mutate), detail);
  });

  it('refuse une perte dont l’unité est encore en jeu', () => {
    expectInvalid(
      parseTampered((s) => (s.state.losses[0].unitId = s.state.units[0].id)),
      /perte/,
    );
  });

  it('refuse un résultat sans cause, une cause sans résultat, ou une cause d’un autre résultat', () => {
    expectInvalid(
      parseTampered((s) => (s.state.outcome = 'victory')),
      /cause/,
    );
    expectInvalid(
      parseTampered((s) => (s.state.outcomeCause = 'carrier_arrived')),
      /cause/,
    );
    expectInvalid(
      parseTampered((s) => {
        s.state.outcome = 'defeat';
        s.state.outcomeCause = 'hostile_fleet_destroyed';
      }),
      /cause/,
    );
  });

  it('refuse un événement de combat altéré', () => {
    const bad: engine.GameEvent = {
      type: 'PROJECTILE_IMPACT',
      cycle: 1,
      projectileId: 'P-1',
      weapon: 'missile',
      result: 'hit',
      victim: { side: 'hostile' },
    };
    const tamper = (mutate: (e: Tampered) => void) =>
      parseTampered((s) => mutate(s.events[0]), [structuredClone(bad)]);
    expectInvalid(
      tamper((e) => (e.result = 'grazed')),
      /événement/,
    );
    expectInvalid(
      tamper((e) => (e.victim = { side: 'hostile', type: 'frigate' })),
      /événement/,
    );
    expectInvalid(
      tamper((e) => (e.victim = { side: 'friend' })),
      /événement/,
    );
    expectInvalid(
      tamper((e) => (e.projectileId = 'X-1')),
      /événement/,
    );
    expectInvalid(
      tamper((e) => (e.weapon = 'canon')),
      /événement/,
    );
  });

  it('refuse une fin de mission sans cause connue dans le journal', () => {
    const lost: engine.GameEvent = { type: 'MISSION_LOST', cycle: 1, cause: 'all_units_destroyed' };
    expectInvalid(
      parseTampered((s) => (s.events[0].cause = 'abandon'), [lost]),
      /événement/,
    );
  });
});

describe('cap d’une torpille : six directions voisines (AB-47)', () => {
  it.each([
    ['un cap nul (0, 0)', { q: 0, r: 0 }],
    ['un cap diagonal (1, 1)', { q: 1, r: 1 }],
    ['un cap diagonal (−1, −1)', { q: -1, r: -1 }],
    ['un cap non entier', { q: 0.5, r: 0 }],
  ])('refuse %s', (_name, heading) => {
    expectInvalid(
      parseTampered((s) => (s.state.projectiles[0].heading = heading)),
      /état invalide/,
    );
  });

  it('accepte chacune des six directions comme cap', () => {
    for (const direction of engine.AXIAL_DIRECTIONS) {
      const result = parseTampered((s) => (s.state.projectiles[0].heading = { ...direction }));
      expect(result.ok).toBe(true);
    }
  });
});

/** Fait du projectile de la sauvegarde un missile valide : ligne droite jusqu'à la case visée. */
function asMissile(p: Tampered): void {
  p.weapon = 'missile';
  p.heading = null;
  p.autonomyLeft = null;
  p.tracking = false;
  p.targetId = null;
}

describe('invariants des projectiles selon leur arme (AB-47)', () => {
  it('relit un missile valide', () => {
    expect(parseTampered((s) => asMissile(s.state.projectiles[0])).ok).toBe(true);
  });

  it.each([
    ['un cap', (p: Tampered) => (p.heading = { q: 1, r: 0 })],
    ['une autonomie', (p: Tampered) => (p.autonomyLeft = 3)],
    ['un autodirecteur', (p: Tampered) => ((p.tracking = true), (p.targetId = 'x'))],
    ['une cible désignée', (p: Tampered) => (p.targetId = 'friend-fremm-1')],
    ['aucun trajet restant', (p: Tampered) => (p.route = [])],
    [
      'une ligne qui n’arrive pas à la case visée',
      (p: Tampered) => (p.aimedHex = { col: 3, row: 3 }),
    ],
  ])('refuse un missile avec %s', (_name, mutate) => {
    expectInvalid(
      parseTampered((s) => {
        asMissile(s.state.projectiles[0]);
        mutate(s.state.projectiles[0]);
      }),
      /incohérent/,
    );
  });

  it.each([
    ['sans autonomie (null)', (p: Tampered) => (p.autonomyLeft = null)],
    ['avec une autonomie épuisée (0)', (p: Tampered) => (p.autonomyLeft = 0)],
    ['avec plus d’autonomie que l’arme (6)', (p: Tampered) => (p.autonomyLeft = 6)],
    ['sans trajet ni cap', (p: Tampered) => ((p.route = []), (p.heading = null))],
    ['sur zone suspecte avec une cible désignée', (p: Tampered) => (p.onSuspectZone = true)],
    ['qui suit une cible sans cap', (p: Tampered) => ((p.tracking = true), (p.heading = null))],
    ['qui suit sans cible désignée', (p: Tampered) => ((p.tracking = true), (p.targetId = null))],
  ])('refuse une torpille %s', (_name, mutate) => {
    expectInvalid(
      parseTampered((s) => mutate(s.state.projectiles[0])),
      /incohérent/,
    );
  });

  it.each([
    ['un trajet qui saute une case', [{ col: 14, row: 10 }]],
    [
      'un trajet qui ne part pas d’un voisin de la position',
      [
        { col: 13, row: 10 },
        { col: 14, row: 10 },
      ],
    ],
  ])('refuse %s', (_name, route) => {
    expectInvalid(
      parseTampered((s) => (s.state.projectiles[0].route = route)),
      /incohérent/,
    );
  });

  it('accepte une torpille qui suit sa cible désignée après un premier pas', () => {
    const result = parseTampered((s) => {
      s.state.projectiles[0].tracking = true;
      s.state.projectiles[0].heading = { q: 1, r: 0 };
    });
    expect(result.ok).toBe(true);
  });

  it('accepte une torpille sans trajet restant qui garde son cap', () => {
    const result = parseTampered((s) => {
      s.state.projectiles[0].route = [];
      s.state.projectiles[0].heading = { q: 1, r: 0 };
    });
    expect(result.ok).toBe(true);
  });
});
