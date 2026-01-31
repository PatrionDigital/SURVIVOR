/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Container } from "pixi.js";
import { Scene, SceneManager, SceneState } from "./SceneManager";

// Mock scene implementation for testing
class MockScene extends Scene {
  public enterCalled = false;
  public exitCalled = false;
  public updateCalled = false;
  public lastDeltaMs = 0;

  constructor(name: string) {
    super(name);
  }

  onEnter(): void {
    this.enterCalled = true;
  }

  onExit(): void {
    this.exitCalled = true;
  }

  onUpdate(deltaMs: number): void {
    this.updateCalled = true;
    this.lastDeltaMs = deltaMs;
  }
}

describe("Scene", () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = new MockScene("test-scene");
  });

  describe("initialization", () => {
    it("should have a name", () => {
      expect(scene.name).toBe("test-scene");
    });

    it("should have a container", () => {
      expect(scene.container).toBeInstanceOf(Container);
    });

    it("should start in INACTIVE state", () => {
      expect(scene.state).toBe(SceneState.INACTIVE);
    });
  });

  describe("lifecycle", () => {
    it("should call onEnter when entering", () => {
      scene.enter();
      expect(scene.enterCalled).toBe(true);
      expect(scene.state).toBe(SceneState.ACTIVE);
    });

    it("should call onExit when exiting", () => {
      scene.enter();
      scene.exit();
      expect(scene.exitCalled).toBe(true);
      expect(scene.state).toBe(SceneState.INACTIVE);
    });

    it("should call onUpdate when updating", () => {
      scene.enter();
      scene.update(16.67);
      expect(scene.updateCalled).toBe(true);
      expect(scene.lastDeltaMs).toBe(16.67);
    });

    it("should not update when inactive", () => {
      scene.update(16.67);
      expect(scene.updateCalled).toBe(false);
    });
  });

  describe("container visibility", () => {
    it("should make container visible on enter", () => {
      scene.container.visible = false;
      scene.enter();
      expect(scene.container.visible).toBe(true);
    });

    it("should hide container on exit", () => {
      scene.enter();
      scene.exit();
      expect(scene.container.visible).toBe(false);
    });
  });
});

describe("SceneManager", () => {
  let sceneManager: SceneManager;
  let rootContainer: Container;
  let menuScene: MockScene;
  let gameScene: MockScene;
  let resultScene: MockScene;

  beforeEach(() => {
    rootContainer = new Container();
    sceneManager = new SceneManager(rootContainer);
    menuScene = new MockScene("menu");
    gameScene = new MockScene("game");
    resultScene = new MockScene("result");
  });

  describe("scene registration", () => {
    it("should register a scene", () => {
      sceneManager.register(menuScene);
      expect(sceneManager.hasScene("menu")).toBe(true);
    });

    it("should register multiple scenes", () => {
      sceneManager.register(menuScene);
      sceneManager.register(gameScene);
      sceneManager.register(resultScene);

      expect(sceneManager.hasScene("menu")).toBe(true);
      expect(sceneManager.hasScene("game")).toBe(true);
      expect(sceneManager.hasScene("result")).toBe(true);
    });

    it("should add scene container to root container", () => {
      sceneManager.register(menuScene);
      expect(rootContainer.children).toContain(menuScene.container);
    });

    it("should throw error when registering duplicate scene name", () => {
      sceneManager.register(menuScene);
      const duplicateScene = new MockScene("menu");
      expect(() => sceneManager.register(duplicateScene)).toThrow();
    });
  });

  describe("scene switching", () => {
    beforeEach(() => {
      sceneManager.register(menuScene);
      sceneManager.register(gameScene);
      sceneManager.register(resultScene);
    });

    it("should switch to a scene", () => {
      sceneManager.switchTo("menu");
      expect(sceneManager.currentScene).toBe(menuScene);
      expect(menuScene.enterCalled).toBe(true);
    });

    it("should exit previous scene when switching", () => {
      sceneManager.switchTo("menu");
      sceneManager.switchTo("game");

      expect(menuScene.exitCalled).toBe(true);
      expect(gameScene.enterCalled).toBe(true);
      expect(sceneManager.currentScene).toBe(gameScene);
    });

    it("should throw error when switching to unregistered scene", () => {
      expect(() => sceneManager.switchTo("nonexistent")).toThrow();
    });

    it("should handle switching to the same scene", () => {
      sceneManager.switchTo("menu");
      menuScene.enterCalled = false;

      // Switching to same scene should be a no-op
      sceneManager.switchTo("menu");
      expect(menuScene.enterCalled).toBe(false);
    });
  });

  describe("scene transitions", () => {
    beforeEach(() => {
      sceneManager.register(menuScene);
      sceneManager.register(gameScene);
    });

    it("should set transition state during transition", async () => {
      sceneManager.switchTo("menu");

      const promise = sceneManager.transitionTo("game", { duration: 100 });
      expect(sceneManager.isTransitioning).toBe(true);

      await promise;
      expect(sceneManager.isTransitioning).toBe(false);
    });

    it("should complete transition to new scene", async () => {
      sceneManager.switchTo("menu");

      await sceneManager.transitionTo("game", { duration: 50 });

      expect(menuScene.exitCalled).toBe(true);
      expect(gameScene.enterCalled).toBe(true);
      expect(sceneManager.currentScene).toBe(gameScene);
    });

    it("should block new transitions during active transition", async () => {
      sceneManager.switchTo("menu");

      const promise1 = sceneManager.transitionTo("game", { duration: 100 });

      // Try to start another transition
      const promise2 = sceneManager.transitionTo("result", { duration: 50 });

      await Promise.all([promise1, promise2]);

      // First transition should win
      expect(sceneManager.currentScene).toBe(gameScene);
    });
  });

  describe("update propagation", () => {
    beforeEach(() => {
      sceneManager.register(menuScene);
      sceneManager.register(gameScene);
    });

    it("should update current scene", () => {
      sceneManager.switchTo("menu");
      sceneManager.update(16.67);

      expect(menuScene.updateCalled).toBe(true);
      expect(menuScene.lastDeltaMs).toBe(16.67);
    });

    it("should not update inactive scenes", () => {
      sceneManager.switchTo("menu");
      sceneManager.update(16.67);

      expect(gameScene.updateCalled).toBe(false);
    });

    it("should update new scene after switch", () => {
      sceneManager.switchTo("menu");
      sceneManager.switchTo("game");
      sceneManager.update(16.67);

      expect(gameScene.updateCalled).toBe(true);
    });
  });

  describe("cleanup", () => {
    it("should destroy all scenes on destroy", () => {
      sceneManager.register(menuScene);
      sceneManager.register(gameScene);
      sceneManager.switchTo("menu");

      sceneManager.destroy();

      expect(rootContainer.children.length).toBe(0);
      expect(sceneManager.currentScene).toBeNull();
    });

    it("should exit current scene on destroy", () => {
      sceneManager.register(menuScene);
      sceneManager.switchTo("menu");

      sceneManager.destroy();

      expect(menuScene.exitCalled).toBe(true);
    });
  });

  describe("scene access", () => {
    beforeEach(() => {
      sceneManager.register(menuScene);
      sceneManager.register(gameScene);
    });

    it("should get scene by name", () => {
      expect(sceneManager.getScene("menu")).toBe(menuScene);
      expect(sceneManager.getScene("game")).toBe(gameScene);
    });

    it("should return undefined for unknown scene", () => {
      expect(sceneManager.getScene("unknown")).toBeUndefined();
    });

    it("should return current scene name", () => {
      expect(sceneManager.currentSceneName).toBeNull();

      sceneManager.switchTo("menu");
      expect(sceneManager.currentSceneName).toBe("menu");

      sceneManager.switchTo("game");
      expect(sceneManager.currentSceneName).toBe("game");
    });
  });
});
