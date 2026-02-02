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
