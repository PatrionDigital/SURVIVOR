import { create } from "zustand";

/**
 * Player position for persistence across navigation
 */
export interface PlayerPosition {
  x: number;
  y: number;
}

/**
 * Player profile stub for future implementation
 * Will contain player stats, equipped gear, and progression
 */
export interface PlayerProfile {
  id: string | null;
  name: string | null;
  level: number;
  experience: number;
  // Future: equipped gear, achievements, etc.
}

export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  score: number;
  level: number;
  survivalTime: number;
  enemiesKilled: number;

  // Player position for persistence across navigation
  playerPosition: PlayerPosition | null;

  // Player profile stub (future implementation)
  playerProfile: PlayerProfile;
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

  // Player position actions
  setPlayerPosition: (position: PlayerPosition | null) => void;

  // Player profile actions (stubs for future implementation)
  setPlayerProfile: (profile: Partial<PlayerProfile>) => void;

  reset: () => void;
}

const initialPlayerProfile: PlayerProfile = {
  id: null,
  name: null,
  level: 1,
  experience: 0,
};

const initialState: GameState = {
  isPlaying: false,
  isPaused: false,
  score: 0,
  level: 1,
  survivalTime: 0,
  enemiesKilled: 0,
  playerPosition: null,
  playerProfile: initialPlayerProfile,
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

  // Player position persistence
  setPlayerPosition: (position) => set({ playerPosition: position }),

  // Player profile stub (future implementation)
  setPlayerProfile: (profile) =>
    set((state) => ({
      playerProfile: { ...state.playerProfile, ...profile },
    })),

  reset: () => {
    clearAfkTimeout();
    set(initialState);
  },
}));
