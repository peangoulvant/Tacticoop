import { IDBFactory } from 'fake-indexeddb';
import { createIndexedDbStorage } from './indexedDbStorage';

describe('stockage IndexedDB : contrat à un seul emplacement', () => {
  it("n'a aucune sauvegarde au départ", async () => {
    expect(await createIndexedDbStorage(new IDBFactory()).read()).toBeNull();
  });

  it('relit ce qui a été écrit', async () => {
    const storage = createIndexedDbStorage(new IDBFactory());
    await storage.write('{"a":1}');
    expect(await storage.read()).toBe('{"a":1}');
  });

  it('écrase la sauvegarde précédente : un seul emplacement', async () => {
    const storage = createIndexedDbStorage(new IDBFactory());
    await storage.write('première');
    await storage.write('seconde');
    expect(await storage.read()).toBe('seconde');
  });

  it('efface la sauvegarde, et effacer sans sauvegarde est sans effet', async () => {
    const storage = createIndexedDbStorage(new IDBFactory());
    await storage.clear();
    await storage.write('contenu');
    await storage.clear();
    expect(await storage.read()).toBeNull();
  });
});

describe('stockage IndexedDB : cas propres à la base', () => {
  it('relit la sauvegarde après réouverture de la base (même factory, nouvelle connexion)', async () => {
    const factory = new IDBFactory();
    await createIndexedDbStorage(factory).write('persistant');
    expect(await createIndexedDbStorage(factory).read()).toBe('persistant');
  });

  it('garde deux bases de noms différents séparées', async () => {
    const factory = new IDBFactory();
    await createIndexedDbStorage(factory, 'a').write('A');
    expect(await createIndexedDbStorage(factory, 'b').read()).toBeNull();
  });

  it("signale l'indisponibilité d'IndexedDB par un rejet, sans planter", async () => {
    const storage = createIndexedDbStorage(undefined);
    await expect(storage.read()).rejects.toThrow(/IndexedDB/);
    await expect(storage.write('x')).rejects.toThrow(/IndexedDB/);
  });

  it("retente l'ouverture après un échec", async () => {
    const factory = new IDBFactory();
    const realOpen = factory.open.bind(factory);
    let failures = 1;
    factory.open = ((...args: Parameters<IDBFactory['open']>) => {
      if (failures-- > 0) throw new Error('stockage bloqué');
      return realOpen(...args);
    }) as IDBFactory['open'];
    const storage = createIndexedDbStorage(factory);
    await expect(storage.write('x')).rejects.toThrow(/bloqué/);
    await storage.write('y');
    expect(await storage.read()).toBe('y');
  });

  it('rouvre la base quand le navigateur la ferme (données du site effacées)', async () => {
    const factory = new IDBFactory();
    const storage = createIndexedDbStorage(factory);
    await storage.write('avant');
    // Effacer la base depuis « un autre onglet » demande la fermeture de la connexion en cache.
    await new Promise<void>((resolve, reject) => {
      const request = factory.deleteDatabase('tacticoop');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    expect(await storage.read()).toBeNull();
    await storage.write('après');
    expect(await storage.read()).toBe('après');
  });
});
