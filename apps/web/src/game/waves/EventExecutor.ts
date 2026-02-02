import type { TimedEvent, WaveConfig, WaveEventType } from "./types";

/**
 * Command to spawn an enemy
 */
export interface SpawnCommand {
  /** Enemy type to spawn */
  enemyType: string;
  /** Whether this is a boss enemy */
  isBoss?: boolean;
  /** Optional spawn delay in ms */
  delay?: number;
  /** Optional specific position */
  position?: { x: number; y: number };
}

/**
 * Temporary spawn rate modifier
 */
export interface SpawnModifier {
  /** Multiplier for spawn rate (< 1 = slower, > 1 = faster) */
  multiplier: number;
  /** Duration in ms */
  duration: number;
  /** When this modifier was applied */
  startTime: number;
}

/**
 * Result of executing an event
 */
export interface EventExecutionResult {
  /** Event type that was executed */
  type: WaveEventType;
  /** Spawn commands to execute (for horde/boss events) */
  spawnCommands?: SpawnCommand[];
  /** Spawn modifier to apply (for rest/difficulty events) */
  spawnModifier?: SpawnModifier;
}

/**
 * Warning information for an upcoming event
 */
export interface EventWarning {
  /** Warning title */
  title: string;
  /** Warning description */
  description: string;
  /** Severity level */
  severity: "info" | "warning" | "danger";
}

/** Callback for event warnings */
export type WarningCallback = (event: TimedEvent, warning: EventWarning) => void;

/**
 * EventExecutor - Executes wave events and manages warnings
 *
 * Takes triggered events from WaveManager and converts them into
 * spawn commands and modifiers that game systems can act upon.
 */
export class EventExecutor {
  private config: WaveConfig;
  private triggeredEvents: Set<string> = new Set();
  private warnedEvents: Set<string> = new Set();
  private activeModifiers: SpawnModifier[] = [];
  private warningCallbacks: WarningCallback[] = [];

  constructor(config: WaveConfig) {
    this.config = config;
  }

  /**
   * Execute a triggered event
   * @param event - The event to execute
   * @param currentTime - Current game time (for tracking modifier start)
   */
  executeEvent(event: TimedEvent, currentTime: number = 0): EventExecutionResult {
    const result: EventExecutionResult = {
      type: event.type,
    };

    switch (event.type) {
      case "horde":
        result.spawnCommands = this.createHordeSpawns(event);
        break;

      case "boss_spawn":
        result.spawnCommands = this.createBossSpawns(event);
        break;

      case "rest_period":
        result.spawnModifier = this.createRestModifier(event, currentTime);
        if (result.spawnModifier) {
          this.activeModifiers.push(result.spawnModifier);
        }
        break;

      case "difficulty_spike":
        result.spawnModifier = this.createDifficultyModifier(event, currentTime);
        if (result.spawnModifier) {
          this.activeModifiers.push(result.spawnModifier);
        }
        break;

      case "special_spawn":
        result.spawnCommands = this.createSpecialSpawns(event);
        break;

      case "phase_change":
        // Phase changes are handled by WaveManager
        break;
    }

    return result;
  }

  /**
   * Create spawn commands for a horde event
   */
  private createHordeSpawns(event: TimedEvent): SpawnCommand[] {
    const count = (event.data.count as number) || 10;
    const enemyType = (event.data.enemyType as string) || "basic";
    const duration = (event.data.duration as number) || 0;

    const commands: SpawnCommand[] = [];
    for (let i = 0; i < count; i++) {
      commands.push({
        enemyType,
        isBoss: false,
        delay: duration > 0 ? (i / count) * duration : 0,
      });
    }

    return commands;
  }

  /**
   * Create spawn commands for a boss event
   */
  private createBossSpawns(event: TimedEvent): SpawnCommand[] {
    const count = (event.data.count as number) || 1;
    const bossType = (event.data.bossType as string) || "boss";

    const commands: SpawnCommand[] = [];
    for (let i = 0; i < count; i++) {
      commands.push({
        enemyType: bossType,
        isBoss: true,
      });
    }

    return commands;
  }

  /**
   * Create spawn modifier for rest period
   */
  private createRestModifier(event: TimedEvent, currentTime: number): SpawnModifier {
    return {
      multiplier: (event.data.spawnMultiplier as number) || 0.2,
      duration: (event.data.duration as number) || 5000,
      startTime: currentTime,
    };
  }

  /**
   * Create spawn modifier for difficulty spike
   */
  private createDifficultyModifier(event: TimedEvent, currentTime: number): SpawnModifier {
    return {
      multiplier: (event.data.multiplier as number) || 2.0,
      duration: (event.data.duration as number) || 10000,
      startTime: currentTime,
    };
  }

  /**
   * Create spawn commands for special spawn
   */
  private createSpecialSpawns(event: TimedEvent): SpawnCommand[] {
    const enemyType = (event.data.enemyType as string) || "special";
    const position = event.data.position as { x: number; y: number } | undefined;

    return [
      {
        enemyType,
        isBoss: false,
        position,
      },
    ];
  }

  /**
   * Get events that will trigger within warning window
   */
  getUpcomingEvents(currentTime: number, warningWindow: number): TimedEvent[] {
    const windowStart = currentTime;
    const windowEnd = currentTime + warningWindow;

    return this.config.events.filter((event) => {
      // Skip already triggered events
      if (this.triggeredEvents.has(event.id)) {
        return false;
      }

      // Check if event is in warning window (not yet triggered)
      return event.triggerTime > windowStart && event.triggerTime <= windowEnd;
    });
  }

  /**
   * Get warning information for an event
   */
  getWarningForEvent(event: TimedEvent): EventWarning {
    switch (event.type) {
      case "horde":
        return {
          title: "Horde Incoming!",
          description: `${event.data.count || 10} ${event.data.enemyType || "enemies"} approaching!`,
          severity: "warning",
        };

      case "boss_spawn":
        return {
          title: "Boss Approaching!",
          description: `${event.data.bossType || "Boss"} is coming!`,
          severity: "danger",
        };

      case "rest_period":
        return {
          title: "Rest Period",
          description: "Enemy spawning will slow down temporarily.",
          severity: "info",
        };

      case "difficulty_spike":
        return {
          title: "Danger Zone!",
          description: "Enemy intensity increasing!",
          severity: "danger",
        };

      case "special_spawn":
        return {
          title: "Special Enemy!",
          description: `A ${event.data.enemyType || "special enemy"} has appeared!`,
          severity: "warning",
        };

      default:
        return {
          title: "Event",
          description: "Something is happening...",
          severity: "info",
        };
    }
  }

  /**
   * Mark an event as triggered
   */
  markEventTriggered(eventId: string): void {
    this.triggeredEvents.add(eventId);
  }

  /**
   * Check if an event has been triggered
   */
  isEventTriggered(eventId: string): boolean {
    return this.triggeredEvents.has(eventId);
  }

  /**
   * Get active spawn modifiers at a given time
   */
  getActiveModifiers(currentTime: number): SpawnModifier[] {
    // Remove expired modifiers
    this.activeModifiers = this.activeModifiers.filter(
      (mod) => currentTime < mod.startTime + mod.duration
    );

    return this.activeModifiers;
  }

  /**
   * Get combined spawn rate multiplier from all active modifiers
   */
  getCombinedModifier(currentTime: number): number {
    const active = this.getActiveModifiers(currentTime);
    if (active.length === 0) return 1.0;

    // Multiply all modifiers together
    return active.reduce((acc, mod) => acc * mod.multiplier, 1.0);
  }

  /**
   * Check for warnings and trigger callbacks
   */
  checkWarnings(currentTime: number, warningWindow: number): void {
    const upcoming = this.getUpcomingEvents(currentTime, warningWindow);

    for (const event of upcoming) {
      // Skip if already warned
      if (this.warnedEvents.has(event.id)) {
        continue;
      }

      // Mark as warned
      this.warnedEvents.add(event.id);

      // Get warning info and notify callbacks
      const warning = this.getWarningForEvent(event);
      for (const callback of this.warningCallbacks) {
        callback(event, warning);
      }
    }
  }

  /**
   * Register callback for event warnings
   */
  onWarning(callback: WarningCallback): void {
    this.warningCallbacks.push(callback);
  }

  /**
   * Reset the executor state
   */
  reset(): void {
    this.triggeredEvents.clear();
    this.warnedEvents.clear();
    this.activeModifiers = [];
  }
}
