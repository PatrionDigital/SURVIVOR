import { describe, it, expect, beforeEach, vi } from "vitest";
import { Container } from "pixi.js";
import { SceneManager } from "./SceneManager";
import { MenuScene, GameScene, ResultScene } from "./scenes";
import { InputSystem } from "./InputSystem";

// Mock PixiJS components
vi.mock("pixi.js", async () => {
  const actual = await vi.importActual<typeof import("pixi.js")>("pixi.js");
  return {
    ...actual,
    Graphics: vi.fn().mockImplementation(() => ({
      rect: vi.fn().mockReturnThis(),
      fill: vi.fn().mockReturnThis(),
      circle: vi.fn().mockReturnThis(),
      stroke: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
      moveTo: vi.fn().mockReturnThis(),
      lineTo: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
      x: 0,
      y: 0,
      alpha: 1,
      visible: true,
      anchor: { set: vi.fn() },
    })),
    Text: vi.fn().mockImplementation(() => ({
      anchor: { set: vi.fn() },
      x: 0,
      y: 0,
      alpha: 1,
      visible: true,
      destroy: vi.fn(),
    })),
    TextStyle: vi.fn().mockImplementation(() => ({})),
    Container: vi.fn().mockImplementation(() => ({
      addChild: vi.fn(),
      removeChild: vi.fn(),
      removeChildren: vi.fn(),
      destroy: vi.fn(),
      visible: false,
      children: [],
    })),
  };
});

describe("GameSceneManager Integration", () => {
  let rootContainer: Container;
  let sceneManager: SceneManager;
  let menuScene: MenuScene;
  let gameScene: GameScene;
  let resultScene: ResultScene;

  beforeEach(() => {
    rootContainer = new Container();
    sceneManager = new SceneManager(rootContainer);
    menuScene = new MenuScene();
    gameScene = new GameScene();
    resultScene = new ResultScene();
  });

  describe("Scene Registration", () => {
    it("should register all three scenes", () => {
      sceneManager.register(menuScene);
      sceneManager.register(gameScene);
      sceneManager.register(resultScene);

      expect(sceneManager.hasScene("menu")).toBe(true);
      expect(sceneManager.hasScene("game")).toBe(true);
      expect(sceneManager.hasScene("result")).toBe(true);
    });

    it("should start with no active scene", () => {
      expect(sceneManager.currentScene).toBeNull();
    });
  });

  describe("Scene Flow: Menu → Game → Result", () => {
    beforeEach(() => {
      sceneManager.register(menuScene);
      sceneManager.register(gameScene);
      sceneManager.register(resultScene);
    });

    it("should switch to menu scene as starting point", () => {
      sceneManager.switchTo("menu");

      expect(sceneManager.currentSceneName).toBe("menu");
      expect(menuScene.container.visible).toBe(true);
    });

    it("should transition from menu to game", async () => {
      sceneManager.switchTo("menu");
      await sceneManager.transitionTo("game", { duration: 10 });

      expect(sceneManager.currentSceneName).toBe("game");
      expect(menuScene.container.visible).toBe(false);
      expect(gameScene.container.visible).toBe(true);
    });

    it("should transition from game to result", async () => {
      sceneManager.switchTo("game");
      await sceneManager.transitionTo("result", { duration: 10 });

      expect(sceneManager.currentSceneName).toBe("result");
      expect(gameScene.container.visible).toBe(false);
      expect(resultScene.container.visible).toBe(true);
    });

    it("should transition from result back to game (play again)", async () => {
      sceneManager.switchTo("result");
      await sceneManager.transitionTo("game", { duration: 10 });

      expect(sceneManager.currentSceneName).toBe("game");
    });

    it("should transition from result back to menu", async () => {
      sceneManager.switchTo("result");
      await sceneManager.transitionTo("menu", { duration: 10 });

      expect(sceneManager.currentSceneName).toBe("menu");
    });
  });

  describe("GameScene with InputSystem", () => {
    let inputSystem: InputSystem;

    beforeEach(() => {
      inputSystem = new InputSystem();
      sceneManager.register(gameScene);
    });

    it("should accept input system", () => {
      gameScene.setInputSystem(inputSystem);
      expect(gameScene.getInputState()).not.toBeNull();
    });

    it("should return null input state when no input system set", () => {
      const freshGameScene = new GameScene();
      expect(freshGameScene.getInputState()).toBeNull();
    });
  });

  describe("ResultScene with Game Results", () => {
    beforeEach(() => {
      sceneManager.register(resultScene);
    });

    it("should accept game results", () => {
      const results = {
        survivalTime: 120,
        score: 5000,
        enemiesKilled: 50,
        level: 5,
      };

      resultScene.setResults(results);
      sceneManager.switchTo("result");

      // ResultScene should be active with results set
      expect(sceneManager.currentSceneName).toBe("result");
    });
  });

  describe("Scene Updates", () => {
    beforeEach(() => {
      sceneManager.register(menuScene);
      sceneManager.register(gameScene);
    });

    it("should update active scene", () => {
      sceneManager.switchTo("menu");

      // Should not throw
      expect(() => sceneManager.update(16.67)).not.toThrow();
    });

    it("should not update inactive scenes", () => {
      sceneManager.switchTo("game");

      // Menu scene should not receive updates
      const menuUpdateSpy = vi.spyOn(menuScene, "update");
      sceneManager.update(16.67);

      expect(menuUpdateSpy).not.toHaveBeenCalled();
    });
  });

  describe("Scene Resize", () => {
    beforeEach(() => {
      sceneManager.register(menuScene);
      sceneManager.register(gameScene);
      sceneManager.register(resultScene);
    });

    it("should resize menu scene", () => {
      sceneManager.switchTo("menu");

      // Should not throw
      expect(() => menuScene.resize(1024, 768)).not.toThrow();
    });

    it("should resize game scene", () => {
      sceneManager.switchTo("game");

      expect(() => gameScene.resize(1024, 768)).not.toThrow();
    });

    it("should resize result scene", () => {
      sceneManager.switchTo("result");

      expect(() => resultScene.resize(1024, 768)).not.toThrow();
    });
  });
});
