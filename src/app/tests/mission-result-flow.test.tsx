// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react';
import * as engine from '../../engine';
import { useGameStore } from '../../store/game.store';
import { useSelectionStore } from '../../store/selection.store';
import { App } from '../App';

/*
 * Bandeau de résultat d'une mission terminée (G-13.2 Q2) : victoire ou défaite, avec sa cause.
 * La partie est fabriquée par le moteur, puis terminée par l'état, sans rejouer le combat
 * (le moteur le couvre dans `combat-sequence.test.ts`).
 */

function launched(): engine.MissionState {
  let state: engine.GameState = { status: 'preparation', setup: engine.initialSetup() };
  const commands: engine.GameCommand[] = [
    { type: 'SELECT_MISSION', mission: 'naval_combat' },
    { type: 'ADD_SHIP', shipClass: 'frigate_da' },
    { type: 'LAUNCH_MISSION', seed: 3 },
  ];
  for (const command of commands) {
    const result = engine.executeCommand(state, command, engine.defaultConfig);
    if (!result.ok) throw new Error(result.error.message);
    state = result.state;
  }
  if (state.status !== 'in_progress') throw new Error('mission non lancée');
  return state;
}

beforeEach(() => {
  useGameStore.getState().reset();
  useSelectionStore.getState().selectUnit(null);
  useSelectionStore.getState().selectHex(null);
});

function startOn(mission: engine.MissionState, events: engine.GameEvent[]) {
  act(() => useGameStore.getState().restore(mission, events));
  render(<App />);
}

describe('bandeau de résultat', () => {
  it('annonce la victoire de la lutte navale avec sa cause', () => {
    const won: engine.MissionState = {
      ...launched(),
      outcome: 'victory',
      outcomeCause: 'hostile_fleet_destroyed',
    };
    startOn(won, [{ type: 'MISSION_WON', cycle: 1, cause: 'hostile_fleet_destroyed' }]);
    expect(screen.getByRole('heading', { name: 'Mission réussie' })).toBeInTheDocument();
    expect(screen.getAllByText('La flotte ennemie est détruite.').length).toBeGreaterThan(0);
  });

  it('annonce la défaite avec sa cause, et propose une nouvelle partie', () => {
    const lost: engine.MissionState = {
      ...launched(),
      outcome: 'defeat',
      outcomeCause: 'all_units_destroyed',
    };
    startOn(lost, [{ type: 'MISSION_LOST', cycle: 1, cause: 'all_units_destroyed' }]);
    expect(screen.getByRole('heading', { name: 'Mission perdue' })).toBeInTheDocument();
    expect(screen.getAllByText('Toutes vos unités sont détruites.').length).toBeGreaterThan(0);
    expect(
      within(screen.getByRole('status')).getByRole('button', { name: 'Nouvelle partie' }),
    ).toBeInTheDocument();
  });

  it('n’affiche aucun bandeau tant que la mission continue', () => {
    startOn(launched(), []);
    expect(
      screen.queryByRole('heading', { name: /Mission (réussie|perdue)/ }),
    ).not.toBeInTheDocument();
  });
});
