import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SessionState {
  // Auth state
  authToken: string | null;
  playerId: string | null;
  walletAddress: string | null;
  isAuthenticated: boolean;
  // Game session state
  sessionId: string | null;
  startTime: number | null;
  lastHeartbeat: number | null;
  pendingRewards: bigint;
}

interface SessionStore extends SessionState {
  // Auth actions
  setAuth: (token: string, playerId: string, walletAddress: string) => void;
  clearAuth: () => void;
  // Game session actions
  startSession: (sessionId: string) => void;
  endSession: () => void;
  updateHeartbeat: () => void;
  setPendingRewards: (amount: bigint) => void;
  reset: () => void;
}

const initialState: SessionState = {
  authToken: null,
  playerId: null,
  walletAddress: null,
  isAuthenticated: false,
  sessionId: null,
  startTime: null,
  lastHeartbeat: null,
  pendingRewards: 0n,
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      ...initialState,
      setAuth: (authToken, playerId, walletAddress) =>
        set({
          authToken,
          playerId,
          walletAddress,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          authToken: null,
          playerId: null,
          walletAddress: null,
          isAuthenticated: false,
          sessionId: null,
        }),
      startSession: (sessionId) =>
        set({
          sessionId,
          startTime: Date.now(),
          lastHeartbeat: Date.now(),
        }),
      endSession: () =>
        set({
          sessionId: null,
          startTime: null,
          lastHeartbeat: null,
        }),
      updateHeartbeat: () => set({ lastHeartbeat: Date.now() }),
      setPendingRewards: (amount) => set({ pendingRewards: amount }),
      reset: () => set(initialState),
    }),
    {
      name: "survivor-session",
      partialize: (state) => ({
        authToken: state.authToken,
        playerId: state.playerId,
        walletAddress: state.walletAddress,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
