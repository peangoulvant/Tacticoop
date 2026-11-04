import type { CommandResult, GameError, GameErrorCode, GameEvent, GameState } from './types';

export const reject = (
  code: GameErrorCode,
  message: string,
  extra?: Partial<GameError>,
): CommandResult => ({ ok: false, error: { code, message, ...extra } });

/** Commande acceptée : nouvel état et événements produits. */
export const accept = (state: GameState, events: GameEvent[] = []): CommandResult => ({
  ok: true,
  state,
  events,
});
