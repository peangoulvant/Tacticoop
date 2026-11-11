import * as engine from '../../engine';
import { isRecord } from './guards.validator';
import { checkEvents } from './event.validator';
import { checkMissionState } from './save.validator';

/**
 * Version du format. La version 2 ajoutait les contacts et l'état du générateur (AB-24) ; la
 * version 3 ajoute l'action spéciale utilisée des unités et les contacts identifiés (AB-30) ; la
 * version 4 ajoute le cycle du dernier usage de chaque action spéciale (AB-33, AB-34). Une autre
 * version, les versions 1 à 3 comprises, est refusée : aucune migration n'existe en V1
 * (AB-08).
 */
export const SAVE_SCHEMA_VERSION = 4;

/** Pourquoi une sauvegarde est refusée (diagnostic ; aucun message n'est affiché au joueur, voir AB-08). */
export const SaveErrorCode = {
  INVALID_JSON: 'INVALID_JSON',
  UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION',
  INVALID_DATA: 'INVALID_DATA',
} as const;
export type SaveErrorCode = (typeof SaveErrorCode)[keyof typeof SaveErrorCode];

/**
 * Sauvegarde d'une mission en cours : l'état de la partie et le journal de bord. La sélection et
 * les brouillons d'action relèvent de l'interface et ne sont jamais sauvegardés. Le hasard est
 * conservé sous forme d'état du générateur dans la mission (`rngState`), jamais de graine : une
 * reprise poursuit la même suite de tirages (AB-24).
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

/** JSON d'une sauvegarde, prêt à être stocké dans IndexedDB. */
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
