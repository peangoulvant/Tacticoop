// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as engine from '../../engine';
import { useGameStore } from '../../store/game.store';
import { useSaveStore } from '../../store/save.store';
import { App } from '../App';

/*
 * Reprise d'une partie sauvegardée (AB-08). La lecture du stockage et la validation sont testées
 * dans la persistance et le store ; ici, la sauvegarde trouvée au démarrage est posée dans le store
 * de sauvegarde, comme le fait `startPersistence`, pour vérifier ce que le joueur voit et fait.
 */

/** Mission lancée par le moteur (lutte navale, une frégate DA), au cycle 3 pour la reconnaître. */
function savedMission(): engine.MissionState {
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
  return { ...state, cycle: 3 };
}

beforeEach(() => {
  // Les stores sont des singletons : chaque test repart d'une préparation sans sauvegarde.
  useGameStore.getState().reset();
  useSaveStore.setState({ found: null, writeFailed: false, lastSavedAt: null });
  act(() =>
    useSaveStore.getState().setFound({
      schemaVersion: 7,
      savedAt: '2026-11-06T12:30:00.000Z',
      state: savedMission(),
      events: [
        { type: 'MISSION_LAUNCHED', mission: 'naval_combat', cycle: 1 },
        { type: 'CYCLE_STARTED', cycle: 3 },
      ],
    }),
  );
});

describe('reprise de la partie sauvegardée', () => {
  it('propose la reprise, puis restaure la partie : écran tactique, cycle et journal', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText('Une partie est en cours')).toBeInTheDocument();
    expect(screen.getByText(/Lutte navale — cycle 3/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reprendre la partie en cours' }));

    expect(screen.getByText('Cycle 3 / ∞')).toBeInTheDocument();
    expect(screen.getByText('Mission : Lutte navale')).toBeInTheDocument();
    expect(screen.getByText('Mission lancée : Lutte navale')).toBeInTheDocument();
    expect(screen.getByText('Cycle 3 ouvert')).toBeInTheDocument();
    expect(screen.queryByText('Une partie est en cours')).not.toBeInTheDocument();
  });

  it('« Nouvelle partie » masque la proposition et reste sur la préparation', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Nouvelle partie' }));

    expect(screen.queryByText('Une partie est en cours')).not.toBeInTheDocument();
    expect(screen.getByText('Wargame naval tactique — préparation de mission')).toBeInTheDocument();
    expect(screen.queryByText(/Cycle \d+ \/ ∞/)).not.toBeInTheDocument();
  });
});
