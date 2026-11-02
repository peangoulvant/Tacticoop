import { create } from 'zustand';
import {
  defaultConfig,
  executeCommand,
  initialSetup,
  type GameCommand,
  type GameError,
  type GameEvent,
  type GameState,
} from '../engine';

interface GameStore {
  /** Source de vérité métier : copie unique du GameState (AT-03). */
  state: GameState;
  /** Événements produits par le moteur, du plus ancien au plus récent (alimente le journal). */
  events: GameEvent[];
  lastError: GameError | null;
  /** Transmet la commande au moteur puis publie le résultat ; renvoie true si elle est acceptée. */
  dispatch: (command: GameCommand) => boolean;
  reset: () => void;
}

const freshState = (): GameState => ({ status: 'preparation', setup: initialSetup() });

export const useGameStore = create<GameStore>((set, get) => ({
  state: freshState(),
  events: [],
  lastError: null,
  dispatch: (command) => {
    const result = executeCommand(get().state, command, defaultConfig);
    if (!result.ok) {
      set({ lastError: result.error });
      return false;
    }
    set((s) => ({ state: result.state, events: [...s.events, ...result.events], lastError: null }));
    return true;
  },
  reset: () => set({ state: freshState(), events: [], lastError: null }),
}));
