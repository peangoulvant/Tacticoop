import { defaultConfig, type GameConfig, type ShipClass } from '../../config/game.config';
import { observeFriend } from '../../detection/observation.service';
import type { Hex } from '../../map/hex.service';
import { specialActionBlocker } from '../../missions/activation.service';
import { initialSetup } from '../../missions/setup.service';
import { createUnit, type Side, type Unit } from '../../units/unit.model';
import { executeCommand } from '../execute-command.service';
import type { CommandResult, GameCommand, GameEvent, MissionState } from '../game.types';

function make(id: string, side: Side, shipClass: ShipClass, position: Hex): Unit {
  return createUnit(id, side, shipClass, position, defaultConfig, {
    ammoFactor: 1,
    movementCap: null,
  });
}

/** Détection active sûre pour la FREMM : isole les règles de commande du hasard. */
const SURE: GameConfig = {
  ...defaultConfig,
  ships: {
    ...defaultConfig.ships,
    fremm: {
      ...defaultConfig.ships.fremm,
      detection: { ...defaultConfig.ships.fremm.detection!, sweepProbability: 1 },
    },
  },
};

/** FREMM `a` en (3,4), frégate DA `b`, porte-avions, et un sous-marin hostile à 3 hexagones de `a`. */
function mission(): MissionState {
  return {
    status: 'in_progress',
    setup: initialSetup(),
    map: { width: 12, height: 9, terrain: Array(108).fill('sea') },
    start: { col: 0, row: 4 },
    goal: null,
    cycle: 1,
    carrierNavigation: null,
    outcome: null,
    friendContacts: [],
    nextContactNumber: 1,
    rngState: 7,
    units: [
      make('a', 'friend', 'fremm', { col: 3, row: 4 }),
      make('b', 'friend', 'frigate_da', { col: 3, row: 7 }),
      make('carrier', 'friend', 'carrier', { col: 0, row: 4 }),
      make('hostile-submarine-1', 'hostile', 'submarine', { col: 6, row: 4 }),
    ],
  };
}

function search(unitId = 'a'): GameCommand {
  return { type: 'SWEEP', unitId };
}

function run(state: MissionState, command: GameCommand, config = SURE): CommandResult {
  return executeCommand(state, command, config);
}

function accepted(state: MissionState, command: GameCommand, config = SURE) {
  const result = run(state, command, config);
  if (!result.ok || result.state.status !== 'in_progress') throw new Error('commande refusée');
  return { state: result.state, events: result.events };
}

function refusedCode(state: MissionState, command: GameCommand): string {
  const result = run(state, command);
  if (result.ok) throw new Error('commande acceptée');
  return result.error.code;
}

function unitOf(state: MissionState, id: string): Unit {
  return state.units.find((u) => u.id === id)!;
}

describe('commande SWEEP (G-07.7, AB-30)', () => {
  it('résout sur-le-champ, engage l’activation et consomme l’action spéciale', () => {
    const { state, events } = accepted(mission(), search());
    expect(unitOf(state, 'a')).toMatchObject({
      activation: 'in_progress',
      specialActionUsed: true,
      hasMoved: false,
    });
    expect(state.friendContacts).toHaveLength(1);
    expect(events).toMatchObject([
      {
        type: 'SWEEP_PERFORMED',
        cycle: 1,
        unitId: 'a',
        shipClass: 'fremm',
        identified: [{ contactId: 'C-1', targetType: 'submarine', position: { col: 6, row: 4 } }],
      },
    ]);
  });

  it('consomme l’action et journalise même sans résultat (AB-28)', () => {
    const failing: GameConfig = {
      ...SURE,
      ships: {
        ...SURE.ships,
        fremm: {
          ...SURE.ships.fremm,
          detection: { ...SURE.ships.fremm.detection!, sweepProbability: 0 },
        },
      },
    };
    const { state, events } = accepted(mission(), search(), failing);
    expect(unitOf(state, 'a')).toMatchObject({
      activation: 'in_progress',
      specialActionUsed: true,
    });
    expect(state.friendContacts).toEqual([]);
    expect(events).toMatchObject([{ type: 'SWEEP_PERFORMED', identified: [] }]);
  });

  it('refuse une seconde recherche pendant la même activation, sans rien consommer', () => {
    const first = accepted(mission(), search()).state;
    const second = run(first, search());
    expect(second).toMatchObject({ ok: false, error: { code: 'SPECIAL_ACTION_USED' } });
    // Aucun tirage ni contact de plus : l'état est celui d'avant le refus.
    expect(first.friendContacts).toHaveLength(1);
  });

  it('se combine avec le déplacement, dans les deux ordres', () => {
    const destination = { col: 4, row: 4 };
    const searchFirst = accepted(accepted(mission(), search()).state, {
      type: 'MOVE_UNIT',
      unitId: 'a',
      destination,
    }).state;
    expect(unitOf(searchFirst, 'a')).toMatchObject({ hasMoved: true, specialActionUsed: true });
    const moveFirst = accepted(
      accepted(mission(), { type: 'MOVE_UNIT', unitId: 'a', destination }).state,
      search(),
    ).state;
    expect(unitOf(moveFirst, 'a')).toMatchObject({ hasMoved: true, specialActionUsed: true });
    // La recherche part de la position de l'unité à cet instant.
    expect(moveFirst.friendContacts).toHaveLength(1);
  });

  it('laisse « Terminer l’activation » disponible ; l’action de l’activation est renouvelée au cycle suivant', () => {
    const searched = accepted(mission(), search()).state;
    const ended = accepted(searched, { type: 'END_ACTIVATION', unitId: 'a' }).state;
    expect(unitOf(ended, 'a').activation).toBe('activated');
    const next = accepted(ended, { type: 'END_CYCLE_EARLY' }).state;
    expect(unitOf(next, 'a')).toMatchObject({ activation: 'available', specialActionUsed: false });
  });

  it('enregistre le cycle du balayage, qui déclenche le délai de récupération (AB-34)', () => {
    const { state } = accepted(mission(), search());
    expect(unitOf(state, 'a').lastSpecialActionCycle).toEqual({ sweep: 1 });
  });

  it('refuse le balayage au cycle suivant (récupération), puis le permet au cycle d’après (AB-34)', () => {
    const swept = accepted(mission(), search()).state;
    const cycle2 = accepted(swept, { type: 'END_CYCLE_EARLY' }).state;
    expect(cycle2.cycle).toBe(2);
    expect(refusedCode(cycle2, search())).toBe('ON_COOLDOWN');
    // Un refus ne consomme rien : ni action, ni activation engagée.
    expect(unitOf(cycle2, 'a')).toMatchObject({
      activation: 'available',
      specialActionUsed: false,
    });
    const cycle3 = accepted(cycle2, { type: 'END_CYCLE_EARLY' }).state;
    expect(cycle3.cycle).toBe(3);
    expect(accepted(cycle3, search()).state.friendContacts.length).toBeGreaterThan(0);
  });

  it('une autre unité du même camp n’est pas en récupération', () => {
    const swept = accepted(mission(), search()).state;
    const cycle2 = accepted(swept, { type: 'END_CYCLE_EARLY' }).state;
    expect(accepted(cycle2, search('b')).state.cycle).toBe(2);
  });

  it('refuse sans consommer : unité inconnue, porte-avions, hostile, déjà activée, autre en cours', () => {
    const state = mission();
    expect(refusedCode(state, search('zzz'))).toBe('UNIT_NOT_FOUND');
    expect(refusedCode(state, search('carrier'))).toBe('UNIT_NOT_ACTIVABLE');
    expect(refusedCode(state, search('hostile-submarine-1'))).toBe('UNIT_NOT_ACTIVABLE');
    const done = accepted(state, { type: 'END_ACTIVATION', unitId: 'a' }).state;
    expect(refusedCode(done, search('a'))).toBe('UNIT_ALREADY_ACTIVATED');
    const engaged = accepted(state, {
      type: 'MOVE_UNIT',
      unitId: 'a',
      destination: { col: 4, row: 4 },
    }).state;
    expect(refusedCode(engaged, search('b'))).toBe('ACTIVATION_IN_PROGRESS');
  });

  it('refuse après la fin de la mission', () => {
    expect(refusedCode({ ...mission(), outcome: 'victory' }, search())).toBe('MISSION_ENDED');
  });

  it('refuse une unité sans capteurs (NO_SENSORS), avant tout tirage', () => {
    const blind: GameConfig = {
      ...SURE,
      ships: { ...SURE.ships, fremm: { ...SURE.ships.fremm, detection: null } },
    };
    const state = mission();
    expect(specialActionBlocker(state.units, unitOf(state, 'a'), 'sweep', 1, blind)).toBe(
      'NO_SENSORS',
    );
    expect(specialActionBlocker(state.units, unitOf(state, 'a'), 'sweep', 1, SURE)).toBeNull();
    const result = run(state, search(), blind);
    expect(result).toMatchObject({ ok: false, error: { code: 'NO_SENSORS' } });
  });

  it('un refus ne modifie ni l’état du hasard ni les contacts', () => {
    const state = { ...mission(), outcome: null };
    const first = accepted(state, search()).state;
    const refused = run(first, search());
    expect(refused.ok).toBe(false);
    // L'état d'origine n'est jamais muté.
    expect(first.rngState).not.toBe(state.rngState);
    expect(state.friendContacts).toEqual([]);
  });
});

describe('non-divulgation de la cible (AB-26, AB-28)', () => {
  /** Le texte de tout ce que le joueur peut recevoir ne contient jamais l'identité réelle de la cible. */
  function exposed(state: MissionState, events: readonly GameEvent[]): string {
    return JSON.stringify([observeFriend(state), events]);
  }

  it('la projection amie et les événements ne contiennent ni source, ni identifiant, ni classe', () => {
    const { state, events } = accepted(mission(), search());
    const text = exposed(state, events);
    expect(state.friendContacts[0]).toHaveProperty('source', 'hostile-submarine-1');
    expect(text).not.toContain('source');
    expect(text).not.toContain('hostile-submarine-1');
    expect(observeFriend(state).units.every((u) => u.side === 'friend')).toBe(true);
    expect(text).toContain('"targetType":"submarine"');
  });

  it('aucune des deux issues (réussite, échec) ne laisse échapper la cible', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const frigate = make('hostile-frigate_asm-1', 'hostile', 'frigate_asm', { col: 6, row: 4 });
      const start = mission();
      const units = start.units.map((u) => (u.side === 'hostile' ? frigate : u));
      const result = executeCommand({ ...start, units, rngState: seed }, search(), defaultConfig);
      if (!result.ok || result.state.status !== 'in_progress') throw new Error('commande refusée');
      const text = exposed(result.state, result.events);
      expect(text).not.toContain('source');
      expect(text).not.toContain('hostile-');
      // Le type (« frigate ») est révélé, jamais la classe (« frigate_asm »).
      expect(text).not.toContain('frigate_asm');
    }
  });
});
