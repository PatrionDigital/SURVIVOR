import { create } from "zustand";

export interface SessionState {
  sessionId: string | null;
  startTime: number | null;
  lastHeartbeat: number | null;
  pendingRewards: bigint;
}

interface SessionStore extends SessionState {
  startSession: (sessionId: string) => void;
  endSession: () => void;
  updateHeartbeat: () => void;
  setPendingRewards: (amount: bigint) => void;
  reset: () => void;
}

const initialState: SessionState = {
  sessionId: null,
  startTime: null,
  lastHeartbeat: null,
  pendingRewards: 0n,
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,
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
}));
