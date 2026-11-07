import { defaultConfig, type ShipClass } from '../../config/game.config';
import { hexNeighbors, type Hex } from '../../map/hex.service';
import { plannedRoute } from '../../missions/carrier-movement.service';
import { isAwaitingFinalOrder } from '../../missions/cycle.service';
import { initialSetup } from '../../missions/setup.service';
import { createUnit, type Unit } from '../../units/unit.model';
import { executeCommand } from '../execute-command.service';
import type { CommandResult, GameCommand, GameState, MissionState } from '../game.types';

const SIZE = 9;
const sea: MissionState['map'] = {
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

/** Escorte en pleine mer : porte-avions en (0,4), B en (8,4), deux escortes hors de la route. */
function escort(): MissionState {
  return {
    status: 'in_progress',
    setup: initialSetup(),
    map: sea,
    start: { col: 0, row: 4 },
    goal: { col: 8, row: 4 },
    cycle: 1,
    carrierNavigation: { mode: 'continue', waypoint: null, orderUsed: false },
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

function accepted(state: MissionState, command: GameCommand) {
  const result = run(state, command);
  if (!result.ok || result.state.status !== 'in_progress') throw new Error('commande refusée');
  return { state: result.state, events: result.events };
}

function errorCode(state: MissionState, command: GameCommand) {
  const result = run(state, command);
  return result.ok ? null : result.error.code;
}

function endActivation(unitId: string): GameCommand {
  return { type: 'END_ACTIVATION', unitId };
}

function order(kind: 'continue' | 'stop'): GameCommand {
  return { type: 'ORDER_CARRIER', order: { kind } };
}

function reroute(col: number, row: number): GameCommand {
  return { type: 'ORDER_CARRIER', order: { kind: 'reroute', waypoint: { col, row } } };
}

/** Place une unité sur une case donnée. */
function withUnitAt(state: MissionState, id: string, position: Hex): MissionState {
  return { ...state, units: state.units.map((u) => (u.id === id ? { ...u, position } : u)) };
}

/** Termine les activations des deux escortes : le cycle est alors à sa dernière occasion d'ordre. */
function afterAllActivations(state: MissionState): MissionState {
  return accepted(accepted(state, endActivation('a')).state, endActivation('b')).state;
}

function carrierAt(state: MissionState): Hex {
  return state.units.find((u) => u.id === 'carrier')!.position;
}

describe("lancement d'une mission", () => {
  function launched(mission: 'escort' | 'naval_combat'): MissionState {
    let state: GameState = { status: 'preparation', setup: initialSetup() };
    for (const command of [
      { type: 'SELECT_MISSION', mission },
      { type: 'ADD_SHIP', shipClass: 'fremm' },
      { type: 'LAUNCH_MISSION', seed: 1 },
    ] satisfies GameCommand[]) {
      const result = run(state, command);
      if (!result.ok) throw new Error(result.error.message);
      state = result.state;
    }
    if (state.status !== 'in_progress') throw new Error('mission non lancée');
    return state;
  }

  it('donne au porte-avions une navigation qui continue vers B, quota libre, sans issue', () => {
    expect(launched('escort')).toMatchObject({
      carrierNavigation: { mode: 'continue', waypoint: null, orderUsed: false },
      outcome: null,
    });
  });

  it("n'a pas de navigation en lutte navale", () => {
    expect(launched('naval_combat').carrierNavigation).toBeNull();
  });
});

describe('dernière occasion d’ordre (C3=B)', () => {
  it('laisse le cycle ouvert après la dernière activation tant que le quota est libre', () => {
    const state = afterAllActivations(escort());
    expect(state.cycle).toBe(1);
    expect(isAwaitingFinalOrder(state)).toBe(true);
    expect(carrierAt(state)).toEqual({ col: 0, row: 4 });
  });

  it('se clôt avec « Clôturer le cycle » : le porte-avions avance de 2 et le quota est renouvelé', () => {
    const { state, events } = accepted(afterAllActivations(escort()), { type: 'CLOSE_CYCLE' });
    expect(state.cycle).toBe(2);
    expect(carrierAt(state)).toEqual({ col: 2, row: 4 });
    expect(state.carrierNavigation?.orderUsed).toBe(false);
    expect(events.map((e) => e.type)).toEqual(['CARRIER_MOVED', 'CYCLE_STARTED']);
  });

  it('se clôt aussitôt quand un ordre est donné', () => {
    const { state, events } = accepted(afterAllActivations(escort()), order('continue'));
    expect(state.cycle).toBe(2);
    expect(carrierAt(state)).toEqual({ col: 2, row: 4 });
    expect(events.map((e) => e.type)).toEqual([
      'CARRIER_ORDERED',
      'CARRIER_MOVED',
      'CYCLE_STARTED',
    ]);
  });

  it('se clôt automatiquement quand le quota est déjà utilisé', () => {
    const ordered = accepted(escort(), order('continue')).state;
    expect(afterAllActivations(ordered).cycle).toBe(2);
  });

  it('refuse « Clôturer le cycle » hors de la dernière occasion', () => {
    expect(errorCode(escort(), { type: 'CLOSE_CYCLE' })).toBe('NOT_AT_CYCLE_END');
    const used = accepted(escort(), order('continue')).state;
    expect(errorCode(used, { type: 'CLOSE_CYCLE' })).toBe('NOT_AT_CYCLE_END');
  });

  it("n'attend pas d'ordre après une fin anticipée : le porte-avions avance quand même", () => {
    const { state } = accepted(escort(), { type: 'END_CYCLE_EARLY' });
    expect(state.cycle).toBe(2);
    expect(carrierAt(state)).toEqual({ col: 2, row: 4 });
  });
});

describe('ordres et quota', () => {
  it('consomme le quota, refuse un second ordre, et le renouvelle au cycle suivant', () => {
    const { state } = accepted(escort(), order('stop'));
    expect(state.carrierNavigation?.orderUsed).toBe(true);
    expect(errorCode(state, order('continue'))).toBe('NAVIGATION_QUOTA_USED');
    const next = accepted(state, { type: 'END_CYCLE_EARLY' }).state;
    expect(errorCode(next, order('continue'))).toBeNull();
  });

  it("refuse un ordre pendant l'activation d'une unité", () => {
    const moving = accepted(escort(), {
      type: 'MOVE_UNIT',
      unitId: 'a',
      destination: { col: 3, row: 2 },
    });
    expect(errorCode(moving.state, order('stop'))).toBe('ACTIVATION_IN_PROGRESS');
  });

  it("refuse les ordres hors de la mission d'escorte", () => {
    const naval: MissionState = { ...escort(), carrierNavigation: null };
    expect(errorCode(naval, order('stop'))).toBe('NOT_ESCORT_MISSION');
    expect(errorCode(naval, { type: 'CLOSE_CYCLE' })).toBe('NOT_AT_CYCLE_END');
  });

  it('ne modifie pas l’état reçu', () => {
    const before = escort();
    const snapshot = JSON.stringify(before);
    run(before, order('stop'));
    run(before, { type: 'END_CYCLE_EARLY' });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('Poursuivre et Stopper persistent', () => {
  it("Stopper garde le porte-avions en place, cycle après cycle, jusqu'à Poursuivre", () => {
    let state = accepted(escort(), order('stop')).state;
    state = accepted(state, { type: 'END_CYCLE_EARLY' }).state;
    state = accepted(state, { type: 'END_CYCLE_EARLY' }).state;
    expect(state.cycle).toBe(3);
    expect(carrierAt(state)).toEqual({ col: 0, row: 4 });
    expect(state.carrierNavigation?.mode).toBe('stop');
    state = accepted(state, order('continue')).state;
    state = accepted(state, { type: 'END_CYCLE_EARLY' }).state;
    expect(carrierAt(state)).toEqual({ col: 2, row: 4 });
  });

  it('Poursuivre après Stopper garde le point de passage', () => {
    let state = accepted(escort(), reroute(4, 2)).state;
    state = accepted(state, { type: 'END_CYCLE_EARLY' }).state;
    state = accepted(state, order('stop')).state;
    state = accepted(state, { type: 'END_CYCLE_EARLY' }).state;
    state = accepted(state, order('continue')).state;
    expect(state.carrierNavigation).toMatchObject({
      mode: 'continue',
      waypoint: { col: 4, row: 2 },
    });
  });
});

describe("Modifier l'itinéraire", () => {
  const withMountains = (hexes: Hex[]): MissionState => {
    const terrain = [...sea.terrain];
    for (const h of hexes) terrain[h.row * SIZE + h.col] = 'mountain';
    return { ...escort(), map: { ...sea, terrain } };
  };

  it('refuse un point de passage hors carte, non navigable, identique à la position', () => {
    const state = withMountains([{ col: 5, row: 1 }]);
    const refusal = (col: number, row: number) => {
      const result = run(state, reroute(col, row));
      return result.ok ? null : result.error.waypointRefusal;
    };
    expect(refusal(20, 20)).toBe('NOT_NAVIGABLE');
    expect(refusal(5, 1)).toBe('NOT_NAVIGABLE');
    expect(refusal(0, 4)).toBe('SAME_HEX');
  });

  it('refuse un point de passage inaccessible, sans consommer le quota', () => {
    const island = hexNeighbors({ col: 6, row: 1 }, SIZE, SIZE);
    const state = withMountains(island);
    const result = run(state, reroute(6, 1));
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'WAYPOINT_REFUSED', waypointRefusal: 'NO_PATH' },
    });
    expect(errorCode(state, order('stop'))).toBeNull();
  });

  it('accepte une case occupée : le blocage est géré au déplacement', () => {
    expect(errorCode(escort(), reroute(2, 2))).toBeNull();
  });

  it('prévoit un trajet qui passe par le point de passage puis rejoint B', () => {
    const { state } = accepted(escort(), reroute(4, 2));
    const route = plannedRoute(state, defaultConfig)!;
    expect(route[0]).toEqual({ col: 0, row: 4 });
    expect(route).toContainEqual({ col: 4, row: 2 });
    expect(route.at(-1)).toEqual({ col: 8, row: 4 });
  });

  it("prévisualise un point de passage sans l'enregistrer, ou l'ignore avec null", () => {
    const state = accepted(escort(), reroute(4, 2)).state;
    const direct = plannedRoute(state, defaultConfig, null)!;
    expect(direct).toEqual(Array.from({ length: 9 }, (_, col) => ({ col, row: 4 })));
    const preview = plannedRoute(escort(), defaultConfig, { col: 4, row: 2 })!;
    expect(preview).toContainEqual({ col: 4, row: 2 });
    expect(escort().carrierNavigation?.waypoint).toBeNull();
  });

  it('prévoit le chemin le plus court vers B sans point de passage', () => {
    expect(plannedRoute(escort(), defaultConfig)).toEqual(
      Array.from({ length: 9 }, (_, col) => ({ col, row: 4 })),
    );
  });

  it('efface le point de passage atteint et repart vers B avec les pas restants', () => {
    const { state } = accepted(escort(), reroute(1, 4));
    const closed = accepted(state, { type: 'END_CYCLE_EARLY' }).state;
    expect(carrierAt(closed)).toEqual({ col: 2, row: 4 });
    expect(closed.carrierNavigation?.waypoint).toBeNull();
  });

  it('remplace un Stopper : le porte-avions repart', () => {
    let state = accepted(escort(), order('stop')).state;
    state = accepted(state, { type: 'END_CYCLE_EARLY' }).state;
    state = accepted(state, reroute(4, 4)).state;
    state = accepted(state, { type: 'END_CYCLE_EARLY' }).state;
    expect(carrierAt(state)).toEqual({ col: 2, row: 4 });
  });
});

describe('route bloquée', () => {
  it("s'arrête avant la case occupée, sans changer d'ordre", () => {
    const blocked = withUnitAt(escort(), 'a', { col: 2, row: 4 });
    const { state, events } = accepted(blocked, { type: 'END_CYCLE_EARLY' });
    expect(carrierAt(state)).toEqual({ col: 1, row: 4 });
    expect(state.carrierNavigation?.mode).toBe('continue');
    expect(events[0]).toMatchObject({ type: 'CARRIER_MOVED', to: { col: 1, row: 4 } });
  });

  it('reste en place, sans événement de navigation, si la première case est occupée', () => {
    const blocked = withUnitAt(escort(), 'a', { col: 1, row: 4 });
    const { state, events } = accepted(blocked, { type: 'END_CYCLE_EARLY' });
    expect(carrierAt(state)).toEqual({ col: 0, row: 4 });
    expect(events.map((e) => e.type)).toEqual(['CYCLE_STARTED']);
  });

  it('retente au cycle suivant une fois la case libérée', () => {
    const blocked = withUnitAt(escort(), 'a', { col: 1, row: 4 });
    const next = accepted(blocked, { type: 'END_CYCLE_EARLY' }).state;
    const freed = withUnitAt(next, 'a', { col: 2, row: 2 });
    expect(carrierAt(accepted(freed, { type: 'END_CYCLE_EARLY' }).state)).toEqual({
      col: 2,
      row: 4,
    });
  });
});

describe('arrivée en B', () => {
  it('déclare la victoire sans ouvrir de cycle suivant, même avec un seul pas utile', () => {
    const near = withUnitAt(escort(), 'carrier', { col: 7, row: 4 });
    const { state, events } = accepted(near, { type: 'END_CYCLE_EARLY' });
    expect(carrierAt(state)).toEqual({ col: 8, row: 4 });
    expect(state.outcome).toBe('victory');
    expect(state.cycle).toBe(1);
    expect(events.map((e) => e.type)).toEqual(['CARRIER_MOVED', 'MISSION_WON']);
  });

  it('gagne aussi quand B est atteint au dernier pas du cycle', () => {
    const near = withUnitAt(escort(), 'carrier', { col: 6, row: 4 });
    expect(accepted(near, { type: 'END_CYCLE_EARLY' }).state.outcome).toBe('victory');
  });

  it('refuse toute commande une fois la mission terminée', () => {
    const near = withUnitAt(escort(), 'carrier', { col: 7, row: 4 });
    const won = accepted(near, { type: 'END_CYCLE_EARLY' }).state;
    for (const command of [
      order('stop'),
      { type: 'CLOSE_CYCLE' },
      { type: 'END_CYCLE_EARLY' },
      endActivation('a'),
      { type: 'MOVE_UNIT', unitId: 'a', destination: { col: 3, row: 2 } },
    ] satisfies GameCommand[]) {
      expect(errorCode(won, command)).toBe('MISSION_ENDED');
    }
  });

  it("ne déclare pas la victoire si le porte-avions est à l'arrêt près de B", () => {
    const near = withUnitAt(escort(), 'carrier', { col: 7, row: 4 });
    const stopped = accepted(near, order('stop')).state;
    expect(accepted(stopped, { type: 'END_CYCLE_EARLY' }).state.outcome).toBeNull();
  });
});
