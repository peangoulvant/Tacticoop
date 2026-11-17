import { describe, expect, it } from 'vitest';
import {
  aProjectile,
  identified,
  makeUnit,
  missionOf,
  openSea,
  rowRoute,
  sureHit,
} from '../../combat/tests/combat-fixture.model';
import { defaultConfig, type GameConfig } from '../../config/game.config';
import type { Unit } from '../../units/unit.model';
import { executeCommand } from '../execute-command.service';
import type { CommandResult, GameCommand, MissionState } from '../game.types';

/** Une unité hostile déjà activée ne réagit pas : la séquence se limite à l'activation et aux projectiles. */
function inactive(unit: Unit): Unit {
  return { ...unit, activation: 'activated' };
}

function mission(units: Unit[], patch: Partial<MissionState> = {}): MissionState {
  return { ...missionOf({ map: openSea(16, 9), units }), ...patch };
}

function run(state: MissionState, command: GameCommand, config: GameConfig = defaultConfig) {
  return executeCommand(state, command, config);
}

function accepted(result: CommandResult) {
  if (!result.ok || result.state.status !== 'in_progress') throw new Error('commande refusée');
  return { state: result.state, events: result.events };
}

const endActivation: GameCommand = { type: 'END_ACTIVATION', unitId: 'fremm' };

/** Missile hostile en vol de (0,4) vers (8,4), à 6 hexagones de la FREMM alliée en (6,4). */
const hostileMissile = aProjectile({
  side: 'hostile',
  launcherId: 'gone',
  route: rowRoute(4, 0, 8),
});

describe('séquence : activation, réaction, progression des projectiles (G-06.6)', () => {
  it('fait progresser un projectile lancé pendant l’activation dans la même séquence (AB-48)', () => {
    const fremm = makeUnit('fremm', 'friend', 'fremm', { col: 2, row: 4 });
    const h = inactive(makeUnit('h', 'hostile', 'frigate_da', { col: 9, row: 4 }));
    const start = mission([fremm, h], {
      friendContacts: [identified('C-1', { col: 9, row: 4 }, 'h')],
    });
    const fired = accepted(
      run(start, {
        type: 'FIRE',
        unitId: 'fremm',
        weapon: 'missile',
        target: { contactId: 'C-1' },
      }),
    );
    expect(fired.state.projectiles[0]!.position).toEqual({ col: 2, row: 4 });
    const done = accepted(run(fired.state, endActivation));
    expect(done.state.projectiles[0]!.position).toEqual({ col: 4, row: 4 });
  });

  it('ne fait progresser les projectiles que sur une activation achevée, pas à un déplacement', () => {
    const fremm = makeUnit('fremm', 'friend', 'fremm', { col: 2, row: 4 });
    const start = mission([fremm], { projectiles: [aProjectile({ route: rowRoute(4, 0, 8) })] });
    const moved = accepted(
      run(start, { type: 'MOVE_UNIT', unitId: 'fremm', destination: { col: 2, row: 6 } }),
    );
    expect(moved.state.projectiles[0]!.position).toEqual({ col: 0, row: 4 });
  });

  it('une fin d’activation sans réaction (aucun ennemi disponible) fait quand même progresser', () => {
    const fremm = makeUnit('fremm', 'friend', 'fremm', { col: 2, row: 12 % 9 });
    const h = inactive(makeUnit('h', 'hostile', 'frigate_da', { col: 9, row: 8 }));
    const start = mission([fremm, h, makeUnit('b', 'friend', 'fremm', { col: 1, row: 8 })], {
      projectiles: [aProjectile({ route: rowRoute(4, 0, 8) })],
    });
    const done = accepted(run(start, endActivation));
    expect(done.state.projectiles[0]!.position).toEqual({ col: 2, row: 4 });
  });

  it('la fin anticipée du cycle avec une activation en cours fait progresser une fois (AB-48)', () => {
    const fremm = {
      ...makeUnit('fremm', 'friend', 'fremm', { col: 2, row: 7 }),
      activation: 'in_progress' as const,
      hasMoved: true,
    };
    const other = makeUnit('b', 'friend', 'fremm', { col: 1, row: 8 });
    const h = inactive(makeUnit('h', 'hostile', 'frigate_da', { col: 14, row: 0 }));
    const start = mission([fremm, other, h], {
      projectiles: [aProjectile({ route: rowRoute(4, 0, 8), position: { col: 0, row: 4 } })],
    });
    const closed = accepted(run(start, { type: 'END_CYCLE_EARLY' }));
    // Une progression avant la clôture : 2 hexagones, puis le cycle suivant s'ouvre.
    expect(closed.state.cycle).toBe(2);
    expect(closed.state.projectiles[0]!.position).toEqual({ col: 2, row: 4 });
  });

  it('la fin anticipée sans activation en cours ne fait pas progresser', () => {
    const fremm = makeUnit('fremm', 'friend', 'fremm', { col: 2, row: 7 });
    const h = inactive(makeUnit('h', 'hostile', 'frigate_da', { col: 14, row: 0 }));
    const start = mission([fremm, h], {
      projectiles: [aProjectile({ route: rowRoute(4, 0, 8) })],
    });
    const closed = accepted(run(start, { type: 'END_CYCLE_EARLY' }));
    expect(closed.state.projectiles[0]!.position).toEqual({ col: 0, row: 4 });
  });
});

describe('fin de mission après une séquence (G-13.1, AB-48)', () => {
  it('lutte navale : la destruction du dernier ennemi déclare la victoire, sans ouvrir de cycle', () => {
    const fremm = makeUnit('fremm', 'friend', 'fremm', { col: 2, row: 7 });
    const last = {
      ...inactive(makeUnit('h', 'hostile', 'frigate_da', { col: 3, row: 4 })),
      hp: 10,
    };
    const start = mission([fremm, last], {
      projectiles: [aProjectile({ position: { col: 1, row: 4 }, route: rowRoute(4, 1, 8) })],
    });
    const { state, events } = accepted(run(start, endActivation, sureHit(40)));
    expect(state.outcome).toBe('victory');
    expect(state.outcomeCause).toBe('hostile_fleet_destroyed');
    expect(state.cycle).toBe(1);
    expect(events.map((e) => e.type)).toEqual(['PROJECTILE_IMPACT', 'MISSION_WON']);
    expect(events.at(-1)).toMatchObject({ cause: 'hostile_fleet_destroyed' });
  });

  it('les commandes sont refusées après la fin, et les projectiles en vol restent gelés (AB-02)', () => {
    const fremm = makeUnit('fremm', 'friend', 'fremm', { col: 2, row: 7 });
    const last = {
      ...inactive(makeUnit('h', 'hostile', 'frigate_da', { col: 3, row: 4 })),
      hp: 10,
    };
    const other = aProjectile({
      id: 'P-2',
      launchNumber: 2,
      position: { col: 0, row: 0 },
      route: rowRoute(0, 0, 8),
      aimedHex: { col: 8, row: 0 },
    });
    const start = mission([fremm, last], {
      projectiles: [aProjectile({ position: { col: 1, row: 4 }, route: rowRoute(4, 1, 8) }), other],
    });
    const { state } = accepted(run(start, endActivation, sureHit(40)));
    expect(state.outcome).toBe('victory');
    expect(state.projectiles.map((p) => p.id)).toEqual(['P-2']);
    // Le second projectile a progressé avec la séquence qui a décidé de la fin, jamais après.
    const frozen = state.projectiles[0]!.position;
    const refused = run(state, { type: 'END_CYCLE_EARLY' });
    expect(refused).toMatchObject({ ok: false, error: { code: 'MISSION_ENDED' } });
    expect(state.projectiles[0]!.position).toEqual(frozen);
  });

  it('lutte navale : la destruction de la dernière unité alliée déclare la défaite', () => {
    const fremm = { ...makeUnit('fremm', 'friend', 'fremm', { col: 2, row: 4 }), hp: 10 };
    const h = inactive(makeUnit('h', 'hostile', 'frigate_da', { col: 12, row: 4 }));
    const start = mission([fremm, h], { projectiles: [hostileMissile] });
    const { state, events } = accepted(run(start, endActivation, sureHit(40)));
    expect(state.outcome).toBe('defeat');
    expect(state.outcomeCause).toBe('all_units_destroyed');
    expect(state.units.map((u) => u.id)).toEqual(['h']);
    expect(events.at(-1)).toEqual({ type: 'MISSION_LOST', cycle: 1, cause: 'all_units_destroyed' });
  });

  it('escorte : la destruction du porte-avions déclare la défaite', () => {
    const carrier = { ...makeUnit('carrier', 'friend', 'carrier', { col: 2, row: 4 }), hp: 10 };
    const escortShip = makeUnit('fremm', 'friend', 'fremm', { col: 2, row: 8 });
    const h = inactive(makeUnit('h', 'hostile', 'frigate_da', { col: 12, row: 0 }));
    const base = mission([carrier, escortShip, h], { projectiles: [hostileMissile] });
    const start: MissionState = {
      ...base,
      setup: { ...base.setup, mission: 'escort' },
      goal: { col: 15, row: 4 },
      carrierNavigation: { mode: 'continue', waypoint: null, orderUsed: false },
    };
    const { state } = accepted(run(start, endActivation, sureHit(40)));
    expect(state.outcome).toBe('defeat');
    expect(state.outcomeCause).toBe('carrier_destroyed');
  });

  it('une mission qui continue n’est pas déclarée terminée', () => {
    const fremm = makeUnit('fremm', 'friend', 'fremm', { col: 2, row: 4 });
    const h = inactive(makeUnit('h', 'hostile', 'frigate_da', { col: 9, row: 8 }));
    const other = makeUnit('b', 'friend', 'fremm', { col: 1, row: 8 });
    const { state } = accepted(run(mission([fremm, h, other]), endActivation));
    expect(state.outcome).toBeNull();
    expect(state.outcomeCause).toBeNull();
  });
});
