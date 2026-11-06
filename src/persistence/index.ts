// API publique de la couche « persistence » : le store est seul à l'utiliser (règle ESLint).
// Format et validation des sauvegardes JSON : `format/`. Contrat de stockage et implémentation
// IndexedDB : `storage/`.
export {
  SaveErrorCode,
  parseSave,
  serializeSave,
  type ParseResult,
  type SaveFile,
} from './format/saveFormat';
export { createIndexedDbStorage } from './storage/indexedDbStorage';
export type { SaveStorage } from './storage/saveStorage';
