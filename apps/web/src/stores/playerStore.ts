import { create } from "zustand";

export interface PlayerStats {
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  attackSpeed: number;
  pickupRange: number;
  xpMultiplier: number;
}

export interface PlayerState {
  address: string | null;
  fid: number | null;
  isConnected: boolean;
  stats: PlayerStats;
  xp: number;
  currentXpThreshold: number;
}

interface PlayerStore extends PlayerState {
  connect: (address: string, fid: number) => void;
  disconnect: () => void;
  setStats: (stats: Partial<PlayerStats>) => void;
  addXp: (amount: number) => void;
  setXpThreshold: (threshold: number) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  reset: () => void;
}

const defaultStats: PlayerStats = {
  health: 100,
  maxHealth: 100,
  damage: 10,
  speed: 200,
  attackSpeed: 1.0,
  pickupRange: 50,
  xpMultiplier: 1.0,
};

const initialState: PlayerState = {
  address: null,
  fid: null,
  isConnected: false,
  stats: defaultStats,
  xp: 0,
  currentXpThreshold: 100,
};

export const usePlayerStore = create<PlayerStore>((set) => ({
  ...initialState,
  connect: (address, fid) => set({ address, fid, isConnected: true }),
  disconnect: () => set({ address: null, fid: null, isConnected: false }),
  setStats: (newStats) =>
    set((state) => ({ stats: { ...state.stats, ...newStats } })),
  addXp: (amount) =>
    set((state) => ({ xp: state.xp + amount * state.stats.xpMultiplier })),
  setXpThreshold: (threshold) => set({ currentXpThreshold: threshold }),
  takeDamage: (amount) =>
    set((state) => ({
      stats: {
        ...state.stats,
        health: Math.max(0, state.stats.health - amount),
      },
    })),
  heal: (amount) =>
    set((state) => ({
      stats: {
        ...state.stats,
        health: Math.min(state.stats.maxHealth, state.stats.health + amount),
      },
    })),
  reset: () => set(initialState),
}));
