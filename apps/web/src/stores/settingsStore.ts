import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SettingsState {
  showVirtualJoystick: boolean;
}

interface SettingsStore extends SettingsState {
  setShowVirtualJoystick: (show: boolean) => void;
  toggleVirtualJoystick: () => void;
}

const initialState: SettingsState = {
  showVirtualJoystick: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...initialState,
      setShowVirtualJoystick: (show) => set({ showVirtualJoystick: show }),
      toggleVirtualJoystick: () =>
        set((state) => ({ showVirtualJoystick: !state.showVirtualJoystick })),
    }),
    {
      name: "survivor-settings",
    }
  )
);
