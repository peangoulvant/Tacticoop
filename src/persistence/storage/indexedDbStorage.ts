import type { SaveStorage } from './saveStorage';

const DATABASE_NAME = 'tacticoop';
const STORE_NAME = 'saves';
/** Clé de l'unique emplacement : la partie en cours. */
const CURRENT_KEY = 'current';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Requête IndexedDB en échec.'));
  });
}

/** Ouvre la base, en créant le magasin d'objets à la première ouverture (version 1). */
function openDatabase(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  const request = factory.open(name, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
  return requestResult(request);
}

/**
 * Exécute une opération dans une transaction et attend sa **fin** : la donnée est alors réellement
 * enregistrée, ce qui permet de ne confirmer une sauvegarde qu'à ce moment.
 */
function inTransaction(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error ?? new Error('Transaction en échec.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Transaction annulée.'));
  });
}

/**
 * Stockage IndexedDB de la partie en cours. La connexion s'ouvre au premier usage ; si
 * l'ouverture échoue (navigation privée, stockage bloqué), ou si le navigateur la ferme ensuite
 * (données du site effacées depuis un autre onglet, éviction), elle est rouverte à l'usage suivant.
 */
export function createIndexedDbStorage(
  factory: IDBFactory | undefined = globalThis.indexedDB,
  name: string = DATABASE_NAME,
): SaveStorage {
  let connection: Promise<IDBDatabase> | null = null;

  /** Oublie la connexion mise en cache dès qu'elle n'est plus utilisable. */
  function forgetWhenClosed(database: IDBDatabase): IDBDatabase {
    database.onclose = () => {
      connection = null;
    };
    database.onversionchange = () => {
      database.close();
      connection = null;
    };
    return database;
  }

  function connect(): Promise<IDBDatabase> {
    if (!factory) return Promise.reject(new Error('IndexedDB n’est pas disponible.'));
    connection ??= openDatabase(factory, name)
      .then(forgetWhenClosed)
      .catch((error: unknown) => {
        connection = null;
        throw error;
      });
    return connection;
  }

  return {
    read: async () => {
      const value = await inTransaction(await connect(), 'readonly', (s) => s.get(CURRENT_KEY));
      return typeof value === 'string' ? value : null;
    },
    write: async (json) => {
      await inTransaction(await connect(), 'readwrite', (s) => s.put(json, CURRENT_KEY));
    },
    clear: async () => {
      await inTransaction(await connect(), 'readwrite', (s) => s.delete(CURRENT_KEY));
    },
  };
}
