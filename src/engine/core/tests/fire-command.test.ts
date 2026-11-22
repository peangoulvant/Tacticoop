import { describe, expect, it } from 'vitest';
import {
  aProjectile,
  identified,
  makeUnit,
  missionOf,
  openSea,
  suspectZone,
} from '../../combat/tests/combat-fixture.model';
import { defaultConfig } from '../../config/game.config';
import type { Contact } from '../../detection/contact.types';
import type { Unit } from '../../units/unit.model';
import { executeCommand } from '../execute-command.service';
import type { CommandResult, GameCommand, MissionState } from '../game.types';
import { fire } from '../unit-commands.service';

/** Mission en mer ouverte : une FREMM alliée en (2,4), un navire hostile en (6,4). */
function mission(
  patch: Partial<MissionState> = {},
  contacts: Contact[] = [identified('C-1', { col: 6, row: 4 }, 'hostile-1')],
  units: Unit[] = [
    makeUnit('fremm', 'friend', 'fremm', { col: 2, row: 4 }),
    makeUnit('hostile-1', 'hostile', 'frigate_da', { col: 6, row: 4 }),
  ],
): MissionState {
  return {
    ...missionOf({ map: openSea(16, 9), units }),
    friendContacts: contacts,
    nextContactNumber: contacts.length + 1,
    ...patch,
  };
}

const fireMissile: GameCommand = {
  type: 'FIRE',
  unitId: 'fremm',
  weapon: 'missile',
  target: { contactId: 'C-1' },
};

function run(state: MissionState, command: GameCommand): CommandResult {
  return executeCommand(state, command, defaultConfig);
}

function accepted(state: MissionState, command: GameCommand) {
  const result = run(state, command);
  if (!result.ok || result.state.status !== 'in_progress') throw new Error('commande refusée');
  return { state: result.state, events: result.events };
}

function refused(state: MissionState, command: GameCommand) {
  const result = run(state, command);
  if (result.ok) throw new Error('commande acceptée');
  return result.error;
}

function unitOf(state: MissionState, id: string): Unit {
  return state.units.find((u) => u.id === id)!;
}

describe('tir accepté (AB-44, AB-45, AB-47)', () => {
  it('crée un projectile à la position du tireur, avec le numéro de lancement suivant', () => {
    const { state } = accepted(mission(), fireMissile);
    expect(state.projectiles).toHaveLength(1);
    expect(state.projectiles[0]).toMatchObject({
      id: 'P-1',
      launchNumber: 1,
      weapon: 'missile',
      side: 'friend',
      launcherId: 'fremm',
      launchCycle: 1,
      position: { col: 2, row: 4 },
      aimedHex: { col: 6, row: 4 },
      targetId: null,
      onSuspectZone: false,
      autonomyLeft: null,
      detected: false,
    });
    expect(state.projectiles[0]!.route).toHaveLength(4);
    expect(state.nextLaunchNumber).toBe(2);
  });

  it('consomme un missile, l’action spéciale, et engage l’activation', () => {
    const before = unitOf(mission(), 'fremm');
    const { state } = accepted(mission(), fireMissile);
    const after = unitOf(state, 'fremm');
    expect(after.missiles).toBe(before.missiles - 1);
    expect(after.torpedoes).toBe(before.torpedoes);
    expect(after.specialActionUsed).toBe(true);
    expect(after.activation).toBe('in_progress');
    expect(after.lastSpecialActionCycle).toEqual({ fire_missile: 1 });
  });

  it('consomme une torpille pour un tir de torpille, avec le navire désigné et son autonomie', () => {
    const state = mission({}, [identified('C-1', { col: 4, row: 4 }, 'hostile-1')]);
    const result = accepted(state, {
      type: 'FIRE',
      unitId: 'fremm',
      weapon: 'torpedo',
      target: { contactId: 'C-1' },
    });
    expect(unitOf(result.state, 'fremm').torpedoes).toBe(3);
    expect(result.state.projectiles[0]).toMatchObject({
      weapon: 'torpedo',
      targetId: 'hostile-1',
      autonomyLeft: defaultConfig.combat.weapons.torpedo.autonomy,
      tracking: false,
      heading: null,
    });
  });

  it('un tir sur zone enregistre l’hexagone choisi et la pénalité, sans cible désignée', () => {
    const zone = [
      { col: 4, row: 4 },
      { col: 5, row: 4 },
    ];
    const state = mission({}, [suspectZone('C-1', zone, 'hostile-1')]);
    const result = accepted(state, {
      type: 'FIRE',
      unitId: 'fremm',
      weapon: 'torpedo',
      target: { contactId: 'C-1', hex: { col: 4, row: 4 } },
    });
    expect(result.state.projectiles[0]).toMatchObject({
      aimedHex: { col: 4, row: 4 },
      onSuspectZone: true,
      targetId: null,
    });
    expect(result.events[0]).toMatchObject({ type: 'SHOT_FIRED', hex: { col: 4, row: 4 } });
  });

  it('journalise le tir avec l’arme et le contact, jamais la cible réelle', () => {
    const { events } = accepted(mission(), fireMissile);
    expect(events).toEqual([
      {
        type: 'SHOT_FIRED',
        cycle: 1,
        unitId: 'fremm',
        shipClass: 'fremm',
        weapon: 'missile',
        contactId: 'C-1',
      },
    ]);
    expect(JSON.stringify(events)).not.toContain('hostile-1');
  });

  it('ne tire aucun nombre aléatoire au lancement (le tir est résolu à la progression)', () => {
    expect(accepted(mission(), fireMissile).state.rngState).toBe(mission().rngState);
  });

  it('numérote les lancements successifs sans réutiliser un numéro', () => {
    const state = mission({
      projectiles: [aProjectile({ id: 'P-4', launchNumber: 4 })],
      nextLaunchNumber: 5,
    });
    expect(accepted(state, fireMissile).state.projectiles.map((p) => p.id)).toEqual(['P-4', 'P-5']);
  });
});

describe('action spéciale unique et délai de récupération (G-07.1, AB-44)', () => {
  it('refuse un balayage ou un second tir après un tir pendant la même activation', () => {
    const { state } = accepted(mission(), fireMissile);
    expect(refused(state, { type: 'SWEEP', unitId: 'fremm' }).code).toBe('SPECIAL_ACTION_USED');
    expect(refused(state, fireMissile).code).toBe('SPECIAL_ACTION_USED');
  });

  it('refuse un tir après un balayage pendant la même activation', () => {
    const { state } = accepted(mission(), { type: 'SWEEP', unitId: 'fremm' });
    expect(refused(state, fireMissile).code).toBe('SPECIAL_ACTION_USED');
  });

  it('n’impose aucun délai : le cycle suivant, l’unité peut tirer de nouveau', () => {
    const fired = accepted(mission(), fireMissile).state;
    const nextCycle: MissionState = {
      ...fired,
      cycle: 2,
      units: fired.units.map((u) =>
        u.id === 'fremm' ? { ...u, activation: 'available', specialActionUsed: false } : u,
      ),
      friendContacts: [identified('C-1', { col: 6, row: 4 }, 'hostile-1', 'frigate', 2)],
    };
    const second = accepted(nextCycle, fireMissile).state;
    expect(unitOf(second, 'fremm').missiles).toBe(2);
    expect(second.projectiles.map((p) => p.id)).toEqual(['P-1', 'P-2']);
  });
});

describe('refus d’un tir : rien n’est consommé (AB-45)', () => {
  function expectUntouched(state: MissionState, command: GameCommand, code: string) {
    const before = structuredClone(state);
    const error = refused(state, command);
    expect(error.code).toBe(code);
    expect(state).toEqual(before);
  }

  it('sans munition : NO_AMMO (un sous-marin n’a pas de missile)', () => {
    const state = mission(
      {},
      [identified('C-1', { col: 6, row: 4 }, 'hostile-1')],
      [
        makeUnit('fremm', 'friend', 'submarine', { col: 2, row: 4 }),
        makeUnit('hostile-1', 'hostile', 'frigate_da', { col: 6, row: 4 }),
      ],
    );
    expectUntouched(state, fireMissile, 'NO_AMMO');
  });

  it('dernier missile tiré, plus de tir possible', () => {
    const state = mission();
    const empty: MissionState = {
      ...state,
      units: state.units.map((u) => (u.id === 'fremm' ? { ...u, missiles: 0 } : u)),
    };
    expectUntouched(empty, fireMissile, 'NO_AMMO');
  });

  it('contact inconnu : FIRE_REFUSED avec son motif et un message', () => {
    const target = { contactId: 'C-9' };
    const error = refused(mission(), { type: 'FIRE', unitId: 'fremm', weapon: 'missile', target });
    expect(error).toMatchObject({ code: 'FIRE_REFUSED', fireRefusal: 'UNKNOWN_CONTACT' });
    expect(error.message).not.toBe('');
  });

  it('contact ancien : refusé, ni action ni stock consommés', () => {
    const state = mission({ cycle: 3 });
    expectUntouched(state, fireMissile, 'FIRE_REFUSED');
  });

  it('hors de portée, torpille sans chemin ou cible incompatible : refusés', () => {
    const far = mission({}, [identified('C-1', { col: 15, row: 4 }, 'hostile-1')]);
    expect(refused(far, fireMissile)).toMatchObject({ fireRefusal: 'OUT_OF_RANGE' });
    const sub = mission({}, [identified('C-1', { col: 6, row: 4 }, 'hostile-1', 'submarine')]);
    expect(refused(sub, fireMissile)).toMatchObject({ fireRefusal: 'INCOMPATIBLE_TARGET' });
  });

  it('le porte-avions ne tire pas (D-04) : il n’est pas activable', () => {
    const state = mission({}, undefined, [
      makeUnit('carrier', 'friend', 'carrier', { col: 2, row: 4 }),
      makeUnit('hostile-1', 'hostile', 'frigate_da', { col: 6, row: 4 }),
    ]);
    const error = refused(state, { ...fireMissile, unitId: 'carrier' } as GameCommand);
    expect(error.code).toBe('UNIT_NOT_ACTIVABLE');
  });

  it('une unité déjà activée ne tire pas', () => {
    const state = mission();
    const done: MissionState = {
      ...state,
      units: state.units.map((u) => (u.id === 'fremm' ? { ...u, activation: 'activated' } : u)),
    };
    expect(refused(done, fireMissile).code).toBe('UNIT_ALREADY_ACTIVATED');
  });

  it('une mission terminée refuse tout tir', () => {
    expect(
      refused(mission({ outcome: 'victory', outcomeCause: 'carrier_arrived' }), fireMissile).code,
    ).toBe('MISSION_ENDED');
  });

  it('le joueur ne peut pas faire tirer une unité hostile : « introuvable »', () => {
    const error = refused(mission(), { ...fireMissile, unitId: 'hostile-1' } as GameCommand);
    expect(error.code).toBe('UNIT_NOT_FOUND');
  });
});

describe('tir de l’IA : mêmes règles, aucun événement visible (AB-35, AB-41, AB-50)', () => {
  function hostileMission(): MissionState {
    const base = mission(
      {},
      [],
      [
        makeUnit('fremm', 'friend', 'fremm', { col: 6, row: 4 }),
        makeUnit('hostile-1', 'hostile', 'frigate_da', { col: 2, row: 4 }),
      ],
    );
    return { ...base, hostileContacts: [identified('C-1', { col: 6, row: 4 }, 'fremm')] };
  }

  it('lit ses propres contacts, consomme son stock et ne produit aucun événement', () => {
    const result = fire(
      hostileMission(),
      { unitId: 'hostile-1', weapon: 'missile', target: { contactId: 'C-1' } },
      defaultConfig,
      'hostile',
    );
    if (!result.ok || result.state.status !== 'in_progress') throw new Error('refusé');
    expect(result.events).toEqual([]);
    expect(result.state.projectiles[0]).toMatchObject({ side: 'hostile', targetId: null });
    expect(unitOf(result.state, 'hostile-1').missiles).toBe(5);
  });

  it('une unité alliée est « introuvable » pour l’IA', () => {
    const result = fire(
      hostileMission(),
      { unitId: 'fremm', weapon: 'missile', target: { contactId: 'C-1' } },
      defaultConfig,
      'hostile',
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'UNIT_NOT_FOUND' } });
  });

  it('les contacts du joueur ne servent pas à l’IA : contact inconnu', () => {
    const base = hostileMission();
    const result = fire(
      {
        ...base,
        hostileContacts: [],
        friendContacts: [identified('C-1', { col: 6, row: 4 }, 'fremm')],
      },
      { unitId: 'hostile-1', weapon: 'missile', target: { contactId: 'C-1' } },
      defaultConfig,
      'hostile',
    );
    expect(result).toMatchObject({ ok: false, error: { fireRefusal: 'UNKNOWN_CONTACT' } });
  });
});
