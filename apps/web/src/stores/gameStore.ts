import { create } from "zustand";

export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  score: number;
  level: number;
  survivalTime: number;
  enemiesKilled: number;
}

interface GameStore extends GameState {
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  incrementScore: (amount: number) => void;
  incrementLevel: () => void;
  setEnemiesKilled: (count: number) => void;
  setSurvivalTime: (time: number | ((prev: number) => number)) => void;
  reset: () => void;
}

const initialState: GameState = {
  isPlaying: false,
  isPaused: false,
  score: 0,
  level: 1,
  survivalTime: 0,
  enemiesKilled: 0,
};

// AFK timeout - auto-end game after 5 minutes of being paused
const AFK_TIMEOUT_MS = 5 * 60 * 1000;
let afkTimeoutId: ReturnType<typeof setTimeout> | null = null;

const clearAfkTimeout = () => {
  if (afkTimeoutId) {
    clearTimeout(afkTimeoutId);
    afkTimeoutId = null;
  }
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  startGame: () => {
    clearAfkTimeout();
    set({ isPlaying: true, isPaused: false });
  },
  pauseGame: () => {
    clearAfkTimeout();
    // Start AFK timeout - auto-end game if paused too long
    afkTimeoutId = setTimeout(() => {
      const state = get();
      if (state.isPlaying && state.isPaused) {
        console.log("AFK timeout - ending game");
        set({ isPlaying: false, isPaused: false });
      }
    }, AFK_TIMEOUT_MS);
    set({ isPaused: true });
  },
  resumeGame: () => {
    clearAfkTimeout();
    set({ isPaused: false });
  },
  endGame: () => {
    clearAfkTimeout();
    set({ isPlaying: false, isPaused: false });
  },
  incrementScore: (amount) => set((state) => ({ score: state.score + amount })),
  incrementLevel: () => set((state) => ({ level: state.level + 1 })),
  setEnemiesKilled: (count) => set({ enemiesKilled: count }),
  setSurvivalTime: (time) =>
    set((state) => ({
      survivalTime: typeof time === "function" ? time(state.survivalTime) : time,
    })),
  reset: () => {
    clearAfkTimeout();
    set(initialState);
  },
}));
