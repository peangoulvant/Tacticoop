import { create } from 'zustand';
import * as engine from '../engine';

interface GameStore {
  /** Source de vérité métier : copie unique du GameState (AT-03). */
  state: engine.GameState;
  /** Événements produits par le moteur, du plus ancien au plus récent (alimente le journal). */
  events: engine.GameEvent[];
  lastError: engine.GameError | null;
  /** Transmet la commande au moteur puis publie le résultat ; renvoie true s'il est accepté. */
  dispatch: (command: engine.GameCommand) => boolean;
  clearError: () => void;
  reset: () => void;
  /** Remplace la partie par une sauvegarde déjà validée (reprise) : simple mutation, sans règle de jeu. */
  restore: (state: engine.MissionState, events: engine.GameEvent[]) => void;
}

function freshState(): engine.GameState {
  return {
    status: 'preparation',
    setup: engine.initialSetup(),
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: freshState(),
  events: [],
  lastError: null,
  dispatch: (command) => {
    const result = engine.executeCommand(get().state, command, engine.defaultConfig);
    if (!result.ok) {
      set({ lastError: result.error });
      return false;
    }
    set((s) => ({ state: result.state, events: [...s.events, ...result.events], lastError: null }));
    return true;
  },
  clearError: () => set({ lastError: null }),
  reset: () => set({ state: freshState(), events: [], lastError: null }),
  restore: (state, events) => set({ state, events, lastError: null }),
}));
