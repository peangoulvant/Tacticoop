// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as engine from '../../engine';
import { useActionResultStore } from '../../store/action-result.store';
import { useFireDraftStore } from '../../store/fire-draft.store';
import { useGameStore } from '../../store/game.store';
import { useMoveDraftStore } from '../../store/move-draft.store';
import { useSelectionStore } from '../../store/selection.store';
import { useSweepDraftStore } from '../../store/sweep-draft.store';
import { App } from '../App';

/*
 * Parcours du tir : boutons, brouillon (arme, cible, zone), récapitulatif, avertissements,
 * confirmation, retour, refus sans consommation. La partie est fabriquée par le moteur puis
 * repositionnée sur une mer ouverte, avec des contacts posés à la main : le résultat ne dépend ni
 * du relief ni du hasard.
 *
 * Limite de jsdom (`document.elementFromPoint` absent) : le clic sur la carte, qui choisit la case
 * d'une zone ou une cible, est posé directement dans le store du brouillon (`chooseTarget`). Le
 * dessin des projectiles, des tracés et des cases surlignées se vérifie dans un navigateur.
 */

const FRIGATE = { col: 6, row: 6 };
const HOSTILE_AT = { col: 9, row: 6 }; // à 3 hexagones : à portée du missile comme de la torpille
const FAR_AT = { col: 16, row: 6 }; // hors de portée des deux armes

function launched(): engine.MissionState {
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

/** Mission sur mer ouverte avec les contacts donnés du camp ami ; le premier hostile est en `hostileAt`. */
function mission(
  contacts: (hostileId: string) => engine.MissionState['friendContacts'],
  options: { hostileAt?: engine.Hex; submarineAt?: engine.Hex } = {},
): engine.MissionState {
  const base = launched();
  const [frigate, submarine] = base.units.filter((u) => u.side === 'friend');
  const [hostile, ...others] = base.units.filter((u) => u.side === 'hostile');
  const farAway = [
    { col: 18, row: 2 },
    { col: 18, row: 11 },
  ];
  const friendContacts = contacts(hostile!.id);
  return {
    ...base,
    map: { width: 20, height: 14, terrain: Array(20 * 14).fill('sea') },
    start: { col: 1, row: 6 },
    units: [
      { ...frigate!, position: FRIGATE },
      { ...submarine!, position: options.submarineAt ?? { col: 4, row: 9 } },
      { ...hostile!, position: options.hostileAt ?? HOSTILE_AT },
      ...others.map((u, i) => ({ ...u, position: farAway[i]! })),
    ],
    friendContacts,
    nextContactNumber: friendContacts.length + 1,
  };
}

function identifiedAt(position: engine.Hex) {
  return (source: string): engine.MissionState['friendContacts'] => [
    { kind: 'identified', id: 'C-1', cycle: 1, targetType: 'frigate', position, source },
  ];
}

beforeEach(() => {
  useGameStore.getState().reset();
  useMoveDraftStore.getState().cancelDraft();
  useSweepDraftStore.getState().cancelDraft();
  useFireDraftStore.getState().cancelDraft();
  useActionResultStore.getState().clear();
  useSelectionStore.getState().selectUnit(null);
  useSelectionStore.getState().selectHex(null);
});

/** Projectiles de l'état réel de la partie (le test lit l'état, jamais l'interface). */
function projectilesOf() {
  const { state } = useGameStore.getState();
  return state.status === 'in_progress' ? state.projectiles : [];
}

async function startAndSelect(state: engine.MissionState, unitName: RegExp = /Frégate DA/) {
  const user = userEvent.setup();
  act(() =>
    useGameStore
      .getState()
      .restore(state, [{ type: 'MISSION_LAUNCHED', mission: 'naval_combat', cycle: 1 }]),
  );
  render(<App />);
  await user.click(screen.getByRole('button', { name: unitName }));
  return user;
}

describe('tir de missile sur un contact identifié', () => {
  it('prépare le tir, récapitule arme, cible et stock, puis confirme : retour, journal, stock, action consommée', async () => {
    const user = await startAndSelect(mission(identifiedAt(HOSTILE_AT)));
    const stock = engine.defaultConfig.ships.frigate_da.missiles;

    await user.click(screen.getByRole('button', { name: 'Tirer un missile' }));
    expect(screen.getByText(/cible à choisir/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmer le tir' })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Cible'), 'C-1');
    expect(
      screen.getByText(`Frégate DA : missile, contact C-1 (frégate) (${stock} restants)`),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmer le tir' }));

    expect(screen.getByText('Missile lancé')).toBeInTheDocument();
    expect(screen.getByText(/Frégate DA : tir de missile sur le contact C-1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Frégate DA, En cours/ })).toBeInTheDocument();
    // Le stock s'affiche dans la fiche de l'unité et dans le panneau des forces.
    expect(screen.getAllByLabelText(`Missiles ${stock - 1}`).length).toBeGreaterThan(0);
    expect(screen.queryAllByLabelText(`Missiles ${stock}`)).toHaveLength(0);
    // Une seule action spéciale par activation : les deux tirs et le balayage sont désactivés.
    for (const name of ['Tirer un missile', 'Tirer une torpille', 'Balayage']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    expect(projectilesOf()).toHaveLength(1);
  });

  it('annule sans rien consommer', async () => {
    const user = await startAndSelect(mission(identifiedAt(HOSTILE_AT)));
    await user.click(screen.getByRole('button', { name: 'Tirer un missile' }));
    await user.selectOptions(screen.getByLabelText('Cible'), 'C-1');
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.queryByLabelText('Cible')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tirer un missile' })).toBeEnabled();
    expect(projectilesOf()).toHaveLength(0);
    expect(screen.queryByText(/tir de missile/)).not.toBeInTheDocument();
  });

  it('propose seulement les cibles à portée : sinon « Aucune cible à portée » et rien à confirmer', async () => {
    const user = await startAndSelect(mission(identifiedAt(FAR_AT)));
    await user.click(screen.getByRole('button', { name: 'Tirer un missile' }));
    expect(screen.getByText(/Aucune cible à portée/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Cible')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmer le tir' })).toBeDisabled();
  });

  it('ne propose pas un contact identifié ancien (il faut le rebalayer)', async () => {
    const stale = (source: string): engine.MissionState['friendContacts'] => [
      {
        kind: 'identified',
        id: 'C-1',
        cycle: 0,
        targetType: 'frigate',
        position: HOSTILE_AT,
        source,
      },
    ];
    const user = await startAndSelect(mission(stale));
    await user.click(screen.getByRole('button', { name: 'Tirer un missile' }));
    expect(screen.getByText(/Aucune cible à portée/)).toBeInTheDocument();
  });
});

describe('avertissement de ligne de tir (AB-45)', () => {
  it('torpille : prévient quand la route croise une unité alliée, sans empêcher le tir', async () => {
    const state = mission(identifiedAt(HOSTILE_AT), { submarineAt: { col: 7, row: 6 } });
    const user = await startAndSelect(state);
    await user.click(screen.getByRole('button', { name: 'Tirer une torpille' }));
    await user.selectOptions(screen.getByLabelText('Cible'), 'C-1');

    expect(screen.getByText(/la route de la torpille croise une unité alliée/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmer le tir' }));
    expect(screen.getByText('Torpille lancée')).toBeInTheDocument();
  });

  it('sans unité alliée sur la route, aucun avertissement', async () => {
    const user = await startAndSelect(mission(identifiedAt(HOSTILE_AT)));
    await user.click(screen.getByRole('button', { name: 'Tirer une torpille' }));
    await user.selectOptions(screen.getByLabelText('Cible'), 'C-1');
    expect(screen.queryByText(/Attention/)).not.toBeInTheDocument();
  });
});

describe('tir sur une zone suspecte', () => {
  const zone = [
    { col: 8, row: 6 },
    { col: 9, row: 6 },
  ];
  const suspect = (source: string): engine.MissionState['friendContacts'] => [
    { kind: 'suspect', id: 'C-1', cycle: 1, zone, source },
  ];

  it('demande un hexagone de la zone avant de pouvoir confirmer', async () => {
    const user = await startAndSelect(mission(suspect));
    await user.click(screen.getByRole('button', { name: 'Tirer un missile' }));
    await user.selectOptions(screen.getByLabelText('Cible'), 'C-1');

    expect(screen.getByText(/hexagone à choisir sur la carte/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmer le tir' })).toBeDisabled();

    // Effet du clic sur la case (8, 6) de la carte (voir la limite de jsdom ci-dessus).
    act(() => useFireDraftStore.getState().chooseTarget('C-1', { col: 8, row: 6 }));
    expect(screen.getByText(/zone C-1, hexagone \(8, 6\)/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmer le tir' }));
    expect(screen.getByText('Missile lancé')).toBeInTheDocument();
    expect(screen.getByText(/hexagone choisi \(8, 6\)/)).toBeInTheDocument();
  });
});

describe('indisponibilité du tir', () => {
  it('un sous-marin n’a pas de missile : bouton désactivé avec son motif', async () => {
    const state = mission(identifiedAt(HOSTILE_AT), { submarineAt: { col: 7, row: 5 } });
    const user = await startAndSelect(state, /Sous-marin/);
    expect(screen.getByRole('button', { name: 'Tirer un missile' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tirer une torpille' })).toBeEnabled();
    expect(
      screen.getByText(/Tirer un missile : Cette unité n’a plus de munitions/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tirer une torpille' }));
    expect(screen.getByLabelText('Cible')).toBeInTheDocument();
  });

  it('consulter une autre unité conserve le brouillon (SF-03.12)', async () => {
    const user = await startAndSelect(mission(identifiedAt(HOSTILE_AT)));
    await user.click(screen.getByRole('button', { name: 'Tirer un missile' }));
    await user.click(screen.getByRole('button', { name: /Sous-marin/ }));
    expect(screen.getByLabelText('Cible')).toBeInTheDocument();
  });
});
