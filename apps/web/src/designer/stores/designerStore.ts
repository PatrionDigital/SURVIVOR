import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EnemyTypeConfig, EnemyTypeConfigJSON } from "@game/enemies/types";
import type { WaveConfig } from "@game/waves/types";
import { parseEnemyTypeConfig, validateEnemyTypeConfig } from "@game/enemies/types";

/**
 * Default enemy config for new enemies
 */
const DEFAULT_ENEMY_CONFIG: EnemyTypeConfigJSON = {
  id: "new-enemy",
  name: "New Enemy",
  visual: {
    color: "0xff4444",
    radius: 15,
  },
  combat: {
    damage: 10,
    health: 100,
    xpValue: 10,
  },
  movement: {
    maxSpeed: 100,
    maxForce: 150,
    mass: 1.0,
  },
  flocking: {
    alignment: 0.2,
    cohesion: 0.0,
    separation: 15.0,
  },
  vision: {
    range: 250,
    fieldOfView: 360,
  },
  behavior: {
    seekWeight: 1.0,
  },
};

/**
 * Preview canvas state
 */
interface PreviewState {
  isPaused: boolean;
  timeScale: number;
  enemyCount: number;
}

/**
 * Designer store state
 */
interface DesignerState {
  // Enemy configs (stored as JSON format for easy serialization)
  enemies: Record<string, EnemyTypeConfigJSON>;
  selectedEnemyId: string | null;

  // Wave configs
  waves: Record<string, WaveConfig>;
  selectedWaveId: string | null;

  // Preview state
  preview: PreviewState;

  // Actions - Enemies
  addEnemy: (config?: Partial<EnemyTypeConfigJSON>) => string;
  updateEnemy: (id: string, updates: Partial<EnemyTypeConfigJSON>) => void;
  deleteEnemy: (id: string) => void;
  selectEnemy: (id: string | null) => void;
  importEnemy: (json: unknown) => { success: boolean; error?: string; id?: string };
  getEnemyConfig: (id: string) => EnemyTypeConfig | null;

  // Actions - Waves
  addWave: (config?: Partial<WaveConfig>) => string;
  updateWave: (id: string, updates: Partial<WaveConfig>) => void;
  deleteWave: (id: string) => void;
  selectWave: (id: string | null) => void;
  importWave: (json: unknown) => { success: boolean; error?: string; id?: string };

  // Actions - Preview
  setPreviewPaused: (paused: boolean) => void;
  setPreviewTimeScale: (scale: number) => void;
  setPreviewEnemyCount: (count: number) => void;

  // Actions - Persistence
  resetToDefaults: () => void;
  loadFromGame: () => Promise<void>;
}

/**
 * Generate a unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

/**
 * Designer store with localStorage persistence
 */
export const useDesignerStore = create<DesignerState>()(
  persist(
    (set, get) => ({
      // Initial state
      enemies: {},
      selectedEnemyId: null,
      waves: {},
      selectedWaveId: null,
      preview: {
        isPaused: false,
        timeScale: 1,
        enemyCount: 5,
      },

      // Enemy actions
      addEnemy: (config) => {
        const id = generateId("enemy");
        const newConfig: EnemyTypeConfigJSON = {
          ...DEFAULT_ENEMY_CONFIG,
          ...config,
          id,
          name: config?.name || `Enemy ${Object.keys(get().enemies).length + 1}`,
        };
        set((state) => ({
          enemies: { ...state.enemies, [id]: newConfig },
          selectedEnemyId: id,
        }));
        return id;
      },

      updateEnemy: (id, updates) => {
        set((state) => {
          const existing = state.enemies[id];
          if (!existing) return state;
          return {
            enemies: {
              ...state.enemies,
              [id]: { ...existing, ...updates },
            },
          };
        });
      },

      deleteEnemy: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.enemies;
          return {
            enemies: rest,
            selectedEnemyId: state.selectedEnemyId === id ? null : state.selectedEnemyId,
          };
        });
      },

      selectEnemy: (id) => {
        set({ selectedEnemyId: id });
      },

      importEnemy: (json) => {
        if (!validateEnemyTypeConfig(json)) {
          return { success: false, error: "Invalid enemy configuration" };
        }
        const config = json as EnemyTypeConfigJSON;
        const id = config.id || generateId("enemy");
        const finalConfig = { ...config, id };

        set((state) => ({
          enemies: { ...state.enemies, [id]: finalConfig },
          selectedEnemyId: id,
        }));

        return { success: true, id };
      },

      getEnemyConfig: (id) => {
        const jsonConfig = get().enemies[id];
        if (!jsonConfig) return null;
        return parseEnemyTypeConfig(jsonConfig);
      },

      // Wave actions
      addWave: (config) => {
        const id = generateId("wave");
        const newConfig: WaveConfig = {
          id,
          name: config?.name || `Wave ${Object.keys(get().waves).length + 1}`,
          version: "1.0.0",
          phases: [],
          events: [],
          globalSettings: {
            baseSpawnInterval: 2000,
            minSpawnInterval: 500,
            maxGameTime: 20 * 60 * 1000,
          },
          ...config,
        };
        set((state) => ({
          waves: { ...state.waves, [id]: newConfig },
          selectedWaveId: id,
        }));
        return id;
      },

      updateWave: (id, updates) => {
        set((state) => {
          const existing = state.waves[id];
          if (!existing) return state;
          return {
            waves: {
              ...state.waves,
              [id]: { ...existing, ...updates },
            },
          };
        });
      },

      deleteWave: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.waves;
          return {
            waves: rest,
            selectedWaveId: state.selectedWaveId === id ? null : state.selectedWaveId,
          };
        });
      },

      selectWave: (id) => {
        set({ selectedWaveId: id });
      },

      importWave: (json) => {
        // Basic validation - check required fields
        const config = json as WaveConfig;
        if (!config.id || !config.name || !config.phases || !config.globalSettings) {
          return { success: false, error: "Invalid wave configuration" };
        }

        const id = config.id || generateId("wave");
        const finalConfig = { ...config, id };

        set((state) => ({
          waves: { ...state.waves, [id]: finalConfig },
          selectedWaveId: id,
        }));

        return { success: true, id };
      },

      // Preview actions
      setPreviewPaused: (paused) => {
        set((state) => ({
          preview: { ...state.preview, isPaused: paused },
        }));
      },

      setPreviewTimeScale: (scale) => {
        set((state) => ({
          preview: { ...state.preview, timeScale: scale },
        }));
      },

      setPreviewEnemyCount: (count) => {
        set((state) => ({
          preview: { ...state.preview, enemyCount: count },
        }));
      },

      // Persistence actions
      resetToDefaults: () => {
        set({
          enemies: {},
          selectedEnemyId: null,
          waves: {},
          selectedWaveId: null,
          preview: {
            isPaused: false,
            timeScale: 1,
            enemyCount: 5,
          },
        });
      },

      loadFromGame: async () => {
        // Load enemy configs from public/data/enemies/
        try {
          const basicResponse = await fetch("/data/enemies/basic.json");
          if (basicResponse.ok) {
            const basicJson = await basicResponse.json();
            if (validateEnemyTypeConfig(basicJson)) {
              set((state) => ({
                enemies: {
                  ...state.enemies,
                  [basicJson.id]: basicJson,
                },
              }));
            }
          }
        } catch (error) {
          console.error("Failed to load enemy configs from game:", error);
        }
      },
    }),
    {
      name: "designer-store",
      partialize: (state) => ({
        enemies: state.enemies,
        waves: state.waves,
        preview: state.preview,
      }),
    }
  )
);

/**
 * Export enemy config as JSON file
 */
export function exportEnemyConfig(config: EnemyTypeConfigJSON): void {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${config.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export wave config as JSON file
 */
export function exportWaveConfig(config: WaveConfig): void {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${config.id}-wave.json`;
  a.click();
  URL.revokeObjectURL(url);
}
