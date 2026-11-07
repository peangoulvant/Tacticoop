/**
 * Contrat de stockage de la partie en cours : un seul emplacement, qui contient le JSON d'une
 * sauvegarde (produit par `serializeSave`, relu par `parseSave`). Le stockage ne connaît rien du
 * format ni du moteur.
 *
 * Les erreurs de lecture ou d'écriture sont des rejets de promesse, à signaler au joueur : il n'y
 * a **aucun repli silencieux** (AB-08), une sauvegarde perdue au rechargement ne doit pas passer
 * pour réussie. Une écriture n'est confirmée qu'une fois la donnée réellement enregistrée.
 *
 * Implémentation de la V1 : `indexed-db-storage.service.ts`.
 */
export interface SaveStorage {
  /** Contenu enregistré, ou `null` s'il n'y a aucune sauvegarde. */
  read(): Promise<string | null>;
  write(json: string): Promise<void>;
  clear(): Promise<void>;
}
