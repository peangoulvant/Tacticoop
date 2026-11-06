import * as engine from '../engine';
import * as persistence from '../persistence';
import { startAutoSave } from './autoSave';
import { resumeSavedGame } from './resumeSavedGame';
import { startPersistence } from './startPersistence';
import { useGameStore } from './useGameStore';
import { useSaveStore } from './useSaveStore';
import { useSelectionStore } from './useSelectionStore';

/**
 * Faux stockage : garde le JSON en mémoire et trace les appels. Les écritures peuvent être retenues
 * (`hold`) puis libérées une à une, ou échouer (`failWrites`), pour observer l'ordre des événements.
 */
class FakeStorage implements persistence.SaveStorage {
  content: string | null = null;
  writes: string[] = [];
  clears = 0;
  failWrites = false;
  failReads = false;
  hold = false;
  private releases: (() => void)[] = [];

  async read(): Promise<string | null> {
    if (this.failReads) throw new Error('lecture impossible');
    return this.content;
  }

  async write(json: string): Promise<void> {
    this.writes.push(json);
    if (this.hold) await new Promise<void>((resolve) => this.releases.push(resolve));
    if (this.failWrites) throw new Error('quota dépassé');
    this.content = json;
  }

  async clear(): Promise<void> {
    this.clears += 1;
    this.content = null;
  }

  /** Libère l'écriture retenue la plus ancienne. */
  release(): void {
    this.releases.shift()?.();
  }
}

/** Laisse les promesses du stockage se résoudre. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Raccourci vers l'état courant du store de jeu. */
function game() {
  return useGameStore.getState();
}
const CLOCK = new Date('2026-11-06T09:30:00');

function mission(): engine.MissionState {
  const state = game().state;
  if (state.status !== 'in_progress') throw new Error('mission non lancée');
  return state;
}

/** Prépare et lance une mission d'escorte avec le store, comme l'interface. */
function launch(): void {
  game().dispatch({ type: 'SELECT_MISSION', mission: 'escort' });
  game().dispatch({ type: 'ADD_SHIP', shipClass: 'fremm' });
  game().dispatch({ type: 'ADD_SHIP', shipClass: 'submarine' });
  game().dispatch({ type: 'LAUNCH_MISSION', seed: 11 });
}

/** Déplace la frégate : son activation passe « en cours ». */
function moveFrigate(): string {
  const unit = mission().units.find((u) => u.shipClass === 'fremm')!;
  const [destination] = engine.reachableHexes(mission(), unit, engine.defaultConfig);
  game().dispatch({ type: 'MOVE_UNIT', unitId: unit.id, destination: destination! });
  return unit.id;
}

/** Mission lancée puis un déplacement terminé : une séquence complète de plus que le lancement. */
function playOneSequence(): void {
  const unitId = moveFrigate();
  game().dispatch({ type: 'END_ACTIVATION', unitId });
}

/** État sauvegardé dans le faux stockage, relu avec la validation réelle. */
function stored(storage: FakeStorage): persistence.SaveFile {
  const result = persistence.parseSave(storage.content!);
  if (!result.ok) throw new Error(result.detail);
  return result.save;
}

let storage: FakeStorage;
let stop: () => void;

beforeEach(() => {
  game().reset();
  useSaveStore.setState({ found: null, writeFailed: false, lastSavedAt: null });
  useSelectionStore.getState().selectUnit(null);
  storage = new FakeStorage();
  stop = startAutoSave(storage, () => CLOCK);
});

afterEach(() => stop());

describe('sauvegarde automatique : quand écrire', () => {
  it("n'écrit rien pendant la préparation", async () => {
    game().dispatch({ type: 'SELECT_MISSION', mission: 'escort' });
    game().dispatch({ type: 'ADD_SHIP', shipClass: 'fremm' });
    await settle();
    expect(storage.writes).toHaveLength(0);
    expect(storage.clears).toBe(0);
  });

  it('écrit la mission au lancement, état et journal', async () => {
    launch();
    await settle();
    expect(storage.writes).toHaveLength(1);
    const save = stored(storage);
    expect(save.state).toEqual(mission());
    expect(save.events).toEqual(game().events);
  });

  it("n'écrit rien pendant une activation en cours, puis écrit à sa fin", async () => {
    launch();
    await settle();
    const unitId = moveFrigate();
    await settle();
    expect(mission().units.some((u) => u.activation === 'in_progress')).toBe(true);
    expect(storage.writes).toHaveLength(1);

    game().dispatch({ type: 'END_ACTIVATION', unitId });
    await settle();
    expect(storage.writes).toHaveLength(2);
    expect(stored(storage).state).toEqual(mission());
  });

  it("n'écrit rien quand le moteur refuse une commande", async () => {
    launch();
    await settle();
    const accepted = game().dispatch({ type: 'END_ACTIVATION', unitId: 'inconnue' });
    await settle();
    expect(accepted).toBe(false);
    expect(game().lastError).not.toBeNull();
    expect(storage.writes).toHaveLength(1);
  });

  it('écrase la sauvegarde existante au lancement d’une nouvelle mission', async () => {
    storage.content = 'ancienne sauvegarde';
    launch();
    await settle();
    expect(stored(storage).state).toEqual(mission());
  });

  it('efface la sauvegarde au retour à la préparation', async () => {
    launch();
    await settle();
    game().reset();
    await settle();
    expect(storage.content).toBeNull();
    expect(storage.clears).toBe(1);
  });

  it("n'efface rien quand on est déjà en préparation", async () => {
    storage.content = 'sauvegarde gardée jusqu’au lancement';
    game().reset();
    await settle();
    expect(storage.content).toBe('sauvegarde gardée jusqu’au lancement');
    expect(storage.clears).toBe(0);
  });
});

describe('sauvegarde automatique : écritures et confirmation', () => {
  it('regroupe les écritures rapides : une en cours, la plus récente rejouée', async () => {
    storage.hold = true;
    launch();
    await settle();
    playOneSequence();
    game().dispatch({ type: 'END_CYCLE_EARLY' });
    await settle();
    expect(storage.writes).toHaveLength(1);

    storage.hold = false;
    storage.release();
    await settle();
    expect(storage.writes).toHaveLength(2);
    expect(stored(storage).state).toEqual(mission());
    expect(mission().cycle).toBe(2);
  });

  it("n'affiche l'heure de sauvegarde qu'après confirmation de l'écriture", async () => {
    storage.hold = true;
    launch();
    await settle();
    expect(useSaveStore.getState().lastSavedAt).toBeNull();

    storage.release();
    await settle();
    expect(useSaveStore.getState().lastSavedAt).toEqual(CLOCK);
  });

  it("signale l'échec d'écriture sans bloquer la partie, jusqu'à la prochaine réussite", async () => {
    storage.failWrites = true;
    launch();
    await settle();
    expect(useSaveStore.getState().writeFailed).toBe(true);
    expect(useSaveStore.getState().lastSavedAt).toBeNull();

    playOneSequence();
    await settle();
    expect(mission().units.every((u) => u.activation !== 'in_progress')).toBe(true);

    storage.failWrites = false;
    game().dispatch({ type: 'END_CYCLE_EARLY' });
    await settle();
    expect(useSaveStore.getState().writeFailed).toBe(false);
    expect(useSaveStore.getState().lastSavedAt).toEqual(CLOCK);
  });
});

describe('démarrage et reprise', () => {
  /** Sauvegarde valide d'une mission jouée, déposée dans le faux stockage. */
  async function storeSavedMission(): Promise<persistence.SaveFile> {
    launch();
    playOneSequence();
    game().dispatch({ type: 'END_CYCLE_EARLY' });
    const json = persistence.serializeSave(mission(), game().events, CLOCK);
    game().reset();
    await settle();
    storage.content = json;
    storage.clears = 0;
    storage.writes = [];
    return stored(storage);
  }

  it("propose la sauvegarde trouvée sans rien restaurer sans l'accord du joueur", async () => {
    const saved = await storeSavedMission();
    await startPersistence(storage);
    expect(useSaveStore.getState().found).toEqual(saved);
    expect(game().state.status).toBe('preparation');
    expect(game().events).toEqual([]);
  });

  it("reprend l'état et le journal, et réinitialise la sélection", async () => {
    const saved = await storeSavedMission();
    await startPersistence(storage);
    useSelectionStore.getState().selectUnit('quelconque');
    resumeSavedGame();
    expect(game().state).toEqual(saved.state);
    expect(game().events).toEqual(saved.events);
    expect(useSelectionStore.getState().selectedUnitId).toBeNull();
    expect(useSaveStore.getState().found).toBeNull();
  });

  it('ignore, sans message et sans l’effacer, une sauvegarde invalide', async () => {
    storage.content = '{"schemaVersion": 99}';
    await startPersistence(storage);
    expect(useSaveStore.getState().found).toBeNull();
    expect(storage.content).toBe('{"schemaVersion": 99}');
    expect(storage.clears).toBe(0);
  });

  it('traite une lecture en échec comme une absence de sauvegarde', async () => {
    storage.failReads = true;
    await startPersistence(storage);
    expect(useSaveStore.getState().found).toBeNull();
    expect(game().state.status).toBe('preparation');
  });

  it("garde la sauvegarde quand le joueur choisit « Nouvelle partie », jusqu'au lancement", async () => {
    const saved = await storeSavedMission();
    await startPersistence(storage);
    useSaveStore.getState().dismissFound();
    await settle();
    expect(storage.content).not.toBeNull();
    expect(stored(storage)).toEqual(saved);

    launch();
    await settle();
    expect(stored(storage).state).toEqual(mission());
  });

  it('ne propose pas la sauvegarde si une mission a été lancée pendant la lecture', async () => {
    await storeSavedMission();
    const pending = startPersistence(storage);
    launch();
    await pending;
    expect(useSaveStore.getState().found).toBeNull();
  });
});
