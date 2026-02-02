import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SettingsState {
  // Future settings can be added here (e.g., sound volume, screen shake, etc.)
  soundEnabled: boolean;
  musicEnabled: boolean;
}

interface SettingsStore extends SettingsState {
  setSoundEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  toggleMusic: () => void;
}

const initialState: SettingsState = {
  soundEnabled: true,
  musicEnabled: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...initialState,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setMusicEnabled: (enabled) => set({ musicEnabled: enabled }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
    }),
    {
      name: "survivor-settings",
    }
  )
);
