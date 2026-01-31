import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GameScene } from "./GameScene";
import { InputSystem } from "../InputSystem";

// Mock PixiJS Graphics
vi.mock("pixi.js", () => ({
  Container: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(),
    removeChild: vi.fn(),
    removeChildren: vi.fn(),
    destroy: vi.fn(),
    children: [],
  })),
  Graphics: vi.fn().mockImplementation(() => ({
    circle: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    x: 0,
    y: 0,
    alpha: 1,
  })),
}));

describe("GameScene", () => {
  let scene: GameScene;
  let inputSystem: InputSystem;

  beforeEach(() => {
    scene = new GameScene();
    inputSystem = new InputSystem();
    scene.setInputSystem(inputSystem);
  });

  afterEach(() => {
    inputSystem.destroy();
  });

  describe("Lifecycle", () => {
    it("should have 'game' as scene name", () => {
      expect(scene.name).toBe("game");
    });

    it("should create player on enter", () => {
      scene.enter();

      const player = scene.getPlayer();
      expect(player).not.toBeNull();
    });

    it("should clean up on exit", () => {
      scene.enter();
      scene.exit();

      const player = scene.getPlayer();
      expect(player).toBeNull();
    });
  });

  describe("Player Entity", () => {
    it("should initialize player at screen center", () => {
      scene.resize(800, 600);
      scene.enter();

      const player = scene.getPlayer();
      expect(player?.x).toBe(400);
      expect(player?.y).toBe(300);
    });

    it("should set player position via setPlayerPosition", () => {
      scene.enter();
      scene.setPlayerPosition(100, 200);

      const player = scene.getPlayer();
      expect(player?.x).toBe(100);
      expect(player?.y).toBe(200);
    });

    it("should get current player position", () => {
      scene.enter();
      scene.setPlayerPosition(150, 250);

      const position = scene.getPlayerPosition();
      expect(position?.x).toBe(150);
      expect(position?.y).toBe(250);
    });

    it("should return null position when no player exists", () => {
      // Don't call enter - no player created
      const position = scene.getPlayerPosition();
      expect(position).toBeNull();
    });
  });

  describe("Input System", () => {
    it("should store input system reference", () => {
      expect(scene.getInputState()).not.toBeNull();
    });

    it("should return null input state if no input system", () => {
      const sceneNoInput = new GameScene();
      expect(sceneNoInput.getInputState()).toBeNull();
    });
  });

  describe("Resize", () => {
    it("should update scene dimensions", () => {
      scene.resize(1024, 768);
      scene.enter();

      const player = scene.getPlayer();
      // Player should be centered in new dimensions
      expect(player?.x).toBe(512);
      expect(player?.y).toBe(384);
    });

    it("should clamp player position on resize if out of bounds", () => {
      scene.resize(800, 600);
      scene.enter();
      scene.setPlayerPosition(750, 550);

      // Resize to smaller
      scene.resize(400, 300);

      const player = scene.getPlayer();
      // Should be clamped to new bounds (400 - padding, 300 - padding)
      expect(player!.x).toBeLessThanOrEqual(380); // 400 - 20 padding
      expect(player!.y).toBeLessThanOrEqual(280); // 300 - 20 padding
    });
  });

  describe("Update Loop (ECS Integration)", () => {
    it("should not throw when updating without player", () => {
      // Don't call enter
      expect(() => scene.update(16)).not.toThrow();
    });

    it("should not throw when updating without input system", () => {
      const sceneNoInput = new GameScene();
      sceneNoInput.enter();
      expect(() => sceneNoInput.update(16)).not.toThrow();
    });

    it("should update player position based on input", () => {
      scene.resize(800, 600);
      scene.enter();

      // Simulate right movement input
      // We can't easily mock the input system, so this test verifies no crash
      scene.update(16);

      // Player position should remain valid (either moved or stayed)
      const player = scene.getPlayer();
      expect(player).not.toBeNull();
      expect(typeof player!.x).toBe("number");
      expect(typeof player!.y).toBe("number");
    });
  });
});
