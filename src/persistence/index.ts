// API publique de la couche « persistence » : le store est seul à l'utiliser (STRUCTURE.md).
export { createIndexedDbStorage } from './indexedDbStorage';
export {
  SAVE_SCHEMA_VERSION,
  SaveErrorCode,
  parseSave,
  serializeSave,
  type ParseResult,
  type SaveFile,
} from './saveFormat';
export { createMemoryStorage, type SaveStorage } from './saveStorage';
