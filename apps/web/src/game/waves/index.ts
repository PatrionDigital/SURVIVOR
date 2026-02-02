/**
 * Wave System
 *
 * Time-based progression system for SwarmYeet Engine.
 * Controls enemy spawning phases, timed events (bosses, hordes),
 * and difficulty scaling throughout a game session.
 */

export type {
  WaveEventType,
  SpawnPatternType,
  SpawnPatternConfig,
  SpawnPattern,
  EventRepeat,
  TimedEventData,
  TimedEvent,
  WavePhase,
  WaveGlobalSettings,
  WaveConfigMetadata,
  WaveConfig,
  WaveState,
} from "./types";

export { WaveConfigRegistry } from "./WaveConfigRegistry";
export { WaveManager } from "./WaveManager";
export type { SpawnParameters, PhaseChangeCallback, EventCallback } from "./WaveManager";
export { EventExecutor } from "./EventExecutor";
export type {
  SpawnCommand,
  SpawnModifier,
  EventExecutionResult,
  EventWarning,
  WarningCallback,
} from "./EventExecutor";
export { SpawnPatterns } from "./SpawnPatterns";
export type {
  SpawnPosition,
  ViewportInfo,
  ClusterOptions,
  RingOptions,
  LineOptions,
  EdgeOptions,
} from "./SpawnPatterns";
export { WaveController } from "./WaveController";
export type { WaveSpawnConfig, UpcomingWarning } from "./WaveController";
