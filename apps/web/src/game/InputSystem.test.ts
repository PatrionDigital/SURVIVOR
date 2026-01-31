/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InputSystem } from "./InputSystem";

describe("InputSystem", () => {
  let inputSystem: InputSystem;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    // Give container dimensions for touch calculations
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
      }),
    });
    document.body.appendChild(container);
    inputSystem = new InputSystem();
  });

  afterEach(() => {
    inputSystem.destroy();
    document.body.removeChild(container);
  });

  describe("initialization", () => {
    it("should create input system with zero movement vector", () => {
      const state = inputSystem.getState();
      expect(state.movement.x).toBe(0);
      expect(state.movement.y).toBe(0);
    });

    it("should not be attached initially", () => {
      expect(inputSystem.isAttached).toBe(false);
    });

    it("should attach to element", () => {
      inputSystem.attach(container);
      expect(inputSystem.isAttached).toBe(true);
    });

    it("should detach from element", () => {
      inputSystem.attach(container);
      inputSystem.detach();
      expect(inputSystem.isAttached).toBe(false);
    });
  });

  describe("keyboard input", () => {
    beforeEach(() => {
      inputSystem.attach(container);
    });

    it("should handle W key for up movement", () => {
      const event = new KeyboardEvent("keydown", { key: "w" });
      window.dispatchEvent(event);

      const state = inputSystem.getState();
      expect(state.movement.y).toBe(-1);
    });

    it("should handle S key for down movement", () => {
      const event = new KeyboardEvent("keydown", { key: "s" });
      window.dispatchEvent(event);

      const state = inputSystem.getState();
      expect(state.movement.y).toBe(1);
    });

    it("should handle A key for left movement", () => {
      const event = new KeyboardEvent("keydown", { key: "a" });
      window.dispatchEvent(event);

      const state = inputSystem.getState();
      expect(state.movement.x).toBe(-1);
    });

    it("should handle D key for right movement", () => {
      const event = new KeyboardEvent("keydown", { key: "d" });
      window.dispatchEvent(event);

      const state = inputSystem.getState();
      expect(state.movement.x).toBe(1);
    });

    it("should handle arrow keys", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      expect(inputSystem.getState().movement.y).toBe(-1);

      window.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowUp" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      expect(inputSystem.getState().movement.y).toBe(1);

      window.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowDown" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
      expect(inputSystem.getState().movement.x).toBe(-1);

      window.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowLeft" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
      expect(inputSystem.getState().movement.x).toBe(1);
    });

    it("should handle uppercase WASD", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "W" }));
      expect(inputSystem.getState().movement.y).toBe(-1);

      window.dispatchEvent(new KeyboardEvent("keyup", { key: "W" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "A" }));
      expect(inputSystem.getState().movement.x).toBe(-1);
    });

    it("should reset movement on key up", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
      expect(inputSystem.getState().movement.y).toBe(-1);

      window.dispatchEvent(new KeyboardEvent("keyup", { key: "w" }));
      expect(inputSystem.getState().movement.y).toBe(0);
    });

    it("should handle simultaneous key presses", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));

      const state = inputSystem.getState();
      // Diagonal movement is normalized, so values are ~0.707
      expect(state.movement.x).toBeGreaterThan(0);
      expect(state.movement.y).toBeLessThan(0);
    });

    it("should normalize diagonal movement", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));

      const state = inputSystem.getState();
      // Diagonal should be normalized to magnitude 1
      const magnitude = Math.sqrt(state.movement.x ** 2 + state.movement.y ** 2);
      expect(magnitude).toBeCloseTo(1, 5);
    });

    it("should handle opposite keys (cancel out)", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "s" }));

      const state = inputSystem.getState();
      expect(state.movement.y).toBe(0);
    });
  });

  describe("touch/pointer input", () => {
    beforeEach(() => {
      inputSystem.attach(container);
    });

    it("should handle pointer down to set touch origin", () => {
      const event = new PointerEvent("pointerdown", {
        clientX: 400,
        clientY: 300,
        pointerId: 1,
      });
      container.dispatchEvent(event);

      expect(inputSystem.isTouching).toBe(true);
    });

    it("should handle pointer up to clear touch", () => {
      container.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: 400,
          clientY: 300,
          pointerId: 1,
        })
      );

      container.dispatchEvent(
        new PointerEvent("pointerup", {
          clientX: 400,
          clientY: 300,
          pointerId: 1,
        })
      );

      expect(inputSystem.isTouching).toBe(false);
      expect(inputSystem.getState().movement.x).toBe(0);
      expect(inputSystem.getState().movement.y).toBe(0);
    });

    it("should ignore movement within dead zone (20px)", () => {
      container.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: 400,
          clientY: 300,
          pointerId: 1,
        })
      );

      // Move 10px to the right (within 20px dead zone)
      container.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: 410,
          clientY: 300,
          pointerId: 1,
        })
      );

      const state = inputSystem.getState();
      expect(state.movement.x).toBe(0);
      expect(state.movement.y).toBe(0);
    });

    it("should calculate movement beyond dead zone", () => {
      container.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: 400,
          clientY: 300,
          pointerId: 1,
        })
      );

      // Move 100px to the right (80px beyond 20px dead zone)
      container.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: 500,
          clientY: 300,
          pointerId: 1,
        })
      );

      const state = inputSystem.getState();
      expect(state.movement.x).toBeGreaterThan(0);
      expect(state.movement.y).toBe(0);
    });

    it("should normalize touch movement to -1 to 1 range", () => {
      container.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: 400,
          clientY: 300,
          pointerId: 1,
        })
      );

      // Move far to the right (should max out at 1)
      container.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: 800,
          clientY: 300,
          pointerId: 1,
        })
      );

      const state = inputSystem.getState();
      expect(state.movement.x).toBeLessThanOrEqual(1);
      expect(state.movement.x).toBeGreaterThanOrEqual(-1);
    });

    it("should handle diagonal touch movement", () => {
      container.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: 400,
          clientY: 300,
          pointerId: 1,
        })
      );

      // Move diagonally
      container.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: 550,
          clientY: 150,
          pointerId: 1,
        })
      );

      const state = inputSystem.getState();
      expect(state.movement.x).toBeGreaterThan(0);
      expect(state.movement.y).toBeLessThan(0);
    });

    it("should handle pointer cancel", () => {
      container.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: 400,
          clientY: 300,
          pointerId: 1,
        })
      );

      container.dispatchEvent(
        new PointerEvent("pointercancel", {
          pointerId: 1,
        })
      );

      expect(inputSystem.isTouching).toBe(false);
    });

    it("should track correct pointer ID", () => {
      // First touch
      container.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: 400,
          clientY: 300,
          pointerId: 1,
        })
      );

      // Second touch should be ignored
      container.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: 100,
          clientY: 100,
          pointerId: 2,
        })
      );

      // Move first pointer
      container.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: 550,
          clientY: 300,
          pointerId: 1,
        })
      );

      // Movement from second pointer should be ignored
      container.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: 0,
          clientY: 0,
          pointerId: 2,
        })
      );

      const state = inputSystem.getState();
      expect(state.movement.x).toBeGreaterThan(0);
    });
  });

  describe("input priority", () => {
    beforeEach(() => {
      inputSystem.attach(container);
    });

    it("should prioritize keyboard over touch when both active", () => {
      // Start touch
      container.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: 400,
          clientY: 300,
          pointerId: 1,
        })
      );
      container.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: 550,
          clientY: 300,
          pointerId: 1,
        })
      );

      // Press keyboard key
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));

      const state = inputSystem.getState();
      // Keyboard should override touch
      expect(state.movement.x).toBe(-1);
    });
  });

  describe("enable/disable", () => {
    beforeEach(() => {
      inputSystem.attach(container);
    });

    it("should ignore input when disabled", () => {
      inputSystem.disable();

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));

      const state = inputSystem.getState();
      expect(state.movement.y).toBe(0);
    });

    it("should process input when re-enabled", () => {
      inputSystem.disable();
      inputSystem.enable();

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));

      const state = inputSystem.getState();
      expect(state.movement.y).toBe(-1);
    });

    it("should clear movement when disabled", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
      expect(inputSystem.getState().movement.y).toBe(-1);

      inputSystem.disable();
      expect(inputSystem.getState().movement.y).toBe(0);
    });
  });

  describe("continuous touch input simulation", () => {
    beforeEach(() => {
      inputSystem.attach(container);
    });

    it("should handle rapid direction reversal (down to up)", () => {
      const origin = { x: 400, y: 300 };
      const beyondDeadZone = 50;

      // Start touch
      container.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: origin.x,
          clientY: origin.y,
          pointerId: 1,
        })
      );

      // Move down (beyond dead zone)
      container.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: origin.x,
          clientY: origin.y + beyondDeadZone,
          pointerId: 1,
        })
      );

      let state = inputSystem.getState();
      expect(state.movement.y).toBeGreaterThan(0);
      expect(state.movement.x).toBe(0);

      // Quickly reverse to up (crossing origin, beyond dead zone on other side)
      container.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: origin.x,
          clientY: origin.y - beyondDeadZone,
          pointerId: 1,
        })
      );

      state = inputSystem.getState();
      expect(state.movement.y).toBeLessThan(0);
      expect(state.movement.x).toBe(0);
    });

    it("should handle rapid direction reversal (right to left)", () => {
      const origin = { x: 400, y: 300 };
      const beyondDeadZone = 50;

      container.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: origin.x,
          clientY: origin.y,
          pointerId: 1,
        })
      );

      // Move right
      container.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: origin.x + beyondDeadZone,
          clientY: origin.y,
          pointerId: 1,
        })
      );

      let state = inputSystem.getState();
      expect(state.movement.x).toBeGreaterThan(0);

      // Reverse to left
      container.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: origin.x - beyondDeadZone,
          clientY: origin.y,
          pointerId: 1,
        })
      );

      state = inputSystem.getState();
      expect(state.movement.x).toBeLessThan(0);
    });

    it("should handle continuous circular movement", () => {
      const origin = { x: 400, y: 300 };
      const radius = 100; // Beyond dead zone

      container.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: origin.x,
          clientY: origin.y,
          pointerId: 1,
        })
      );

      // Simulate circular movement (8 positions around the circle)
      const positions = [
        { angle: 0, expectedX: 1, expectedY: 0 },
        { angle: Math.PI / 4, expectedX: 0.707, expectedY: 0.707 },
        { angle: Math.PI / 2, expectedX: 0, expectedY: 1 },
        { angle: (3 * Math.PI) / 4, expectedX: -0.707, expectedY: 0.707 },
        { angle: Math.PI, expectedX: -1, expectedY: 0 },
        { angle: (5 * Math.PI) / 4, expectedX: -0.707, expectedY: -0.707 },
        { angle: (3 * Math.PI) / 2, expectedX: 0, expectedY: -1 },
        { angle: (7 * Math.PI) / 4, expectedX: 0.707, expectedY: -0.707 },
      ];

      for (const pos of positions) {
        container.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: origin.x + Math.cos(pos.angle) * radius,
            clientY: origin.y + Math.sin(pos.angle) * radius,
            pointerId: 1,
          })
        );

        const state = inputSystem.getState();
        // Check direction is correct (using sign)
        if (pos.expectedX !== 0) {
          expect(Math.sign(state.movement.x)).toBe(Math.sign(pos.expectedX));
        }
        if (pos.expectedY !== 0) {
          expect(Math.sign(state.movement.y)).toBe(Math.sign(pos.expectedY));
        }
      }
    });

    it("should maintain correct magnitude during movement", () => {
      const origin = { x: 400, y: 300 };
      const deadZone = 20;
      const maxDistance = 60;

      container.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: origin.x,
          clientY: origin.y,
          pointerId: 1,
        })
      );

      // Move just past dead zone - should have small magnitude
      container.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: origin.x + deadZone + 10,
          clientY: origin.y,
          pointerId: 1,
        })
      );

      let state = inputSystem.getState();
      let magnitude = Math.sqrt(state.movement.x ** 2 + state.movement.y ** 2);
      expect(magnitude).toBeLessThan(0.2);
      expect(magnitude).toBeGreaterThan(0);

      // Move to max distance - should have magnitude close to 1
      container.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: origin.x + deadZone + maxDistance + 50,
          clientY: origin.y,
          pointerId: 1,
        })
      );

      state = inputSystem.getState();
      expect(state.movement.x).toBeCloseTo(1, 1);
    });

    it("should return to zero when touch ends", () => {
      const origin = { x: 400, y: 300 };

      container.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: origin.x,
          clientY: origin.y,
          pointerId: 1,
        })
      );

      container.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: origin.x + 100,
          clientY: origin.y,
          pointerId: 1,
        })
      );

      let state = inputSystem.getState();
      expect(state.movement.x).toBeGreaterThan(0);

      // End touch
      container.dispatchEvent(
        new PointerEvent("pointerup", {
          clientX: origin.x + 100,
          clientY: origin.y,
          pointerId: 1,
        })
      );

      state = inputSystem.getState();
      expect(state.movement.x).toBe(0);
      expect(state.movement.y).toBe(0);
    });
  });

  describe("cleanup", () => {
    it("should remove all event listeners on destroy", () => {
      inputSystem.attach(container);

      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
      inputSystem.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalled();
      removeEventListenerSpy.mockRestore();
    });

    it("should reset state on destroy", () => {
      inputSystem.attach(container);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));

      inputSystem.destroy();

      const state = inputSystem.getState();
      expect(state.movement.x).toBe(0);
      expect(state.movement.y).toBe(0);
    });
  });
});
