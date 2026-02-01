import type { Graphics } from "pixi.js";

/**
 * Position component - where the entity is located
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Velocity component - movement speed and direction
 */
export interface Velocity {
  vx: number;
  vy: number;
}

/**
 * Health component - can take damage, can die
 */
export interface Health {
  current: number;
  max: number;
}

/**
 * Invincibility component - temporary damage immunity (i-frames)
 */
export interface Invincibility {
  remaining: number; // ms remaining
  duration: number; // total duration when triggered
}

/**
 * Sprite component - visual representation
 */
export interface Sprite {
  graphics: Graphics;
}

// Re-export enemy AI component from enemies module
export type { EnemyAI } from "../enemies/types";
