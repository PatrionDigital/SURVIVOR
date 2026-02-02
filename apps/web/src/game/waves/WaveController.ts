import type { WaveConfig, WavePhase, TimedEvent } from "./types";
import { WaveConfigRegistry } from "./WaveConfigRegistry";
import { WaveManager, type PhaseChangeCallback, type EventCallback } from "./WaveManager";
import {
  EventExecutor,
  type SpawnCommand,
  type EventWarning,
  type WarningCallback,
} from "./EventExecutor";

/**
 * Spawn configuration derived from wave system
 */
export interface WaveSpawnConfig {
  /** Enemy types to spawn */
  enemyTypes: string[];
  /** Spawn rate multiplier */
  spawnRateMultiplier: number;
  /** Maximum enemies */
  maxEnemies: number;
  /** Health multiplier for enemies */
  healthMultiplier: number;
  /** Damage multiplier for enemies */
  damageMultiplier: number;
  /** Speed multiplier for enemies */
  speedMultiplier: number;
  /** Base spawn interval from global settings */
  baseSpawnInterval: number;
  /** Min spawn interval from global settings */
  minSpawnInterval: number;
}

/**
 * Warning with event reference
 */
export interface UpcomingWarning {
  event: TimedEvent;
  warning: EventWarning;
  timeUntil: number;
}

/**
 * WaveController - High-level controller for wave system integration
 *
 * Combines WaveManager and EventExecutor into a single interface
 * for easy integration into GameScene.
 */
export class WaveController {
  private registry: WaveConfigRegistry;
  private manager: WaveManager;
  private executor: EventExecutor;
  private config: WaveConfig;

  constructor(config: WaveConfig) {
    this.config = config;
    this.registry = new WaveConfigRegistry();
    this.registry.register(config);
    this.manager = new WaveManager(this.registry, config.id);
    this.executor = new EventExecutor(config);
  }

  /**
   * Create a WaveController from a config ID in a shared registry
   */
  static fromRegistry(registry: WaveConfigRegistry, configId: string): WaveController {
    const config = registry.getOrThrow(configId);
    const controller = new WaveController(config);
    return controller;
  }

  /**
   * Get the config ID
   */
  getConfigId(): string {
    return this.config.id;
  }

  /**
   * Get current game time in ms
   */
  getGameTime(): number {
    return this.manager.getState().gameTime;
  }

  /**
   * Get current phase name
   */
  getCurrentPhaseName(): string {
    return this.manager.getCurrentPhase()?.name ?? "Unknown";
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): WavePhase | undefined {
    return this.manager.getCurrentPhase();
  }

  /**
   * Update the wave system
   * @param deltaMs - Time since last update
   * @returns Array of triggered events
   */
  update(deltaMs: number): TimedEvent[] {
    const events = this.manager.update(deltaMs);

    // Mark events as triggered in executor
    for (const event of events) {
      this.executor.markEventTriggered(event.id);
    }

    return events;
  }

  /**
   * Get spawn commands for an event
   */
  getSpawnCommandsForEvent(event: TimedEvent): SpawnCommand[] {
    const result = this.executor.executeEvent(event, this.getGameTime());
    return result.spawnCommands ?? [];
  }

  /**
   * Get current spawn configuration based on phase and modifiers
   */
  getSpawnConfig(): WaveSpawnConfig {
    const params = this.manager.getSpawnParameters();
    const modifier = this.executor.getCombinedModifier(this.getGameTime());

    return {
      enemyTypes: params.enemyTypes,
      spawnRateMultiplier: params.spawnRateMultiplier * modifier * params.globalScaling,
      maxEnemies: params.maxEnemies,
      healthMultiplier: params.healthMultiplier,
      damageMultiplier: params.damageMultiplier,
      speedMultiplier: params.speedMultiplier,
      baseSpawnInterval: this.config.globalSettings.baseSpawnInterval,
      minSpawnInterval: this.config.globalSettings.minSpawnInterval,
    };
  }

  /**
   * Get upcoming event warnings
   */
  getUpcomingWarnings(currentTime: number, windowMs: number): UpcomingWarning[] {
    const upcomingEvents = this.executor.getUpcomingEvents(currentTime, windowMs);

    return upcomingEvents.map((event) => ({
      event,
      warning: this.executor.getWarningForEvent(event),
      timeUntil: event.triggerTime - currentTime,
    }));
  }

  /**
   * Check and dispatch warnings
   */
  checkWarnings(currentTime: number, windowMs: number): void {
    this.executor.checkWarnings(currentTime, windowMs);
  }

  /**
   * Get progress (0-1)
   */
  getProgress(): number {
    return this.manager.getProgress();
  }

  /**
   * Get time remaining in ms
   */
  getTimeRemaining(): number {
    return this.manager.getTimeRemaining();
  }

  /**
   * Check if survival is complete (max time reached)
   */
  isComplete(): boolean {
    return this.manager.isGameOver();
  }

  /**
   * Pause wave progression
   */
  pause(): void {
    this.manager.pause();
  }

  /**
   * Resume wave progression
   */
  resume(): void {
    this.manager.resume();
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.manager.reset();
    this.executor.reset();
  }

  /**
   * Register phase change callback
   */
  onPhaseChange(callback: PhaseChangeCallback): void {
    this.manager.onPhaseChange(callback);
  }

  /**
   * Register event callback
   */
  onEvent(callback: EventCallback): void {
    this.manager.onEvent(callback);
  }

  /**
   * Register warning callback
   */
  onWarning(callback: WarningCallback): void {
    this.executor.onWarning(callback);
  }

  /**
   * Get enemy type for next spawn (random from current phase pool)
   */
  getEnemyTypeForSpawn(): string {
    return this.manager.getEnemyTypeForSpawn();
  }

  /**
   * Get active spawn modifiers
   */
  getActiveModifiers() {
    return this.executor.getActiveModifiers(this.getGameTime());
  }
}
