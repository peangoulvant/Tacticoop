import type { CommandResult, GameError, GameErrorCode, GameEvent, GameState } from './game.types';

/**
 * Commande refusée : un code stable pour le code appelant, un message pour le joueur, et
 * éventuellement des détails (`extra`). Un refus ne contient jamais de nouvel état : l'état
 * d'avant reste valable.
 */
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
