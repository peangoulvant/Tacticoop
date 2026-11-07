import type { CommandResult, GameError, GameErrorCode, GameEvent, GameState } from './game.types';

export function reject(
  code: GameErrorCode,
  message: string,
  extra?: Partial<GameError>,
): CommandResult {
  return { ok: false, error: { code, message, ...extra } };
}

/** Commande acceptée : nouvel état et événements produits. */
export function accept(state: GameState, events: GameEvent[] = []): CommandResult {
  return {
    ok: true,
    state,
    events,
  };
}
