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

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  startGame: () => set({ isPlaying: true, isPaused: false }),
  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),
  endGame: () => set({ isPlaying: false, isPaused: false }),
  incrementScore: (amount) => set((state) => ({ score: state.score + amount })),
  incrementLevel: () => set((state) => ({ level: state.level + 1 })),
  setEnemiesKilled: (count) => set({ enemiesKilled: count }),
  setSurvivalTime: (time) =>
    set((state) => ({
      survivalTime: typeof time === "function" ? time(state.survivalTime) : time,
    })),
  reset: () => set(initialState),
}));
