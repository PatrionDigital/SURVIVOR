/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GameEngine, GameEngineState } from "./GameEngine";

// Mock PixiJS Application
vi.mock("pixi.js", () => ({
  Application: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    canvas: document.createElement("canvas"),
    stage: {
      addChild: vi.fn(),
      removeChild: vi.fn(),
    },
    ticker: {
      add: vi.fn(),
      remove: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    },
    renderer: {
      resize: vi.fn(),
    },
    destroy: vi.fn(),
  })),
}));

describe("GameEngine", () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  afterEach(() => {
    engine.destroy();
  });

  describe("initialization", () => {
    it("should create engine in idle state", () => {
      expect(engine.state).toBe(GameEngineState.IDLE);
    });

    it("should initialize PixiJS application", async () => {
      const container = document.createElement("div");
      await engine.init(container);

      expect(engine.state).toBe(GameEngineState.READY);
      expect(engine.isInitialized).toBe(true);
    });

    it("should append canvas to container", async () => {
      const container = document.createElement("div");
      await engine.init(container);

      expect(container.children.length).toBe(1);
      expect(container.children[0].tagName).toBe("CANVAS");
    });

    it("should throw if already initialized", async () => {
      const container = document.createElement("div");
      await engine.init(container);

      await expect(engine.init(container)).rejects.toThrow("already initialized");
    });
  });

  describe("game loop", () => {
    it("should start game loop when start is called", async () => {
      const container = document.createElement("div");
      await engine.init(container);

      engine.start();

      expect(engine.state).toBe(GameEngineState.RUNNING);
      expect(engine.isRunning).toBe(true);
    });

    it("should not start if not initialized", () => {
      engine.start();

      expect(engine.state).toBe(GameEngineState.IDLE);
      expect(engine.isRunning).toBe(false);
    });

    it("should pause game loop", async () => {
      const container = document.createElement("div");
      await engine.init(container);
      engine.start();

      engine.pause();

      expect(engine.state).toBe(GameEngineState.PAUSED);
      expect(engine.isPaused).toBe(true);
    });

    it("should resume game loop from paused state", async () => {
      const container = document.createElement("div");
      await engine.init(container);
      engine.start();
      engine.pause();

      engine.resume();

      expect(engine.state).toBe(GameEngineState.RUNNING);
      expect(engine.isRunning).toBe(true);
    });

    it("should stop game loop", async () => {
      const container = document.createElement("div");
      await engine.init(container);
      engine.start();

      engine.stop();

      expect(engine.state).toBe(GameEngineState.READY);
      expect(engine.isRunning).toBe(false);
    });
  });

  describe("resize handling", () => {
    it("should resize renderer when resize is called", async () => {
      const container = document.createElement("div");
      await engine.init(container);

      engine.resize(800, 600);

      // The resize method should be called on the renderer
      expect(engine.width).toBe(800);
      expect(engine.height).toBe(600);
    });
  });

  describe("update callback", () => {
    it("should call update callback with delta time", async () => {
      const container = document.createElement("div");
      await engine.init(container);

      const updateFn = vi.fn();
      engine.onUpdate(updateFn);
      engine.start();

      // Simulate a tick
      engine.simulateTick(16.67);

      expect(updateFn).toHaveBeenCalledWith(expect.any(Number));
    });

    it("should not call update when paused", async () => {
      const container = document.createElement("div");
      await engine.init(container);

      const updateFn = vi.fn();
      engine.onUpdate(updateFn);
      engine.start();
      engine.pause();

      engine.simulateTick(16.67);

      expect(updateFn).not.toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("should destroy application on cleanup", async () => {
      const container = document.createElement("div");
      await engine.init(container);

      engine.destroy();

      expect(engine.state).toBe(GameEngineState.DESTROYED);
      expect(engine.isInitialized).toBe(false);
    });

    it("should remove canvas from container on destroy", async () => {
      const container = document.createElement("div");
      await engine.init(container);

      engine.destroy();

      expect(container.children.length).toBe(0);
    });
  });
});
