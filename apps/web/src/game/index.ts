/**
 * SwarmYeet Engine
 *
 * A lightweight ECS-based game engine for bullet heaven / survivor games.
 * Built on PixiJS v8 for rendering and Yuka for AI steering behaviors.
 *
 * Core Systems:
 * - GameEngine: Main loop, pause/resume, frame timing
 * - SceneManager: Scene lifecycle, transitions
 * - InputSystem: Touch, keyboard, gamepad input
 * - ECS World: Entity-Component-System architecture
 * - Camera: Smooth follow, viewport management
 *
 * Game Systems:
 * - Combat: Weapons, projectiles, collision detection
 * - Enemies: Factory, AI (Yuka steering), spawning
 * - Pickups: XP gems, attraction, collection
 * - Leveling: XP tracking, upgrades
 * - Waves: Time-based phases, events, bosses (coming soon)
 *
 * @packageDocumentation
 */

export { GameEngine, GameEngineState } from "./GameEngine";
export type { UpdateCallback } from "./GameEngine";
export { GameCanvas } from "./GameCanvas";
export type { GameCanvasProps } from "./GameCanvas";
export { InputSystem } from "./InputSystem";
export type { InputState, Vector2 } from "./InputSystem";
export { Scene, SceneManager, SceneState } from "./SceneManager";
export type { TransitionOptions } from "./SceneManager";
export { MenuScene, GameScene, ResultScene } from "./scenes";
export type { GameResults } from "./scenes";

// Re-export SceneManager for direct access
export type { Scene as SceneType } from "./SceneManager";

// Leveling system exports
export type { Upgrade, UpgradeType, PlayerStats } from "./leveling";
export { generateUpgradeChoices } from "./leveling";
