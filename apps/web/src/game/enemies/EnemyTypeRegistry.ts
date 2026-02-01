import {
  type EnemyTypeConfig,
  type EnemyTypeConfigJSON,
  parseEnemyTypeConfig,
  validateEnemyTypeConfig,
} from "./types";

/**
 * Registry for loading and caching enemy type configurations
 *
 * Loads enemy configs from JSON files and provides access to them.
 * Configs are cached after first load to avoid repeated network requests.
 */
export class EnemyTypeRegistry {
  private configs: Map<string, EnemyTypeConfig> = new Map();
  private basePath: string;

  /**
   * Create a new registry
   * @param basePath - Base path for loading JSON files (default: /data/enemies/)
   */
  constructor(basePath: string = "/data/enemies/") {
    this.basePath = basePath;
  }

  /**
   * Load an enemy type config by ID
   * @param id - Enemy type ID (filename without .json)
   * @returns The config, or null if not found or invalid
   */
  async load(id: string): Promise<EnemyTypeConfig | null> {
    // Return cached if available
    const cached = this.configs.get(id);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${this.basePath}${id}.json`);

      if (!response.ok) {
        console.warn(`Failed to load enemy config '${id}': ${response.status}`);
        return null;
      }

      const json = (await response.json()) as unknown;

      if (!validateEnemyTypeConfig(json)) {
        console.warn(`Invalid enemy config format for '${id}'`);
        return null;
      }

      const config = parseEnemyTypeConfig(json as EnemyTypeConfigJSON);
      this.configs.set(id, config);

      return config;
    } catch (error) {
      console.warn(`Error loading enemy config '${id}':`, error);
      return null;
    }
  }

  /**
   * Load multiple enemy configs at once
   * @param ids - Array of enemy type IDs
   * @returns Promise that resolves when all are loaded (or failed)
   */
  async loadMultiple(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.load(id)));
  }

  /**
   * Get a cached config by ID
   * @param id - Enemy type ID
   * @returns The config, or undefined if not loaded
   */
  get(id: string): EnemyTypeConfig | undefined {
    return this.configs.get(id);
  }

  /**
   * Get all loaded configs
   * @returns Array of all cached configs
   */
  getAll(): EnemyTypeConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Clear all cached configs
   */
  clear(): void {
    this.configs.clear();
  }

  /**
   * Check if a config is loaded
   * @param id - Enemy type ID
   */
  has(id: string): boolean {
    return this.configs.has(id);
  }
}
