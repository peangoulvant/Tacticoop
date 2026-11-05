import { defaultConfig } from '../config/gameConfig';
import { sameHex } from '../map/hex';
import { isNavigable } from '../map/terrain';
import { terrainAt } from '../map/gameMap';
import { initialSetup } from '../missions/setup';
import { executeCommand } from './executeCommand';
import type { GameCommand, GameState, MissionState } from './types';

function prep(): GameState {
  return { status: 'preparation', setup: initialSetup() };
}

/** Enchaîne des commandes qui doivent toutes réussir. */
function run(commands: GameCommand[], from: GameState = prep()): GameState {
  return commands.reduce((state, command) => {
    const result = executeCommand(state, command, defaultConfig);
    if (!result.ok) throw new Error(result.error.message);
    return result.state;
  }, from);
}

describe('executeCommand — préparation', () => {
  it('ajoute des bâtiments dans la limite du budget de 100 points', () => {
    const state = run([
      { type: 'ADD_SHIP', shipClass: 'fremm' },
      { type: 'ADD_SHIP', shipClass: 'frigate_da' },
      { type: 'ADD_SHIP', shipClass: 'frigate_asm' },
    ]);
    expect(state.setup.force).toMatchObject({ fremm: 1, frigate_da: 1, frigate_asm: 1 });
    const refused = executeCommand(
      state,
      { type: 'ADD_SHIP', shipClass: 'frigate_da' },
      defaultConfig,
    );
    expect(refused).toMatchObject({ ok: false, error: { code: 'BUDGET_EXCEEDED' } });
  });

  it("ne modifie pas l'état reçu, ni sur succès ni sur rejet", () => {
    const state = prep();
    const snapshot = structuredClone(state);
    executeCommand(state, { type: 'ADD_SHIP', shipClass: 'fremm' }, defaultConfig);
    executeCommand(state, { type: 'REMOVE_SHIP', shipClass: 'fremm' }, defaultConfig);
    expect(state).toEqual(snapshot);
  });

  it('refuse de retirer un bâtiment absent', () => {
    const result = executeCommand(
      prep(),
      { type: 'REMOVE_SHIP', shipClass: 'submarine' },
      defaultConfig,
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'NO_SHIP_TO_REMOVE' } });
  });

  it('accepte 0 à 2 contraintes distinctes seulement', () => {
    expect(
      executeCommand(
        prep(),
        { type: 'SET_CONSTRAINTS', constraints: ['bad_weather', 'limited_ammo'] },
        defaultConfig,
      ).ok,
    ).toBe(true);
    for (const constraints of [
      ['bad_weather', 'bad_weather'],
      ['bad_weather', 'limited_ammo', 'limited_means'],
    ] as const) {
      const r = executeCommand(
        prep(),
        { type: 'SET_CONSTRAINTS', constraints: [...constraints] },
        defaultConfig,
      );
      expect(r).toMatchObject({ ok: false, error: { code: 'INVALID_CONSTRAINTS' } });
    }
  });

  it('tire le nombre demandé de contraintes distinctes, de façon reproductible', () => {
    const draw = (seed: number) =>
      run([{ type: 'DRAW_RANDOM_CONSTRAINTS', count: 2, seed }]).setup.constraints;
    expect(new Set(draw(7)).size).toBe(2);
    expect(draw(7)).toEqual(draw(7));
  });

  it('change de mission : garde la difficulté, réinitialise contraintes et force', () => {
    const state = run([
      { type: 'SET_DIFFICULTY', difficulty: 'expert' },
      { type: 'SET_CONSTRAINTS', constraints: ['bad_weather'] },
      { type: 'ADD_SHIP', shipClass: 'fremm' },
      { type: 'SELECT_MISSION', mission: 'naval_combat' },
    ]);
    expect(state.setup).toMatchObject({
      mission: 'naval_combat',
      difficulty: 'expert',
      constraints: [],
    });
    expect(state.setup.force.fremm).toBe(0);
  });

  it('conserve les navires si « Moyens limités » crée un dépassement, mais bloque le lancement', () => {
    const state = run([
      { type: 'ADD_SHIP', shipClass: 'fremm' },
      { type: 'ADD_SHIP', shipClass: 'fremm' },
      { type: 'ADD_SHIP', shipClass: 'frigate_da' },
      { type: 'SET_CONSTRAINTS', constraints: ['limited_means'] },
    ]);
    expect(state.setup.force.fremm).toBe(2);
    const result = executeCommand(state, { type: 'LAUNCH_MISSION', seed: 1 }, defaultConfig);
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'LAUNCH_BLOCKED', blockers: ['BUDGET_EXCEEDED'] },
    });
  });

  it('refuse de lancer sans bâtiment', () => {
    const result = executeCommand(prep(), { type: 'LAUNCH_MISSION', seed: 1 }, defaultConfig);
    expect(result).toMatchObject({ ok: false, error: { blockers: ['NO_SHIP'] } });
  });
});

describe('executeCommand — lancement', () => {
  const launch = (commands: GameCommand[]): MissionState => {
    const state = run([...commands, { type: 'LAUNCH_MISSION', seed: 5 }]);
    if (state.status !== 'in_progress') throw new Error('mission non lancée');
    return state;
  };

  it('en escorte : ajoute le porte-avions hors budget et place chaque unité sur une case valide et unique', () => {
    const state = launch([
      { type: 'ADD_SHIP', shipClass: 'fremm' },
      { type: 'ADD_SHIP', shipClass: 'submarine' },
    ]);
    expect(state.units.map((u) => u.shipClass)).toEqual(['carrier', 'fremm', 'submarine']);
    expect(state.goal).not.toBeNull();
    const keys = new Set(state.units.map((u) => `${u.position.col},${u.position.row}`));
    expect(keys.size).toBe(state.units.length);
    for (const u of state.units) {
      expect(
        isNavigable(terrainAt(state.map, u.position), defaultConfig.ships[u.shipClass].category),
      ).toBe(true);
    }
    expect(sameHex(state.units[0]!.position, state.start)).toBe(true);
  });

  it('en lutte navale : pas de porte-avions ni de point B', () => {
    const state = launch([
      { type: 'SELECT_MISSION', mission: 'naval_combat' },
      { type: 'ADD_SHIP', shipClass: 'fremm' },
    ]);
    expect(state.goal).toBeNull();
    expect(state.units.map((u) => u.shipClass)).toEqual(['fremm']);
  });

  it('applique les contraintes : munitions −30 % (arrondi inférieur) et déplacement plafonné à 2', () => {
    const state = launch([
      { type: 'SET_CONSTRAINTS', constraints: ['limited_ammo', 'bad_weather'] },
      { type: 'ADD_SHIP', shipClass: 'frigate_asm' },
      { type: 'ADD_SHIP', shipClass: 'submarine' },
    ]);
    const asm = state.units.find((u) => u.shipClass === 'frigate_asm')!;
    expect(asm).toMatchObject({ missiles: 1, torpedoes: 4, movement: 2, helicopters: 2 });
    expect(state.units.find((u) => u.shipClass === 'submarine')).toMatchObject({
      torpedoes: 2,
      movement: 2,
    });
    expect(state.units.find((u) => u.shipClass === 'carrier')!.movement).toBe(2);
  });

  it('émet MISSION_LAUNCHED et verrouille la préparation', () => {
    const first = run([{ type: 'ADD_SHIP', shipClass: 'fremm' }]);
    const result = executeCommand(first, { type: 'LAUNCH_MISSION', seed: 3 }, defaultConfig);
    expect(result).toMatchObject({ ok: true, events: [{ type: 'MISSION_LAUNCHED' }] });
    if (!result.ok) return;
    expect(
      executeCommand(result.state, { type: 'ADD_SHIP', shipClass: 'fremm' }, defaultConfig),
    ).toMatchObject({
      ok: false,
      error: { code: 'WRONG_PHASE' },
    });
  });
});
