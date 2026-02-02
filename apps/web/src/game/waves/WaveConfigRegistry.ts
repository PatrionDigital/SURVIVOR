import type { WaveConfig, WavePhase, TimedEvent } from "./types";

/**
 * WaveConfigRegistry - Manages wave configuration definitions
 *
 * Stores and provides access to wave configurations that can be loaded
 * from JSON files or registered programmatically. Provides validation
 * and query methods for wave phases and events.
 */
export class WaveConfigRegistry {
  private configs: Map<string, WaveConfig> = new Map();

  /**
   * Register a wave configuration
   * @throws Error if config with same id already exists
   */
  register(config: WaveConfig): void {
    if (this.configs.has(config.id)) {
      throw new Error(`Wave config '${config.id}' is already registered`);
    }
    this.configs.set(config.id, config);
  }

  /**
   * Get a wave configuration by id
   * @returns The configuration or undefined if not found
   */
  get(id: string): WaveConfig | undefined {
    return this.configs.get(id);
  }

  /**
   * Get a wave configuration by id, throwing if not found
   * @throws Error if config not found
   */
  getOrThrow(id: string): WaveConfig {
    const config = this.configs.get(id);
    if (!config) {
      throw new Error(`Wave config '${id}' not found`);
    }
    return config;
  }

  /**
   * Check if a configuration is registered
   */
  has(id: string): boolean {
    return this.configs.has(id);
  }

  /**
   * Get all registered configurations
   */
  getAll(): WaveConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Get all registered configuration ids
   */
  getIds(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Unregister a configuration
   * @returns true if config was removed, false if not found
   */
  unregister(id: string): boolean {
    return this.configs.delete(id);
  }

  /**
   * Remove all registered configurations
   */
  clear(): void {
    this.configs.clear();
  }

  /**
   * Load and register a configuration from JSON string
   * @throws Error if JSON is invalid
   */
  loadFromJSON(json: string): WaveConfig {
    const config = JSON.parse(json) as WaveConfig;
    this.register(config);
    return config;
  }

  /**
   * Get the phase active at a given time
   * @param configId - Configuration id
   * @param time - Game time in ms
   * @returns The active phase or undefined if none
   */
  getPhaseAt(configId: string, time: number): WavePhase | undefined {
    const config = this.configs.get(configId);
    if (!config) return undefined;

    return config.phases.find((phase) => time >= phase.startTime && time < phase.endTime);
  }

  /**
   * Get events that should trigger within a time range
   * @param configId - Configuration id
   * @param startTime - Range start in ms
   * @param endTime - Range end in ms
   * @returns Events within the range
   */
  getEventsInRange(configId: string, startTime: number, endTime: number): TimedEvent[] {
    const config = this.configs.get(configId);
    if (!config) return [];

    return config.events.filter(
      (event) => event.triggerTime >= startTime && event.triggerTime < endTime
    );
  }

  /**
   * Validate a wave configuration
   * @returns true if valid, false otherwise
   */
  static validateConfig(config: WaveConfig): boolean {
    // Check required fields
    if (!config.id || config.id.trim() === "") {
      return false;
    }

    if (!config.phases || !Array.isArray(config.phases)) {
      return false;
    }

    // Validate phases
    for (const phase of config.phases) {
      // Check phase timing
      if (phase.startTime >= phase.endTime) {
        return false;
      }
    }

    // Check for overlapping phases
    const sortedPhases = [...config.phases].sort((a, b) => a.startTime - b.startTime);
    for (let i = 1; i < sortedPhases.length; i++) {
      const prevPhase = sortedPhases[i - 1];
      const currPhase = sortedPhases[i];
      if (currPhase.startTime < prevPhase.endTime) {
        return false;
      }
    }

    return true;
  }
}
