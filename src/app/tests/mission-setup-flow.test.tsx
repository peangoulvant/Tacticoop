// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGameStore } from '../../store/game.store';
import { App } from '../App';

/*
 * Parcours de préparation de mission (SF-01) à travers les vrais composants : l'écran, le store
 * et le moteur. Les règles (budget, verrouillage du lancement) sont déjà testées dans le moteur ;
 * ici on vérifie ce que le joueur voit et peut faire.
 */

beforeEach(() => {
  // Le store est un singleton : chaque test repart d'une préparation vierge.
  useGameStore.getState().reset();
  // Le lancement tire sa graine avec Math.random : valeur fixe pour un parcours reproductible.
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Ouvre une étape du stepper (les étapes sont des onglets accessibles). */
async function openStep(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole('tab', { name }));
}

describe('préparation de mission', () => {
  it('bloque le lancement sans bâtiment, puis lance la mission et ouvre l’écran tactique', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openStep(user, /Récapitulatif/);
    expect(screen.getByText('Sélectionnez au moins un bâtiment.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lancer la mission' })).toBeDisabled();

    await openStep(user, /Force navale/);
    await user.click(screen.getByRole('button', { name: 'Ajouter FREMM multimission' }));
    await openStep(user, /Récapitulatif/);
    const launch = screen.getByRole('button', { name: 'Lancer la mission' });
    expect(launch).toBeEnabled();

    await user.click(launch);
    expect(screen.getByText('Mission : Escorte de porte-avions')).toBeInTheDocument();
    expect(screen.getByText('Cycle 1 / ∞')).toBeInTheDocument();
    expect(screen.getByText('Mission lancée : Escorte de porte-avions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /FREMM multimission/ })).toBeInTheDocument();
  });

  it('refuse un achat qui dépasse le budget et dit pourquoi, sans modifier la force', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openStep(user, /Force navale/);
    const add = screen.getByRole('button', { name: 'Ajouter FREMM multimission' });

    // 100 points de budget, 35 par FREMM : deux achats passent, le troisième dépasse (105).
    await user.click(add);
    await user.click(add);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(add);

    expect(screen.getByRole('alert')).toHaveTextContent('Budget insuffisant pour ce bâtiment.');
    expect(screen.getByRole('button', { name: 'Retirer FREMM multimission' })).toBeEnabled();
    await openStep(user, /Récapitulatif/);
    expect(screen.getByText('Force navale — 2 bâtiment(s)')).toBeInTheDocument();
  });
});
