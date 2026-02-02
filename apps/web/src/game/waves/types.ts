/**
 * Wave System Types
 *
 * Defines the type system for time-based wave progression in SwarmYeet Engine.
 * Inspired by Vampire Survivors' continuous time-based phases with timed events.
 */

/**
 * Valid event types for the wave system
 */
export type WaveEventType =
  | "boss_spawn" // Spawn a boss enemy
  | "horde" // Spawn a large group of enemies quickly
  | "phase_change" // Transition to a new phase
  | "special_spawn" // Spawn enemy at specific location
  | "difficulty_spike" // Temporary difficulty increase
  | "rest_period"; // Reduce spawning temporarily

/**
 * Spawn pattern types for enemy placement
 */
export type SpawnPatternType = "circle" | "line" | "random" | "directional";

/**
 * Configuration for spawn patterns
 */
export interface SpawnPatternConfig {
  // Circle pattern
  radius?: number;
  count?: number;
  centered?: boolean;

  // Line pattern
  startX?: number;
  endX?: number;
  y?: number;

  // Random pattern
  minDistance?: number;
  maxDistance?: number;

  // Directional pattern
  direction?: "top" | "bottom" | "left" | "right";
  spread?: number;
}

/**
 * Spawn pattern definition for enemy placement
 */
export interface SpawnPattern {
  /** Pattern type */
  type: SpawnPatternType;
  /** Pattern-specific configuration */
  config: SpawnPatternConfig;
}

/**
 * Repeat configuration for timed events
 */
export interface EventRepeat {
  /** Interval between repeats in ms */
  interval: number;
  /** Maximum number of times to repeat (undefined = infinite) */
  maxRepeats?: number;
}

/**
 * Data payload for timed events (varies by event type)
 */
export interface TimedEventData {
  // Boss spawn
  bossType?: string;

  // Horde / Special spawn
  enemyType?: string;
  count?: number;
  duration?: number;
  position?: { x: number; y: number };

  // Phase change
  nextPhaseId?: string;

  // Generic
  [key: string]: unknown;
}

/**
 * Timed event that triggers at a specific game time
 */
export interface TimedEvent {
  /** Unique identifier */
  id: string;
  /** Event type */
  type: WaveEventType;
  /** Time to trigger in ms from game start */
  triggerTime: number;
  /** Event-specific data */
  data: TimedEventData;
  /** Optional repeat configuration */
  repeat?: EventRepeat;
}

/**
 * Wave phase - a time period with specific spawning rules
 */
export interface WavePhase {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Start time in ms from game start */
  startTime: number;
  /** End time in ms from game start */
  endTime: number;
  /** Enemy types to spawn during this phase */
  enemyTypes: string[];
  /** Multiplier for spawn rate (1.0 = normal) */
  spawnRateMultiplier: number;
  /** Maximum enemies allowed during this phase */
  maxEnemies: number;

  // Optional difficulty modifiers
  /** Multiplier for enemy health */
  healthMultiplier?: number;
  /** Multiplier for enemy damage */
  damageMultiplier?: number;
  /** Multiplier for enemy speed */
  speedMultiplier?: number;
}

/**
 * Global settings for wave configuration
 */
export interface WaveGlobalSettings {
  /** Base time between spawns in ms */
  baseSpawnInterval: number;
  /** Minimum spawn interval (cap) in ms */
  minSpawnInterval: number;
  /** Maximum game duration in ms */
  maxGameTime: number;
  /** Distance from viewport edge to spawn */
  spawnDistanceFromViewport?: number;
}

/**
 * Optional metadata for wave configurations
 */
export interface WaveConfigMetadata {
  /** Difficulty level */
  difficulty?: string;
  /** Author/creator */
  author?: string;
  /** Additional custom fields */
  [key: string]: unknown;
}

/**
 * Complete wave configuration
 * Can be loaded from JSON files for easy customization
 */
export interface WaveConfig {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Semantic version */
  version: string;
  /** Optional description */
  description?: string;
  /** Phases in chronological order */
  phases: WavePhase[];
  /** Timed events */
  events: TimedEvent[];
  /** Global spawning settings */
  globalSettings: WaveGlobalSettings;
  /** Optional metadata */
  metadata?: WaveConfigMetadata;
}

/**
 * Runtime state for wave manager
 */
export interface WaveState {
  /** Current active phase ID */
  currentPhaseId: string;
  /** Current game time in ms */
  gameTime: number;
  /** IDs of events that have been triggered */
  eventsTriggered: string[];
  /** Time when current phase started */
  phaseStartTime: number;
  /** Whether wave progression is paused */
  isPaused: boolean;
  /** Repeat counts for repeating events */
  eventRepeatCounts?: Record<string, number>;
}
