import type { WaveConfig, WavePhase, WaveState, TimedEvent } from "./types";
import type { WaveConfigRegistry } from "./WaveConfigRegistry";

/**
 * Parameters for enemy spawning, derived from current phase and global scaling
 */
export interface SpawnParameters {
  /** Enemy types available for spawning */
  enemyTypes: string[];
  /** Spawn rate multiplier from phase */
  spawnRateMultiplier: number;
  /** Maximum enemies allowed */
  maxEnemies: number;
  /** Health multiplier for spawned enemies */
  healthMultiplier: number;
  /** Damage multiplier for spawned enemies */
  damageMultiplier: number;
  /** Speed multiplier for spawned enemies */
  speedMultiplier: number;
  /** Global scaling factor (increases over time) */
  globalScaling: number;
}

/** Callback for phase change events */
export type PhaseChangeCallback = (newPhase: WavePhase, oldPhase: WavePhase) => void;

/** Callback for timed events */
export type EventCallback = (event: TimedEvent) => void;

/**
 * WaveManager - Orchestrates wave progression and enemy spawning
 *
 * Tracks game time, manages phase transitions, and triggers timed events.
 * Provides spawn parameters for the SpawningSystem based on current phase
 * and global difficulty scaling.
 */
export class WaveManager {
  private configId: string;
  private config: WaveConfig;
  private state: WaveState;

  private phaseChangeCallbacks: PhaseChangeCallback[] = [];
  private eventCallbacks: EventCallback[] = [];

  constructor(registry: WaveConfigRegistry, configId: string) {
    this.configId = configId;
    this.config = registry.getOrThrow(configId);
    this.state = this.createInitialState();
  }

  /**
   * Create initial wave state
   */
  private createInitialState(): WaveState {
    const firstPhase = this.config.phases[0];
    return {
      currentPhaseId: firstPhase?.id ?? "",
      gameTime: 0,
      eventsTriggered: [],
      phaseStartTime: 0,
      isPaused: false,
      eventRepeatCounts: {},
    };
  }

  /**
   * Get the config ID being used
   */
  getConfigId(): string {
    return this.configId;
  }

  /**
   * Get current wave state
   */
  getState(): WaveState {
    return { ...this.state, eventRepeatCounts: { ...this.state.eventRepeatCounts } };
  }

  /**
   * Update the wave manager with elapsed time
   * @param deltaMs - Time since last update in ms
   * @returns Array of events triggered during this update
   */
  update(deltaMs: number): TimedEvent[] {
    if (this.state.isPaused) {
      return [];
    }

    const previousTime = this.state.gameTime;
    this.state.gameTime += deltaMs;

    // Check for phase transitions
    this.checkPhaseTransition();

    // Check for events
    const triggeredEvents = this.checkEvents(previousTime, this.state.gameTime);

    return triggeredEvents;
  }

  /**
   * Check if phase should transition
   */
  private checkPhaseTransition(): void {
    // Get the phase that should be active based on current time
    const newPhase = this.getCurrentPhase();

    // Check if phase has changed
    if (newPhase && newPhase.id !== this.state.currentPhaseId) {
      // Find the old phase by its ID
      const oldPhase = this.config.phases.find((p) => p.id === this.state.currentPhaseId);

      // Update state
      this.state.currentPhaseId = newPhase.id;
      this.state.phaseStartTime = newPhase.startTime;

      // Notify callbacks if we have both phases
      if (oldPhase) {
        for (const callback of this.phaseChangeCallbacks) {
          callback(newPhase, oldPhase);
        }
      }
    }
  }

  /**
   * Check for events in the given time window
   */
  private checkEvents(startTime: number, endTime: number): TimedEvent[] {
    const triggered: TimedEvent[] = [];

    for (const event of this.config.events) {
      // Check if this is a one-time event that should trigger
      if (this.shouldTriggerEvent(event, startTime, endTime)) {
        triggered.push(event);
        this.markEventTriggered(event);

        // Notify callbacks
        for (const callback of this.eventCallbacks) {
          callback(event);
        }
      }
    }

    return triggered;
  }

  /**
   * Check if an event should trigger in the given time window
   */
  private shouldTriggerEvent(event: TimedEvent, startTime: number, endTime: number): boolean {
    const repeatCount = this.state.eventRepeatCounts?.[event.id] ?? 0;

    if (event.repeat) {
      // Repeating event
      const maxRepeats = event.repeat.maxRepeats ?? Infinity;
      if (repeatCount >= maxRepeats) {
        return false;
      }

      // Calculate next trigger time based on repeat count
      const nextTriggerTime = event.triggerTime + repeatCount * event.repeat.interval;
      return nextTriggerTime > startTime && nextTriggerTime <= endTime;
    } else {
      // One-time event
      if (this.state.eventsTriggered.includes(event.id)) {
        return false;
      }
      return event.triggerTime > startTime && event.triggerTime <= endTime;
    }
  }

  /**
   * Mark an event as triggered
   */
  private markEventTriggered(event: TimedEvent): void {
    if (event.repeat) {
      // Increment repeat count
      this.state.eventRepeatCounts = this.state.eventRepeatCounts ?? {};
      this.state.eventRepeatCounts[event.id] = (this.state.eventRepeatCounts[event.id] ?? 0) + 1;
    }

    if (!this.state.eventsTriggered.includes(event.id)) {
      this.state.eventsTriggered.push(event.id);
    }
  }

  /**
   * Get the current active phase
   */
  getCurrentPhase(): WavePhase | undefined {
    return this.config.phases.find(
      (phase) => this.state.gameTime >= phase.startTime && this.state.gameTime < phase.endTime
    );
  }

  /**
   * Get spawn parameters based on current phase and global scaling
   */
  getSpawnParameters(): SpawnParameters {
    const phase = this.getCurrentPhase();

    // Default parameters if no phase active
    if (!phase) {
      return {
        enemyTypes: [],
        spawnRateMultiplier: 0,
        maxEnemies: 0,
        healthMultiplier: 1,
        damageMultiplier: 1,
        speedMultiplier: 1,
        globalScaling: this.calculateGlobalScaling(),
      };
    }

    return {
      enemyTypes: [...phase.enemyTypes],
      spawnRateMultiplier: phase.spawnRateMultiplier,
      maxEnemies: phase.maxEnemies,
      healthMultiplier: phase.healthMultiplier ?? 1,
      damageMultiplier: phase.damageMultiplier ?? 1,
      speedMultiplier: phase.speedMultiplier ?? 1,
      globalScaling: this.calculateGlobalScaling(),
    };
  }

  /**
   * Calculate global difficulty scaling based on game time
   * Increases logarithmically to avoid runaway difficulty
   */
  private calculateGlobalScaling(): number {
    const minutes = this.state.gameTime / 60000;
    // Logarithmic scaling: 1.0 at 0min, ~1.5 at 5min, ~2.0 at 10min
    return 1 + Math.log10(1 + minutes * 0.5);
  }

  /**
   * Get a random enemy type from current phase pool
   */
  getEnemyTypeForSpawn(): string {
    const phase = this.getCurrentPhase();
    if (!phase || phase.enemyTypes.length === 0) {
      return "basic"; // Fallback
    }

    const randomIndex = Math.floor(Math.random() * phase.enemyTypes.length);
    return phase.enemyTypes[randomIndex];
  }

  /**
   * Pause wave progression
   */
  pause(): void {
    this.state.isPaused = true;
  }

  /**
   * Resume wave progression
   */
  resume(): void {
    this.state.isPaused = false;
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.state = this.createInitialState();
  }

  /**
   * Check if game has reached max time (survival complete)
   */
  isGameOver(): boolean {
    return this.state.gameTime >= this.config.globalSettings.maxGameTime;
  }

  /**
   * Get progress as percentage (0-1)
   */
  getProgress(): number {
    return Math.min(1, this.state.gameTime / this.config.globalSettings.maxGameTime);
  }

  /**
   * Get time remaining until max game time
   */
  getTimeRemaining(): number {
    return Math.max(0, this.config.globalSettings.maxGameTime - this.state.gameTime);
  }

  /**
   * Register callback for phase changes
   */
  onPhaseChange(callback: PhaseChangeCallback): void {
    this.phaseChangeCallbacks.push(callback);
  }

  /**
   * Register callback for timed events
   */
  onEvent(callback: EventCallback): void {
    this.eventCallbacks.push(callback);
  }
}
