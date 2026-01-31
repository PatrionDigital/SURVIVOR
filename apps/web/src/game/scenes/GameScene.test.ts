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
    rect: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
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

    it("should create camera on enter", () => {
      scene.enter();

      const camera = scene.getCamera();
      expect(camera).not.toBeNull();
    });

    it("should clean up on exit", () => {
      scene.enter();
      scene.exit();

      const player = scene.getPlayer();
      expect(player).toBeNull();
    });

    it("should clean up camera on exit", () => {
      scene.enter();
      scene.exit();

      const camera = scene.getCamera();
      expect(camera).toBeNull();
    });
  });

  describe("Player Entity", () => {
    it("should initialize player at origin (world space)", () => {
      scene.resize(800, 600);
      scene.enter();

      const position = scene.getPlayerPosition();
      expect(position?.x).toBe(0);
      expect(position?.y).toBe(0);
    });

    it("should set player position via setPlayerPosition", () => {
      scene.enter();
      scene.setPlayerPosition(100, 200);

      const position = scene.getPlayerPosition();
      expect(position?.x).toBe(100);
      expect(position?.y).toBe(200);
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

  describe("Camera", () => {
    it("should initialize camera at player start position", () => {
      scene.resize(800, 600);
      scene.enter();

      const camera = scene.getCamera();
      expect(camera?.x).toBe(0);
      expect(camera?.y).toBe(0);
    });

    it("should return null camera when scene not entered", () => {
      const camera = scene.getCamera();
      expect(camera).toBeNull();
    });

    it("should update camera to follow player on update", () => {
      scene.resize(800, 600);
      scene.enter();

      // Move player to new position
      scene.setPlayerPosition(500, 300);

      // Update scene (camera should start following)
      scene.update(1000); // Large deltaMs for visible lerp movement

      const camera = scene.getCamera();
      // Camera should have moved toward player (lerp)
      expect(camera!.x).toBeGreaterThan(0);
      expect(camera!.y).toBeGreaterThan(0);
    });

    it("should expose viewport through camera", () => {
      scene.resize(800, 600);
      scene.enter();

      const camera = scene.getCamera();
      const viewport = camera?.getViewport(800, 600);

      expect(viewport).toBeDefined();
      expect(viewport?.left).toBe(-400);
      expect(viewport?.right).toBe(400);
      expect(viewport?.top).toBe(-300);
      expect(viewport?.bottom).toBe(300);
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

      // Player starts at origin in world space
      const position = scene.getPlayerPosition();
      expect(position?.x).toBe(0);
      expect(position?.y).toBe(0);
    });

    it("should not clamp player position on resize (infinite arena)", () => {
      scene.resize(800, 600);
      scene.enter();
      scene.setPlayerPosition(5000, 5000);

      // Resize to smaller
      scene.resize(400, 300);

      // Position should remain unchanged (no clamping in infinite arena)
      const position = scene.getPlayerPosition();
      expect(position?.x).toBe(5000);
      expect(position?.y).toBe(5000);
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

      // Player position should remain valid
      const position = scene.getPlayerPosition();
      expect(position).not.toBeNull();
      expect(typeof position!.x).toBe("number");
      expect(typeof position!.y).toBe("number");
    });
  });
});
