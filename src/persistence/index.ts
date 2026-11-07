// API publique de la couche « persistence » : le store est seul à l'utiliser (règle ESLint).
// Format et validation des sauvegardes JSON : `format/`. Contrat de stockage et implémentation
// IndexedDB : `storage/`.
export {
  SaveErrorCode,
  parseSave,
  serializeSave,
  type ParseResult,
  type SaveFile,
} from './format/save-format.service';
export { createIndexedDbStorage } from './storage/indexed-db-storage.service';
export type { SaveStorage } from './storage/save-storage.types';
