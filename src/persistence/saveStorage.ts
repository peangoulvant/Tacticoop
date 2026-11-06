/**
 * Stockage de la partie en cours : un seul emplacement, qui contient le JSON d'une sauvegarde.
 * Les erreurs de lecture ou d'écriture sont des rejets de promesse, à signaler au joueur ; une
 * écriture n'est confirmée qu'une fois la donnée réellement enregistrée.
 */
export interface SaveStorage {
  /** Contenu enregistré, ou `null` s'il n'y a aucune sauvegarde. */
  read(): Promise<string | null>;
  write(json: string): Promise<void>;
  clear(): Promise<void>;
}

/** Stockage en mémoire, pour les tests et en repli quand IndexedDB est indisponible. */
export function createMemoryStorage(initial: string | null = null): SaveStorage {
  let content = initial;
  return {
    read: async () => content,
    write: async (json) => {
      content = json;
    },
    clear: async () => {
      content = null;
    },
  };
}
