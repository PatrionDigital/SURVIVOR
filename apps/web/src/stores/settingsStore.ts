import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SettingsState {
  showVirtualJoystick: boolean;
  useSceneMode: boolean;
}

interface SettingsStore extends SettingsState {
  setShowVirtualJoystick: (show: boolean) => void;
  toggleVirtualJoystick: () => void;
  setSceneMode: (use: boolean) => void;
  toggleSceneMode: () => void;
}

const initialState: SettingsState = {
  showVirtualJoystick: true,
  useSceneMode: true, // Default to scene mode to demo the feature
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...initialState,
      setShowVirtualJoystick: (show) => set({ showVirtualJoystick: show }),
      toggleVirtualJoystick: () =>
        set((state) => ({ showVirtualJoystick: !state.showVirtualJoystick })),
      setSceneMode: (use) => set({ useSceneMode: use }),
      toggleSceneMode: () => set((state) => ({ useSceneMode: !state.useSceneMode })),
    }),
    {
      name: "survivor-settings",
    }
  )
);
