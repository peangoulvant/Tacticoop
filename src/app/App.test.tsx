import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { useGameStore } from '../store/useGameStore';
import { useSelectionStore } from '../store/useSelectionStore';

beforeEach(() => {
  useGameStore.getState().reset();
  useSelectionStore.setState({ selectedUnitId: null, selectedHex: null, zoom: 1 });
});

describe('parcours de préparation et de lancement', () => {
  it("bloque le lancement sans bâtiment puis l'autorise avec un navire", async () => {
    const user = userEvent.setup();
    render(<App />);
    const launch = screen.getByRole('button', { name: 'Lancer la mission' });
    expect(launch).toBeDisabled();
    expect(screen.getByText('Sélectionnez au moins un bâtiment.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ajouter FREMM multimission' }));
    expect(screen.getByText('Budget engagé : 35 / 100 points')).toBeInTheDocument();
    expect(launch).toBeEnabled();
  });

  it('affiche le dépassement de budget après « Moyens limités » et garde le lancement bloqué', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (let i = 0; i < 2; i++) {
      await user.click(screen.getByRole('button', { name: 'Ajouter FREMM multimission' }));
    }
    await user.click(screen.getByRole('button', { name: 'Ajouter Frégate DA' }));
    await user.click(screen.getByRole('checkbox', { name: /Moyens limités/ }));
    expect(screen.getByText('Dépassement : 25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lancer la mission' })).toBeDisabled();
  });

  it('refuse une troisième contrainte avec un message', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('checkbox', { name: /Moyens limités/ }));
    await user.click(screen.getByRole('checkbox', { name: /munitions/ }));
    await user.click(screen.getByRole('checkbox', { name: /Capteurs/ }));
    expect(screen.getByText('Choisir entre 0 et 2 contraintes distinctes.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Capteurs/ })).not.toBeChecked();
  });

  it("lance la mission, affiche l'interface tactique et permet de sélectionner une unité", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ajouter Frégate ASM' }));
    await user.click(screen.getByRole('button', { name: 'Lancer la mission' }));

    expect(screen.getByRole('img', { name: 'Carte tactique' })).toBeInTheDocument();
    expect(screen.getByText('Cycle 1 / ∞')).toBeInTheDocument();
    expect(screen.getByText(/Mission lancée : Escorte de porte-avions/)).toBeInTheDocument();
    expect(
      screen.getByText('Sélectionnez une unité sur la carte ou dans les forces alliées.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Porte-avions' }));
    const heading = screen.getByRole('heading', { name: 'Porte-avions' });
    expect(heading).toBeInTheDocument();
    expect(
      within(heading.closest('div')!.parentElement!.parentElement!).getByRole('button', {
        name: 'Déplacement',
      }),
    ).toBeDisabled();
  });
});
