import * as engine from '../engine';
import * as persistence from '../persistence';
import { useGameStore } from './useGameStore';
import { useSaveStore } from './useSaveStore';

/** Travail à confier au stockage : écrire le JSON d'une sauvegarde, ou effacer l'emplacement. */
type SaveJob = { kind: 'write'; json: string; savedAt: Date } | { kind: 'clear' };

/**
 * Travail de stockage déclenché par un changement d'état, ou `null` s'il n'y en a pas.
 * - Mission en cours sans activation en cours : sauvegarde (séquence complète, AB-08). Une
 *   activation en cours donnerait un état incomplet : rien n'est écrit.
 * - Passage d'une mission à la préparation (« Nouvelle partie », abandon) : effacement.
 * - Préparation seule : rien (seule une mission en cours est sauvegardée).
 */
function jobFor(
  previous: engine.GameState,
  next: engine.GameState,
  events: readonly engine.GameEvent[],
  now: Date,
): SaveJob | null {
  if (next.status === 'in_progress') {
    if (engine.hasActivationInProgress(next.units)) return null;
    return { kind: 'write', json: persistence.serializeSave(next, events, now), savedAt: now };
  }
  return previous.status === 'in_progress' ? { kind: 'clear' } : null;
}

/** Exécute un travail et publie son résultat ; l'heure n'est publiée qu'une fois l'écriture confirmée. */
async function runJob(storage: persistence.SaveStorage, job: SaveJob): Promise<void> {
  const saveStore = useSaveStore.getState();
  try {
    if (job.kind === 'write') {
      await storage.write(job.json);
      saveStore.markSaved(job.savedAt);
    } else {
      await storage.clear();
      saveStore.markCleared();
    }
  } catch {
    saveStore.markWriteFailed();
  }
}

/**
 * File des travaux de stockage : un seul s'exécute à la fois et un seul peut attendre. Une demande
 * arrivée pendant une écriture remplace la précédente en attente, car seul l'état le plus récent
 * compte et les écritures ne doivent pas se doubler ni se terminer dans le désordre.
 */
function createJobQueue(storage: persistence.SaveStorage): (job: SaveJob) => void {
  let waiting: SaveJob | null = null;
  let running = false;

  async function drain(): Promise<void> {
    running = true;
    while (waiting) {
      const job = waiting;
      waiting = null;
      await runJob(storage, job);
    }
    running = false;
  }

  return (job) => {
    waiting = job;
    if (!running) void drain();
  };
}

/** Abonnement en cours : un second démarrage remplace le premier au lieu de doubler les écritures. */
let stopAutoSave: (() => void) | null = null;

/**
 * Branche la sauvegarde automatique sur l'état du jeu : à chaque changement de `state`, le travail
 * de stockage correspondant est mis en file, et la proposition de reprise éventuelle est retirée.
 * Les changements de `lastError` ou du seul journal sont ignorés (`state` reste le même objet).
 * Renvoie la fonction qui débranche l'abonnement.
 */
export function startAutoSave(
  storage: persistence.SaveStorage,
  clock: () => Date = () => new Date(),
): () => void {
  stopAutoSave?.();
  const enqueue = createJobQueue(storage);
  stopAutoSave = useGameStore.subscribe((current, previous) => {
    if (current.state === previous.state) return;
    const job = jobFor(previous.state, current.state, current.events, clock());
    if (!job) return;
    // Toute écriture ou tout effacement rend caduque la proposition de reprise trouvée au démarrage.
    useSaveStore.getState().dismissFound();
    enqueue(job);
  });
  return stopAutoSave;
}
