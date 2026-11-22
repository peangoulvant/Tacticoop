// @vitest-environment jsdom
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as engine from '../../engine';
import { useGameStore } from '../../store/game.store';
import { useMoveDraftStore } from '../../store/move-draft.store';
import { useSelectionStore } from '../../store/selection.store';
import { useSweepDraftStore } from '../../store/sweep-draft.store';
import { useActionResultStore } from '../../store/action-result.store';
import { App } from '../App';

/*
 * Parcours de l'écran tactique : commandes des unités, déplacement, balayage, fin de cycle. La
 * partie est fabriquée par le moteur puis repositionnée sur une carte de mer ouverte : le résultat
 * ne dépend ni du relief généré ni du hasard (le tirage du balayage est fixé par `rngState`).
 *
 * Limite de jsdom : il n'implémente pas `document.elementFromPoint`, que la carte utilise pour
 * retrouver la case cliquée. Le choix de la destination est donc posé directement dans le store
 * du brouillon (`previewDestination`, ce que fait le clic sur la carte) ; le clic lui-même, le
 * zoom et le glisser de la carte relèvent d'un vrai navigateur.
 */

const FRIGATE = { col: 6, row: 6 };
const HOSTILE_IN_RANGE = { col: 9, row: 6 }; // à 3 hexagones : dans la portée de balayage
const HOSTILE_FAR = { col: 16, row: 6 }; // à 10 hexagones : hors de portée

/** Portée de balayage de la frégate DA, lue dans la configuration, et son texte dans la barre de brouillon. */
const SWEEP_RANGE = engine.defaultConfig.ships.frigate_da.detection!.sweepRange;
const DRAFT_TEXT = new RegExp(`balayage, portée ${SWEEP_RANGE} hexagones`);

/** Mission lancée par le moteur, comme l'application : une frégate DA et un sous-marin alliés. */
function launchedMission(): engine.MissionState {
  let state: engine.GameState = { status: 'preparation', setup: engine.initialSetup() };
  const commands: engine.GameCommand[] = [
    { type: 'SELECT_MISSION', mission: 'naval_combat' },
    { type: 'ADD_SHIP', shipClass: 'frigate_da' },
    { type: 'ADD_SHIP', shipClass: 'submarine' },
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

/** Mission sur mer ouverte : unités alliées et premier navire hostile placés, tirage fixé. */
function mission(hostileAt: engine.Hex, rngState: number): engine.MissionState {
  const launched = launchedMission();
  const [frigate, submarine] = launched.units.filter((u) => u.side === 'friend');
  const [hostile, ...otherHostiles] = launched.units.filter((u) => u.side === 'hostile');
  const farAway = [
    { col: 18, row: 2 },
    { col: 18, row: 11 },
  ];
  return {
    ...launched,
    map: { width: 20, height: 14, terrain: Array(20 * 14).fill('sea') },
    start: { col: 1, row: 6 },
    rngState,
    units: [
      { ...frigate!, position: FRIGATE },
      { ...submarine!, position: { col: 4, row: 9 } },
      { ...hostile!, position: hostileAt },
      ...otherHostiles.map((u, i) => ({ ...u, position: farAway[i]! })),
    ],
  };
}

/** Premier état du générateur pour lequel le balayage identifie (ou non) le navire hostile. */
function rngStateWhere(identifies: boolean, hostileAt: engine.Hex): number {
  for (let seed = 1; seed < 200; seed++) {
    const result = engine.executeCommand(
      mission(hostileAt, seed),
      { type: 'SWEEP', unitId: 'friend-frigate_da-1' },
      engine.defaultConfig,
    );
    const found =
      result.ok &&
      result.events.some((e) => e.type === 'SWEEP_PERFORMED' && e.identified.length > 0);
    if (found === identifies) return seed;
  }
  throw new Error('aucun état du hasard ne convient');
}

beforeEach(() => {
  // Les stores sont des singletons : chaque test repart d'une partie et d'une interface vierges.
  useGameStore.getState().reset();
  useMoveDraftStore.getState().cancelDraft();
  useSweepDraftStore.getState().cancelDraft();
  useActionResultStore.getState().clear();
  useSelectionStore.getState().selectUnit(null);
  useSelectionStore.getState().selectHex(null);
});

/** Démarre l'application sur la mission donnée et sélectionne la frégate DA. */
async function startAndSelectFrigate(state: engine.MissionState) {
  const user = userEvent.setup();
  act(() =>
    useGameStore
      .getState()
      .restore(state, [{ type: 'MISSION_LAUNCHED', mission: 'naval_combat', cycle: 1 }]),
  );
  render(<App />);
  await user.click(screen.getByRole('button', { name: /Frégate DA/ }));
  return user;
}

describe('état des composants (SF-03.6, AB-54)', () => {
  it('montre sur la fiche les quatre composants, ceux hors service signalés', async () => {
    const base = mission(HOSTILE_FAR, 1);
    const damaged: engine.MissionState = {
      ...base,
      units: base.units.map((u) =>
        u.id === 'friend-frigate_da-1' ? { ...u, disabledComponents: ['sensors', 'hull'] } : u,
      ),
    };
    await startAndSelectFrigate(damaged);
    // La fiche d'unité et la carte de la frégate affichent chacune l'état ; le sous-marin intact
    // (carte seule) ajoute un composant en service.
    expect(screen.getAllByLabelText('Capteurs hors service')).toHaveLength(2);
    expect(screen.getAllByLabelText('Coque hors service')).toHaveLength(2);
    expect(screen.getAllByLabelText('Propulsion en service')).toHaveLength(3);
    expect(screen.getAllByLabelText('Armement en service')).toHaveLength(3);
    expect(screen.queryByLabelText('Armement hors service')).not.toBeInTheDocument();
  });
});

describe('commandes et déplacement', () => {
  it('annule un déplacement sans rien consommer, puis le confirme et engage l’activation', async () => {
    const user = await startAndSelectFrigate(mission(HOSTILE_FAR, 1));
    // Le panneau d'unité n'annonce plus de futures actions spéciales.
    expect(screen.queryByText(/Les autres actions spéciales/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Déplacement' }));
    expect(screen.getByText(/choisissez une destination/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByText(/choisissez une destination/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Déplacement' })).toBeEnabled();
    expect(screen.queryByText(/déplacement de/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Déplacement' }));
    // Effet du clic sur la case (7, 6) de la carte (voir la limite de jsdom ci-dessus).
    act(() => useMoveDraftStore.getState().previewDestination({ col: 7, row: 6 }));
    expect(screen.getByText(/trajet de 1 hexagone/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    expect(screen.getByText('Frégate DA : déplacement de (6, 6) vers (7, 6)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Frégate DA, En cours/ })).toBeInTheDocument();
    // Déjà déplacée : le déplacement est désactivé avec son motif (un par activation).
    expect(screen.getByRole('button', { name: 'Déplacement' })).toBeDisabled();
    expect(screen.getByText(/s’est déjà déplacée/)).toBeInTheDocument();
  });

  it('désactive les commandes des autres unités tant qu’une activation est en cours (SF-03.8)', async () => {
    const user = await startAndSelectFrigate(mission(HOSTILE_FAR, 1));
    await user.click(screen.getByRole('button', { name: 'Déplacement' }));
    act(() => useMoveDraftStore.getState().previewDestination({ col: 7, row: 6 }));
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    // Consulter une autre unité est libre, mais elle ne reçoit pas d'ordre.
    await user.click(screen.getByRole('button', { name: /Sous-marin/ }));
    expect(screen.getByRole('button', { name: 'Déplacement' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Balayage' })).toBeDisabled();
    expect(screen.getByText(/Une autre unité est en cours d’activation/)).toBeInTheDocument();
  });
});

describe('balayage', () => {
  it('ouvre un brouillon sans paramètre et l’annule sans consommer l’action', async () => {
    const user = await startAndSelectFrigate(mission(HOSTILE_IN_RANGE, 1));

    await user.click(screen.getByRole('button', { name: 'Balayage' }));
    expect(screen.getByText(DRAFT_TEXT)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByText(DRAFT_TEXT)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Balayage' })).toBeEnabled();
    expect(screen.queryByText(/Balayage \(/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Frégate DA, Disponible/ })).toBeInTheDocument();
  });

  it.each([
    {
      name: 'identifie un navire à portée : retour explicite, journal et action consommée',
      hostileAt: HOSTILE_IN_RANGE,
      identifies: true,
      toast: 'Contact identifié',
      journal: /Balayage \(Frégate DA\) : contact identifié C-1, (frégate|sous-marin) en \(9, 6\)/,
    },
    {
      name: 'sans navire à portée : « Aucun nouveau contact », et l’action est tout de même consommée',
      hostileAt: HOSTILE_FAR,
      identifies: false,
      toast: 'Aucun nouveau contact',
      journal: /Balayage \(Frégate DA\) : aucun nouveau contact/,
    },
  ])('$name', async ({ hostileAt, identifies, toast, journal }) => {
    const user = await startAndSelectFrigate(
      mission(hostileAt, rngStateWhere(identifies, hostileAt)),
    );

    await user.click(screen.getByRole('button', { name: 'Balayage' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    expect(screen.getByRole('alert')).toHaveTextContent(toast);
    expect(screen.getByText(journal)).toBeInTheDocument();
    expect(screen.queryByText(DRAFT_TEXT)).not.toBeInTheDocument();
    // Action consommée même sans résultat : bouton désactivé avec son motif.
    expect(screen.getByRole('button', { name: 'Balayage' })).toBeDisabled();
    expect(
      screen.getByText(/L’action spéciale de cette unité a déjà été utilisée/),
    ).toBeInTheDocument();
  });
});

describe('fin de cycle', () => {
  it('termine l’activation en cours puis ouvre le cycle suivant, balayage en récupération (AB-31, AB-34)', async () => {
    const user = await startAndSelectFrigate(mission(HOSTILE_FAR, 1));
    await user.click(screen.getByRole('button', { name: 'Balayage' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(screen.getByRole('button', { name: /Frégate DA, En cours/ })).toBeInTheDocument();

    // L'activation est en cours, mais « Terminer le cycle » reste possible et le dit.
    await user.click(screen.getByRole('button', { name: 'Terminer le cycle' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('L’activation en cours sera terminée.');
    expect(dialog).toHaveTextContent('1 unité n’a pas été activée : son activation sera perdue.');
    await user.click(within(dialog).getByRole('button', { name: 'Terminer le cycle' }));

    // La fermeture du dialogue est animée : tant qu'elle dure, le reste de la page est masqué.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Cycle 2 / ∞')).toBeInTheDocument();
    expect(screen.getByText('Cycle 2 ouvert')).toBeInTheDocument();
    // Nouveau cycle : l'unité est de nouveau disponible, mais le balayage récupère un cycle.
    expect(screen.getByRole('button', { name: 'Déplacement' })).toBeEnabled();
    // Pendant la récupération : bouton désactivé, compte à rebours (1 cycle) et cycle de retour en info-bulle.
    const sweep = screen.getByRole('button', { name: 'Balayage' });
    expect(sweep).toBeDisabled();
    expect(within(sweep).getByText('1')).toBeInTheDocument();
    expect(sweep).toHaveAttribute(
      'title',
      expect.stringContaining('de nouveau possible au cycle 3'),
    );
    expect(screen.queryByText(/en récupération/)).not.toBeInTheDocument();
  });
});

describe("réaction de l'IA ennemie", () => {
  it('joue après l’activation du joueur sans laisser aucune trace dans l’interface ni le journal', async () => {
    const user = await startAndSelectFrigate(mission(HOSTILE_FAR, 1));
    await user.click(screen.getByRole('button', { name: 'Terminer l’activation' }));

    // Le moteur a bien fait jouer une unité ennemie (état réel, hors de la vue du joueur)...
    const state = useGameStore.getState().state;
    if (state.status !== 'in_progress') throw new Error('mission non en cours');
    expect(
      state.units.filter((u) => u.side === 'hostile' && u.activation === 'activated'),
    ).toHaveLength(1);

    // ... mais ni les événements, ni la page n'en disent rien, et le joueur garde la main.
    expect(JSON.stringify(useGameStore.getState().events)).not.toContain('hostile');
    expect(document.body.textContent).not.toMatch(/hostile/i);
    expect(screen.getByRole('button', { name: /Sous-marin, Disponible/ })).toBeInTheDocument();
  });

  it('le décompte de « Terminer le cycle » ne compte que les unités du joueur', async () => {
    const user = await startAndSelectFrigate(mission(HOSTILE_FAR, 1));
    await user.click(screen.getByRole('button', { name: 'Terminer le cycle' }));
    // Deux unités alliées disponibles, trois navires ennemis disponibles : seul le premier compte.
    expect(screen.getByRole('dialog')).toHaveTextContent(
      '2 unités n’ont pas été activées : leurs activations seront perdues.',
    );
  });
});
