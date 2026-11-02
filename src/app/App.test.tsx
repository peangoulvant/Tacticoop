import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { useGameStore } from '../store/useGameStore';
import { useSelectionStore } from '../store/useSelectionStore';

beforeEach(() => {
  useGameStore.getState().reset();
  useSelectionStore.setState({ selectedUnitId: null, selectedHex: null });
});

/** Les étapes du stepper n'affichent leur contenu que lorsqu'elles sont actives. */
const goTo = (user: ReturnType<typeof userEvent.setup>, step: RegExp) =>
  user.click(screen.getByRole('tab', { name: step }));

describe('parcours de préparation et de lancement', () => {
  it('avance et recule dans le stepper avec Suivant et Précédent', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText(/Renseignement initial : aucun/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Précédent' }));
    expect(screen.getByRole('button', { name: 'Lutte navale' })).toBeInTheDocument();
  });

  it("bloque le lancement sans bâtiment puis l'autorise avec un navire", async () => {
    const user = userEvent.setup();
    render(<App />);
    await goTo(user, /Récapitulatif/);
    expect(screen.getByRole('button', { name: 'Lancer la mission' })).toBeDisabled();
    expect(screen.getByText('Sélectionnez au moins un bâtiment.')).toBeInTheDocument();

    await goTo(user, /Force navale/);
    await user.click(screen.getByRole('button', { name: 'Ajouter FREMM multimission' }));
    expect(screen.getByText('Budget engagé : 35 / 100 points')).toBeInTheDocument();
    await goTo(user, /Récapitulatif/);
    expect(screen.getByRole('button', { name: 'Lancer la mission' })).toBeEnabled();
    expect(screen.getByText('1 × FREMM multimission')).toBeInTheDocument();
  });

  it('affiche le dépassement de budget après « Moyens limités » et garde le lancement bloqué', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goTo(user, /Force navale/);
    for (let i = 0; i < 2; i++) {
      await user.click(screen.getByRole('button', { name: 'Ajouter FREMM multimission' }));
    }
    await user.click(screen.getByRole('button', { name: 'Ajouter Frégate DA' }));
    await goTo(user, /Contraintes/);
    await user.click(screen.getByRole('checkbox', { name: /Moyens limités/ }));
    await goTo(user, /Force navale/);
    expect(screen.getByText('Dépassement : 25')).toBeInTheDocument();
    await goTo(user, /Récapitulatif/);
    expect(screen.getByRole('button', { name: 'Lancer la mission' })).toBeDisabled();
    expect(screen.getByText('Le budget est dépassé : retirez des bâtiments.')).toBeInTheDocument();
  });

  it('refuse une troisième contrainte avec un message', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goTo(user, /Contraintes/);
    await user.click(screen.getByRole('checkbox', { name: /Moyens limités/ }));
    await user.click(screen.getByRole('checkbox', { name: /munitions/ }));
    await user.click(screen.getByRole('checkbox', { name: /Capteurs/ }));
    expect(screen.getByText('Choisir entre 0 et 2 contraintes distinctes.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Capteurs/ })).not.toBeChecked();
  });

  it("lance la mission, affiche l'interface tactique et permet de sélectionner une unité", async () => {
    const user = userEvent.setup();
    render(<App />);
    await goTo(user, /Force navale/);
    await user.click(screen.getByRole('button', { name: 'Ajouter Frégate ASM' }));
    await goTo(user, /Récapitulatif/);
    await user.click(screen.getByRole('button', { name: 'Lancer la mission' }));

    expect(screen.getByRole('img', { name: 'Carte tactique' })).toBeInTheDocument();
    expect(screen.getByText('Cycle 1 / ∞')).toBeInTheDocument();
    expect(screen.getByText(/Mission lancée : Escorte de porte-avions/)).toBeInTheDocument();
    expect(
      screen.getByText('Sélectionnez une unité sur la carte ou dans les forces alliées.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Porte-avions' }));
    expect(screen.getByRole('heading', { name: 'Porte-avions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Déplacement' })).toBeDisabled();
  });
});
