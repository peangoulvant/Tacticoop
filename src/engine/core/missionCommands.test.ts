import { defaultConfig, type ShipClass } from '../config/gameConfig';
import type { Hex } from '../map/hex';
import { initialSetup } from '../missions/setup';
import { createUnit, type Unit } from '../units/unit';
import { executeCommand } from './executeCommand';
import type { CommandResult, GameCommand, GameState, MissionState } from './types';

const SIZE = 9;
const open: MissionState['map'] = {
  width: SIZE,
  height: SIZE,
  terrain: Array(SIZE * SIZE).fill('sea'),
};
function make(id: string, shipClass: ShipClass, position: Hex): Unit {
  return createUnit(id, 'friend', shipClass, position, defaultConfig, {
    ammoFactor: 1,
    movementCap: null,
  });
}

/** Mission en pleine mer : deux frégates et un porte-avions, au cycle 1. */
function mission(): MissionState {
  return {
    status: 'in_progress',
    setup: initialSetup(),
    map: open,
    start: { col: 0, row: 4 },
    goal: { col: 8, row: 4 },
    cycle: 1,
    carrierNavigation: null,
    outcome: null,
    units: [
      make('carrier', 'carrier', { col: 0, row: 4 }),
      make('a', 'fremm', { col: 2, row: 2 }),
      make('b', 'frigate_da', { col: 2, row: 6 }),
    ],
  };
}

function run(state: GameState, command: GameCommand): CommandResult {
  return executeCommand(state, command, defaultConfig);
}

function accepted(state: GameState, command: GameCommand) {
  const result = run(state, command);
  if (!result.ok || result.state.status !== 'in_progress') throw new Error('commande refusée');
  return { state: result.state, events: result.events };
}

function unitOf(state: MissionState, id: string) {
  return state.units.find((u) => u.id === id)!;
}
function move(unitId: string, col: number, row: number): GameCommand {
  return {
    type: 'MOVE_UNIT',
    unitId,
    destination: { col, row },
  };
}

describe('activation des unités au lancement', () => {
  it('rend les frégates disponibles et le porte-avions non activable', () => {
    const state = mission();
    expect(unitOf(state, 'a').activation).toBe('available');
    expect(unitOf(state, 'carrier').activation).toBe('not_activable');
  });
});

describe('MOVE_UNIT', () => {
  it("déplace l'unité, engage son activation et produit un événement", () => {
    const { state, events } = accepted(mission(), move('a', 4, 2));
    expect(unitOf(state, 'a')).toMatchObject({
      position: { col: 4, row: 2 },
      activation: 'in_progress',
      hasMoved: true,
    });
    expect(events).toEqual([
      {
        type: 'UNIT_MOVED',
        unitId: 'a',
        shipClass: 'fremm',
        from: { col: 2, row: 2 },
        to: { col: 4, row: 2 },
        cycle: 1,
      },
    ]);
  });

  it('refuse un second déplacement pendant la même activation', () => {
    const { state } = accepted(mission(), move('a', 4, 2));
    expect(run(state, move('a', 5, 2))).toMatchObject({
      ok: false,
      error: { code: 'ALREADY_MOVED' },
    });
  });

  it("réserve les ordres à l'unité en cours d'activation", () => {
    const { state } = accepted(mission(), move('a', 4, 2));
    expect(run(state, move('b', 4, 6))).toMatchObject({
      ok: false,
      error: { code: 'ACTIVATION_IN_PROGRESS' },
    });
  });

  it('refuse un déplacement invalide avec son motif, sans rien consommer', () => {
    const state = mission();
    const result = run(state, move('a', 8, 8));
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'MOVE_REFUSED', moveRefusal: 'OUT_OF_RANGE' },
    });
    expect(unitOf(state, 'a')).toMatchObject({ activation: 'available', hasMoved: false });
  });

  it("refuse le porte-avions, l'unité activée et l'unité inconnue", () => {
    const { state } = accepted(mission(), { type: 'END_ACTIVATION', unitId: 'a' });
    expect(run(state, move('carrier', 1, 4))).toMatchObject({
      ok: false,
      error: { code: 'UNIT_NOT_ACTIVABLE' },
    });
    expect(run(state, move('a', 4, 2))).toMatchObject({
      ok: false,
      error: { code: 'UNIT_ALREADY_ACTIVATED' },
    });
    expect(run(state, move('ghost', 4, 2))).toMatchObject({
      ok: false,
      error: { code: 'UNIT_NOT_FOUND' },
    });
  });

  it("ne modifie pas l'état reçu", () => {
    const state = mission();
    const snapshot = structuredClone(state);
    run(state, move('a', 4, 2));
    expect(state).toEqual(snapshot);
  });
});

describe('END_ACTIVATION', () => {
  it('peut clore une activation sans déplacement ni action (SF-03.2)', () => {
    const { state, events } = accepted(mission(), { type: 'END_ACTIVATION', unitId: 'a' });
    expect(unitOf(state, 'a')).toMatchObject({ activation: 'activated', hasMoved: false });
    expect(state.cycle).toBe(1);
    expect(events).toEqual([]);
  });

  it("clôt l'activation engagée par un déplacement", () => {
    const moved = accepted(mission(), move('a', 4, 2)).state;
    const { state } = accepted(moved, { type: 'END_ACTIVATION', unitId: 'a' });
    expect(unitOf(state, 'a').activation).toBe('activated');
    expect(unitOf(state, 'b').activation).toBe('available');
  });

  it('ouvre automatiquement le cycle suivant quand toutes les activations sont achevées (SF-03.4)', () => {
    const first = accepted(mission(), move('a', 4, 2)).state;
    const afterA = accepted(first, { type: 'END_ACTIVATION', unitId: 'a' }).state;
    const { state, events } = accepted(afterA, { type: 'END_ACTIVATION', unitId: 'b' });
    expect(state.cycle).toBe(2);
    expect(events).toEqual([{ type: 'CYCLE_STARTED', cycle: 2 }]);
    expect(unitOf(state, 'a')).toMatchObject({
      activation: 'available',
      hasMoved: false,
      position: { col: 4, row: 2 },
    });
    expect(unitOf(state, 'carrier').activation).toBe('not_activable');
  });
});

describe('END_CYCLE_EARLY', () => {
  it('fait perdre leur activation aux unités restantes et ouvre le cycle suivant (SF-03.5)', () => {
    const afterA = accepted(mission(), { type: 'END_ACTIVATION', unitId: 'a' }).state;
    const { state, events } = accepted(afterA, { type: 'END_CYCLE_EARLY' });
    expect(state.cycle).toBe(2);
    expect(events).toEqual([{ type: 'CYCLE_STARTED', cycle: 2 }]);
    expect(state.units.filter((u) => u.activation === 'available')).toHaveLength(2);
  });

  it('est possible avant la première activation', () => {
    expect(accepted(mission(), { type: 'END_CYCLE_EARLY' }).state.cycle).toBe(2);
  });

  it('est refusée pendant une activation engagée', () => {
    const { state } = accepted(mission(), move('a', 4, 2));
    expect(run(state, { type: 'END_CYCLE_EARLY' })).toMatchObject({
      ok: false,
      error: { code: 'ACTIVATION_IN_PROGRESS' },
    });
  });
});

describe('phases', () => {
  it('refuse une commande de mission pendant la préparation', () => {
    const preparation: GameState = { status: 'preparation', setup: initialSetup() };
    expect(run(preparation, { type: 'END_CYCLE_EARLY' })).toMatchObject({
      ok: false,
      error: { code: 'WRONG_PHASE' },
    });
  });

  it('refuse une commande de préparation une fois la mission lancée', () => {
    expect(run(mission(), { type: 'ADD_SHIP', shipClass: 'fremm' })).toMatchObject({
      ok: false,
      error: { code: 'WRONG_PHASE' },
    });
  });
});
