import * as engine from '../../engine';
import { isRecord } from './guards';
import { checkEvents, checkMissionState } from './validation';

/** Version du format. Une autre version est refusée : aucune migration n'existe en V1. */
export const SAVE_SCHEMA_VERSION = 1;

/** Pourquoi une sauvegarde est refusée (messages affichés côté interface). */
export const SaveErrorCode = {
  INVALID_JSON: 'INVALID_JSON',
  UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION',
  INVALID_DATA: 'INVALID_DATA',
} as const;
export type SaveErrorCode = (typeof SaveErrorCode)[keyof typeof SaveErrorCode];

/**
 * Sauvegarde d'une mission en cours : l'état de la partie et le journal de bord. La sélection et
 * les brouillons d'action relèvent de l'interface et ne sont jamais sauvegardés. Aucun hasard n'est
 * conservé : la carte est dans l'état, et les graines ne servent qu'au lancement.
 */
export interface SaveFile {
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  /** Date de la sauvegarde, au format ISO 8601. */
  savedAt: string;
  state: engine.MissionState;
  events: engine.GameEvent[];
}

export type ParseResult =
  { ok: true; save: SaveFile } | { ok: false; code: SaveErrorCode; detail: string };

/** JSON d'une sauvegarde, prêt à être stocké ou exporté dans un fichier. */
export function serializeSave(
  state: engine.MissionState,
  events: readonly engine.GameEvent[],
  savedAt: Date,
): string {
  const save: SaveFile = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: savedAt.toISOString(),
    state,
    events: [...events],
  };
  return JSON.stringify(save);
}

function refusal(code: SaveErrorCode, detail: string): ParseResult {
  return { ok: false, code, detail };
}

/** Problème de la sauvegarde elle-même (date, état, journal), ou `null`. */
function saveProblem(raw: Record<string, unknown>): string | null {
  if (typeof raw.savedAt !== 'string' || Number.isNaN(Date.parse(raw.savedAt))) {
    return 'date de sauvegarde invalide';
  }
  return checkMissionState(raw.state) ?? checkEvents(raw.events);
}

/**
 * Lit et valide une sauvegarde avant tout chargement : JSON valide, version connue, données
 * cohérentes. Au moindre problème, rien n'est chargé et le motif est renvoyé.
 */
export function parseSave(json: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return refusal(SaveErrorCode.INVALID_JSON, 'le contenu n’est pas du JSON valide');
  }
  if (!isRecord(raw))
    return refusal(SaveErrorCode.INVALID_DATA, 'le contenu n’est pas une sauvegarde');
  if (raw.schemaVersion !== SAVE_SCHEMA_VERSION) {
    return refusal(
      SaveErrorCode.UNSUPPORTED_VERSION,
      `version ${String(raw.schemaVersion)} non prise en charge`,
    );
  }
  const problem = saveProblem(raw);
  // Les contrôles ci-dessus garantissent la forme : le transtypage est sûr.
  return problem
    ? refusal(SaveErrorCode.INVALID_DATA, problem)
    : { ok: true, save: raw as unknown as SaveFile };
}
