import type { Vehicle } from "yuka";

/**
 * Enemy type configuration loaded from JSON
 * Defines all parameters for an enemy type (similar to Unity ScriptableObjects)
 */
export interface EnemyTypeConfig {
  /** Unique identifier for this enemy type */
  id: string;
  /** Display name */
  name: string;

  /** Visual properties */
  visual: {
    /** Hex color (e.g., 0xff4444) */
    color: number;
    /** Collision/render radius in pixels */
    radius: number;
  };

  /** Combat properties */
  combat: {
    /** Contact damage dealt to player */
    damage: number;
    /** Maximum health points */
    health: number;
    /** XP value dropped on death */
    xpValue: number;
  };

  /** Movement properties (Yuka Vehicle settings) */
  movement: {
    /** Maximum travel speed in pixels/sec */
    maxSpeed: number;
    /** Maximum steering force */
    maxForce: number;
    /** Mass affects acceleration */
    mass: number;
  };

  /** Flocking behavior weights */
  flocking: {
    /** How much they match neighbor velocity (0-2 typical) */
    alignment: number;
    /** How tightly they group together (0-2 typical) */
    cohesion: number;
    /** How much they spread apart (0-2 typical) */
    separation: number;
  };

  /** Vision/detection settings */
  vision: {
    /** Detection range in pixels */
    range: number;
    /** Field of view in degrees (360 = all around) */
    fieldOfView: number;
  };

  /** Behavior settings */
  behavior: {
    /** Weight for seek behavior when chasing player */
    seekWeight: number;
  };
}

/**
 * Raw JSON structure (colors as strings)
 * Used for parsing JSON files before conversion
 */
export interface EnemyTypeConfigJSON {
  id: string;
  name: string;
  visual: {
    color: string; // "0xff4444" format
    radius: number;
  };
  combat: {
    damage: number;
    health: number;
    xpValue: number;
  };
  movement: {
    maxSpeed: number;
    maxForce: number;
    mass: number;
  };
  flocking: {
    alignment: number;
    cohesion: number;
    separation: number;
  };
  vision: {
    range: number;
    fieldOfView: number;
  };
  behavior: {
    seekWeight: number;
  };
}

/**
 * Enemy AI component for ECS
 * Links our entity to Yuka's Vehicle for AI calculations
 */
export interface EnemyAI {
  /** Yuka Vehicle instance for steering behaviors */
  vehicle: Vehicle;
  /** Reference to the enemy type configuration */
  config: EnemyTypeConfig;
  /** Current AI behavior state */
  currentBehavior: "flocking" | "seeking";
}

/**
 * Convert JSON config to runtime config
 * Handles string to number conversion for colors
 */
export function parseEnemyTypeConfig(json: EnemyTypeConfigJSON): EnemyTypeConfig {
  return {
    ...json,
    visual: {
      ...json.visual,
      color: parseInt(json.visual.color, 16),
    },
  };
}

/**
 * Validate enemy type config has all required fields
 */
export function validateEnemyTypeConfig(config: unknown): config is EnemyTypeConfigJSON {
  if (typeof config !== "object" || config === null) return false;

  const c = config as Record<string, unknown>;

  // Check top-level required fields
  if (typeof c.id !== "string") return false;
  if (typeof c.name !== "string") return false;

  // Check nested objects exist
  if (typeof c.visual !== "object" || c.visual === null) return false;
  if (typeof c.combat !== "object" || c.combat === null) return false;
  if (typeof c.movement !== "object" || c.movement === null) return false;
  if (typeof c.flocking !== "object" || c.flocking === null) return false;
  if (typeof c.vision !== "object" || c.vision === null) return false;
  if (typeof c.behavior !== "object" || c.behavior === null) return false;

  const visual = c.visual as Record<string, unknown>;
  const combat = c.combat as Record<string, unknown>;
  const movement = c.movement as Record<string, unknown>;
  const flocking = c.flocking as Record<string, unknown>;
  const vision = c.vision as Record<string, unknown>;
  const behavior = c.behavior as Record<string, unknown>;

  // Validate visual
  if (typeof visual.color !== "string") return false;
  if (typeof visual.radius !== "number") return false;

  // Validate combat
  if (typeof combat.damage !== "number") return false;
  if (typeof combat.health !== "number") return false;
  if (typeof combat.xpValue !== "number") return false;

  // Validate movement
  if (typeof movement.maxSpeed !== "number") return false;
  if (typeof movement.maxForce !== "number") return false;
  if (typeof movement.mass !== "number") return false;

  // Validate flocking
  if (typeof flocking.alignment !== "number") return false;
  if (typeof flocking.cohesion !== "number") return false;
  if (typeof flocking.separation !== "number") return false;

  // Validate vision
  if (typeof vision.range !== "number") return false;
  if (typeof vision.fieldOfView !== "number") return false;

  // Validate behavior
  if (typeof behavior.seekWeight !== "number") return false;

  return true;
}
