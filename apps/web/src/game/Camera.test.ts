import { describe, it, expect } from "vitest";
import { Camera } from "./Camera";

describe("Camera", () => {
  describe("Construction", () => {
    it("should initialize at origin", () => {
      const camera = new Camera();

      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
    });

    it("should use default lerpFactor of 0.1", () => {
      const camera = new Camera();

      // Move target far away, check it doesn't snap instantly
      camera.update(1000, 1000, 16);

      // With lerp 0.1, it should move partially toward target
      expect(camera.x).toBeGreaterThan(0);
      expect(camera.x).toBeLessThan(1000);
    });

    it("should accept custom lerpFactor", () => {
      const camera = new Camera({ lerpFactor: 0.5 });

      camera.update(100, 100, 16);

      // Higher lerp = moves faster toward target
      expect(camera.x).toBeGreaterThan(30); // Would be ~50 with lerp 0.5
    });
  });

  describe("Instant Follow (lerpFactor = 0)", () => {
    it("should snap to target position immediately", () => {
      const camera = new Camera({ lerpFactor: 0 });

      camera.update(500, 300, 16);

      expect(camera.x).toBe(500);
      expect(camera.y).toBe(300);
    });

    it("should follow target every frame", () => {
      const camera = new Camera({ lerpFactor: 0 });

      camera.update(100, 100, 16);
      expect(camera.x).toBe(100);

      camera.update(200, 150, 16);
      expect(camera.x).toBe(200);
      expect(camera.y).toBe(150);
    });
  });

  describe("Smooth Follow (lerpFactor > 0)", () => {
    it("should move toward target over time", () => {
      const camera = new Camera({ lerpFactor: 0.1 });

      camera.update(100, 0, 16);
      const firstX = camera.x;

      camera.update(100, 0, 16);
      const secondX = camera.x;

      // Should get closer each frame
      expect(secondX).toBeGreaterThan(firstX);
      expect(secondX).toBeLessThan(100);
    });

    it("should converge to target position", () => {
      const camera = new Camera({ lerpFactor: 0.2 });

      // Run many frames
      for (let i = 0; i < 100; i++) {
        camera.update(500, 500, 16);
      }

      // Should be very close to target
      expect(camera.x).toBeCloseTo(500, 0);
      expect(camera.y).toBeCloseTo(500, 0);
    });

    it("should be frame-rate independent", () => {
      const camera1 = new Camera({ lerpFactor: 0.1 });
      const camera2 = new Camera({ lerpFactor: 0.1 });

      // Camera 1: 2 frames at 16ms each
      camera1.update(100, 100, 16);
      camera1.update(100, 100, 16);

      // Camera 2: 1 frame at 32ms
      camera2.update(100, 100, 32);

      // Should be approximately equal (frame-rate independent)
      expect(camera1.x).toBeCloseTo(camera2.x, 1);
      expect(camera1.y).toBeCloseTo(camera2.y, 1);
    });
  });

  describe("getViewport", () => {
    it("should return viewport centered on camera position", () => {
      const camera = new Camera({ lerpFactor: 0 });
      camera.update(500, 300, 0);

      const viewport = camera.getViewport(800, 600);

      expect(viewport.left).toBe(100); // 500 - 400
      expect(viewport.right).toBe(900); // 500 + 400
      expect(viewport.top).toBe(0); // 300 - 300
      expect(viewport.bottom).toBe(600); // 300 + 300
    });

    it("should handle camera at origin", () => {
      const camera = new Camera();

      const viewport = camera.getViewport(800, 600);

      expect(viewport.left).toBe(-400);
      expect(viewport.right).toBe(400);
      expect(viewport.top).toBe(-300);
      expect(viewport.bottom).toBe(300);
    });

    it("should handle different screen sizes", () => {
      const camera = new Camera({ lerpFactor: 0 });
      camera.update(0, 0, 0);

      const viewport = camera.getViewport(1920, 1080);

      expect(viewport.left).toBe(-960);
      expect(viewport.right).toBe(960);
      expect(viewport.top).toBe(-540);
      expect(viewport.bottom).toBe(540);
    });
  });

  describe("setLerpFactor", () => {
    it("should update lerp factor", () => {
      const camera = new Camera({ lerpFactor: 0 });

      camera.setLerpFactor(0.5);
      camera.update(100, 100, 16);

      // Should now use smooth follow
      expect(camera.x).toBeLessThan(100);
      expect(camera.x).toBeGreaterThan(0);
    });

    it("should clamp lerp factor to minimum 0", () => {
      const camera = new Camera();

      camera.setLerpFactor(-0.5);
      camera.update(100, 100, 16);

      // Should behave as instant follow (lerp = 0)
      expect(camera.x).toBe(100);
      expect(camera.y).toBe(100);
    });

    it("should clamp lerp factor to maximum 1", () => {
      const camera = new Camera();

      camera.setLerpFactor(5);
      camera.update(100, 100, 16);

      // Should still work (lerp clamped to 1)
      expect(camera.x).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero deltaMs", () => {
      const camera = new Camera({ lerpFactor: 0.1 });

      camera.update(100, 100, 0);

      // With zero time, no movement should occur
      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
    });

    it("should handle very large deltaMs", () => {
      const camera = new Camera({ lerpFactor: 0.1 });

      camera.update(100, 100, 10000);

      // Should converge to target
      expect(camera.x).toBeCloseTo(100, 0);
      expect(camera.y).toBeCloseTo(100, 0);
    });

    it("should handle negative target positions", () => {
      const camera = new Camera({ lerpFactor: 0 });

      camera.update(-500, -300, 16);

      expect(camera.x).toBe(-500);
      expect(camera.y).toBe(-300);
    });
  });
});
