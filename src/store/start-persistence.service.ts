import * as persistence from '../persistence';
import { startAutoSave } from './auto-save.service';
import { useGameStore } from './game.store';
import { useSaveStore } from './save.store';

/**
 * Lit la sauvegarde stockée. Une lecture en échec, une sauvegarde illisible ou incompatible sont
 * traitées comme absentes : aucun message, et la sauvegarde n'est pas effacée (décision du
 * propriétaire, voir PERSISTANCE.md).
 */
async function readSavedGame(
  storage: persistence.SaveStorage,
): Promise<persistence.SaveFile | null> {
  try {
    const json = await storage.read();
    if (json === null) return null;
    const result = persistence.parseSave(json);
    return result.ok ? result.save : null;
  } catch {
    return null;
  }
}

/**
 * Démarrage de la persistance, appelé par `main.tsx` (qui n'importe pas `persistence`) : branche la
 * sauvegarde automatique puis cherche une partie à reprendre. La proposition n'est publiée qu'une
 * fois la lecture terminée, et seulement si le joueur n'a pas déjà lancé une mission entre-temps.
 */
export async function startPersistence(
  storage: persistence.SaveStorage = persistence.createIndexedDbStorage(),
): Promise<void> {
  startAutoSave(storage);
  const found = await readSavedGame(storage);
  if (found && useGameStore.getState().state.status === 'preparation') {
    useSaveStore.getState().setFound(found);
  }
}
