import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../config/game.config';
import { observeFriend, observeHostile } from '../../detection/observation.service';
import { indexOf, terrainAt } from '../../map/game-map.service';
import { hexDistance } from '../../map/hex.service';
import { isNavigable } from '../../map/terrain.model';
import { initialSetup, type MissionKind } from '../../missions/setup.service';
import { executeCommand } from '../execute-command.service';
import type { CommandResult, GameCommand, GameEvent, MissionState } from '../game.types';

const SEEDS = Array.from({ length: 25 }, (_, i) => i + 1);

/** Mission lancée : trois navires alliés (2 FREMM, 1 frégate DA) et le porte-avions en escorte. */
function launched(mission: MissionKind, seed: number): MissionState {
  const base = initialSetup();
  const setup = { ...base, mission, force: { ...base.force, fremm: 2, frigate_da: 1 } };
  const result = executeCommand(
    { status: 'preparation', setup },
    { type: 'LAUNCH_MISSION', seed },
    defaultConfig,
  );
  if (!result.ok || result.state.status !== 'in_progress') throw new Error('lancement refusé');
  return result.state;
}

function run(state: MissionState, command: GameCommand): CommandResult {
  return executeCommand(state, command, defaultConfig);
}

function accepted(state: MissionState, command: GameCommand) {
  const result = run(state, command);
  if (!result.ok || result.state.status !== 'in_progress') throw new Error('commande refusée');
  return { state: result.state, events: result.events };
}

function hostilesOf(state: MissionState) {
  return state.units.filter((u) => u.side === 'hostile');
}
function alliesToPlay(state: MissionState) {
  return state.units.filter((u) => u.side === 'friend' && u.activation === 'available');
}

/** Termine l'activation de la première unité alliée disponible. */
function endNextActivation(state: MissionState) {
  const unit = alliesToPlay(state)[0]!;
  return accepted(state, { type: 'END_ACTIVATION', unitId: unit.id });
}

/** Joue `cycles` cycles en terminant chaque cycle par la fin anticipée. */
function playCycles(
  start: MissionState,
  cycles: number,
): { state: MissionState; events: GameEvent[] } {
  let state = start;
  const events: GameEvent[] = [];
  for (let i = 0; i < cycles; i++) {
    const next = accepted(state, { type: 'END_CYCLE_EARLY' });
    state = next.state;
    events.push(...next.events);
  }
  return { state, events };
}

describe.each<MissionKind>(['naval_combat', 'escort'])('IA ennemie en partie (%s)', (kind) => {
  it('une activation ennemie par activation alliée, jamais plus d’une par unité et par cycle', () => {
    for (const seed of SEEDS) {
      let state = launched(kind, seed);
      state = endNextActivation(state).state;
      expect(hostilesOf(state).filter((u) => u.activation === 'activated')).toHaveLength(1);
      state = endNextActivation(state).state;
      expect(hostilesOf(state).filter((u) => u.activation === 'activated')).toHaveLength(2);
      expect(hostilesOf(state).some((u) => u.activation === 'in_progress')).toBe(false);
    }
  });

  it('la clôture fait jouer les ennemis restants, puis tous redeviennent disponibles', () => {
    let moved = 0;
    for (const seed of SEEDS) {
      let state = launched(kind, seed);
      state = endNextActivation(state).state;
      state = endNextActivation(state).state;
      const waiting = hostilesOf(state).find((u) => u.activation === 'available')!;
      const closed = accepted(state, { type: 'END_CYCLE_EARLY' }).state;
      expect(closed.cycle).toBe(2);
      expect(hostilesOf(closed).every((u) => u.activation === 'available')).toBe(true);
      const after = closed.units.find((u) => u.id === waiting.id)!;
      if (hexDistance(after.position, waiting.position) > 0) moved++;
    }
    // Quelques graines placent un ennemi dans une mer fermée par le relief : il ne peut pas avancer.
    expect(moved).toBeGreaterThan(SEEDS.length * 0.7);
  });

  it('aucune action de l’IA n’apparaît dans les événements du joueur', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const start = launched(kind, seed);
      const hostileIds = hostilesOf(start).map((u) => u.id);
      const first = endNextActivation(start);
      const cycles = playCycles(first.state, 3);
      const text = JSON.stringify([first.events, cycles.events]);
      for (const id of hostileIds) expect(text).not.toContain(id);
      expect(text).not.toContain('hostile');
      expect(
        [...first.events, ...cycles.events].filter(
          (e) => e.type === 'UNIT_MOVED' || e.type === 'SWEEP_PERFORMED',
        ),
      ).toEqual(
        [...first.events, ...cycles.events].filter(
          (e) =>
            (e.type === 'UNIT_MOVED' || e.type === 'SWEEP_PERFORMED') &&
            start.units.some((u) => u.id === e.unitId && u.side === 'friend'),
        ),
      );
    }
  });

  it('la projection du joueur ignore les unités de l’IA, ses contacts et ses décisions', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const { state } = playCycles(launched(kind, seed), 4);
      const text = JSON.stringify(observeFriend(state));
      expect(text).not.toContain('hostile-');
      expect(text).not.toContain('hostileContacts');
      expect(text).not.toContain('"source"');
    }
  });

  it('la projection de l’IA ignore les unités alliées, leur point de départ et les contacts du joueur', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const { state } = playCycles(launched(kind, seed), 4);
      const observation = observeHostile(state);
      const text = JSON.stringify(observation);
      expect(text).not.toContain('friend-');
      expect(text).not.toContain('"source"');
      expect(Object.keys(observation)).not.toContain('start');
      expect(observation.goal).toEqual(kind === 'escort' ? state.goal : null);
    }
  });

  it('le joueur ne peut ni commander ni sonder une unité hostile', () => {
    const state = launched(kind, 3);
    const hostile = hostilesOf(state)[0]!;
    const commands: GameCommand[] = [
      { type: 'MOVE_UNIT', unitId: hostile.id, destination: { col: 0, row: 0 } },
      { type: 'END_ACTIVATION', unitId: hostile.id },
      { type: 'SWEEP', unitId: hostile.id },
    ];
    for (const command of commands) {
      const result = run(state, command);
      expect(result.ok ? null : result.error.code).toBe('UNIT_NOT_FOUND');
    }
  });

  it('est reproductible : même graine et mêmes commandes, même partie ; autre graine, autre partie', () => {
    const play = (seed: number) => playCycles(launched(kind, seed), 6).state;
    expect(play(11)).toEqual(play(11));
    expect(play(11)).not.toEqual(play(12));
  });

  it('reste cohérente sur de longues parties : eau navigable, une unité par hexagone, aucun refus', () => {
    for (const seed of SEEDS) {
      let state = launched(kind, seed);
      for (let cycle = 0; cycle < 6 && state.outcome === null; cycle++) {
        state = endNextActivation(state).state;
        state = accepted(state, { type: 'END_CYCLE_EARLY' }).state;
        const cells = state.units.map((u) => indexOf(state.map, u.position));
        expect(new Set(cells).size).toBe(cells.length);
        for (const unit of hostilesOf(state)) {
          const category = defaultConfig.ships[unit.shipClass].category;
          expect(isNavigable(terrainAt(state.map, unit.position), category)).toBe(true);
        }
      }
    }
  });

  it('les ennemis se dirigent vers leur objectif : plus près après plusieurs cycles en général', () => {
    let closer = 0;
    for (const seed of SEEDS) {
      const start = launched(kind, seed);
      const { state } = playCycles(start, 4);
      const target = (map: MissionState) =>
        kind === 'escort' ? (map.goal as MissionState['start']) : { col: 17, row: 17 };
      const distance = (s: MissionState) =>
        hostilesOf(s).reduce((sum, u) => sum + hexDistance(u.position, target(s)), 0);
      if (distance(state) < distance(start)) closer++;
    }
    expect(closer).toBeGreaterThan(SEEDS.length * 0.75);
  });
});

describe("tirs de l'IA en partie (AB-50)", () => {
  /** Joue jusqu'à `cycles` cycles, les alliés restant en place ; s'arrête à la fin de la mission. */
  function playUntil(start: MissionState, cycles: number) {
    let state = start;
    let launches = 0;
    let ended = false;
    for (let i = 0; i < cycles && !ended; i++) {
      const result = run(state, { type: 'END_CYCLE_EARLY' });
      if (!result.ok) throw new Error('commande refusée');
      if (result.state.status !== 'in_progress') {
        ended = true;
      } else {
        state = result.state;
        launches = state.nextLaunchNumber - 1;
      }
    }
    return { state, launches };
  }

  it('tire parfois, jamais sur une zone, et ne montre au joueur que ce que le brouillard autorise', () => {
    let firing = 0;
    for (const seed of SEEDS) {
      const { state, launches } = playUntil(launched('naval_combat', seed), 40);
      if (launches > 0) firing++;
      expect(state.projectiles.every((p) => p.onSuspectZone === false || p.side === 'friend')).toBe(
        true,
      );
      const seen = observeFriend(state).projectiles;
      expect(JSON.stringify(seen)).not.toContain('targetId');
    }
    expect(firing).toBeGreaterThan(0);
  });

  it('est reproductible : même graine, mêmes tirs', () => {
    const first = playUntil(launched('naval_combat', 3), 40);
    const second = playUntil(launched('naval_combat', 3), 40);
    expect(second.state.projectiles).toEqual(first.state.projectiles);
    expect(second.launches).toBe(first.launches);
  });
});
