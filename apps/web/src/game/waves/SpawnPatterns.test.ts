import { describe, it, expect } from "vitest";
import { SpawnPatterns, type ViewportInfo } from "./SpawnPatterns";

describe("SpawnPatterns", () => {
  const viewport: ViewportInfo = {
    cameraX: 0,
    cameraY: 0,
    width: 800,
    height: 600,
    spawnOffset: 100,
  };

  describe("random()", () => {
    it("should generate positions outside viewport", () => {
      const positions = SpawnPatterns.random(5, viewport);

      expect(positions).toHaveLength(5);
      for (const pos of positions) {
        // Should be at or beyond viewport edge + offset
        const halfW = viewport.width / 2;
        const halfH = viewport.height / 2;
        const offset = viewport.spawnOffset;

        // Check if position is outside viewport bounds (at spawn distance)
        const atTopEdge = pos.y <= viewport.cameraY - halfH - offset + 1;
        const atBottomEdge = pos.y >= viewport.cameraY + halfH + offset - 1;
        const atLeftEdge = pos.x <= viewport.cameraX - halfW - offset + 1;
        const atRightEdge = pos.x >= viewport.cameraX + halfW + offset - 1;

        // Position should be at one of the edges
        expect(atTopEdge || atBottomEdge || atLeftEdge || atRightEdge).toBe(true);
      }
    });

    it("should respect camera position", () => {
      const offsetViewport = { ...viewport, cameraX: 1000, cameraY: 500 };
      const positions = SpawnPatterns.random(3, offsetViewport);

      for (const pos of positions) {
        // All positions should be relative to camera
        const distX = Math.abs(pos.x - 1000);
        const distY = Math.abs(pos.y - 500);
        // At least one coordinate should be far from camera (at viewport edge + offset)
        expect(distX > 300 || distY > 200).toBe(true);
      }
    });
  });

  describe("cluster()", () => {
    it("should generate positions clustered around a point", () => {
      const positions = SpawnPatterns.cluster(10, viewport, { radius: 50 });

      expect(positions).toHaveLength(10);

      // All positions should be within 2*radius of each other (since they're all within radius of center)
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const dist = Math.sqrt(
            Math.pow(positions[i].x - positions[j].x, 2) +
              Math.pow(positions[i].y - positions[j].y, 2)
          );
          // Max distance between two points in a circle of radius R is 2*R
          expect(dist).toBeLessThanOrEqual(100);
        }
      }
    });

    it("should place cluster outside viewport", () => {
      const positions = SpawnPatterns.cluster(5, viewport, { radius: 30 });

      // Cluster center should be outside viewport
      const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
      const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;

      const outsideX =
        avgX < viewport.cameraX - viewport.width / 2 ||
        avgX > viewport.cameraX + viewport.width / 2;
      const outsideY =
        avgY < viewport.cameraY - viewport.height / 2 ||
        avgY > viewport.cameraY + viewport.height / 2;

      expect(outsideX || outsideY).toBe(true);
    });
  });

  describe("ring()", () => {
    it("should generate positions in a ring around center", () => {
      const positions = SpawnPatterns.ring(8, viewport, { radius: 400 });

      expect(positions).toHaveLength(8);

      // All positions should be approximately the same distance from center
      for (const pos of positions) {
        const dist = Math.sqrt(
          Math.pow(pos.x - viewport.cameraX, 2) + Math.pow(pos.y - viewport.cameraY, 2)
        );
        expect(dist).toBeCloseTo(400, 0);
      }
    });

    it("should space positions evenly around ring", () => {
      const positions = SpawnPatterns.ring(4, viewport, { radius: 300 });

      // 4 positions should be 90 degrees apart
      // Check that positions form a rough square pattern
      expect(positions).toHaveLength(4);

      // Calculate angles
      const angles = positions.map((p) =>
        Math.atan2(p.y - viewport.cameraY, p.x - viewport.cameraX)
      );
      angles.sort((a, b) => a - b);

      // Differences should be roughly equal (π/2 radians = 90 degrees)
      for (let i = 0; i < angles.length - 1; i++) {
        const diff = angles[i + 1] - angles[i];
        expect(diff).toBeCloseTo(Math.PI / 2, 1);
      }
    });

    it("should support custom center point", () => {
      const positions = SpawnPatterns.ring(4, viewport, {
        radius: 200,
        centerX: 100,
        centerY: 100,
      });

      for (const pos of positions) {
        const dist = Math.sqrt(Math.pow(pos.x - 100, 2) + Math.pow(pos.y - 100, 2));
        expect(dist).toBeCloseTo(200, 0);
      }
    });
  });

  describe("line()", () => {
    it("should generate positions in a line", () => {
      const positions = SpawnPatterns.line(5, viewport, {
        edge: "top",
      });

      expect(positions).toHaveLength(5);

      // All positions should have same Y (top edge)
      const firstY = positions[0].y;
      for (const pos of positions) {
        expect(pos.y).toBe(firstY);
      }

      // Positions should be spread across X
      const xs = positions.map((p) => p.x).sort((a, b) => a - b);
      expect(xs[xs.length - 1] - xs[0]).toBeGreaterThan(0);
    });

    it("should support different edges", () => {
      const topLine = SpawnPatterns.line(3, viewport, { edge: "top" });
      const bottomLine = SpawnPatterns.line(3, viewport, { edge: "bottom" });
      const leftLine = SpawnPatterns.line(3, viewport, { edge: "left" });
      const rightLine = SpawnPatterns.line(3, viewport, { edge: "right" });

      // Top line Y should be less than bottom line Y
      expect(topLine[0].y).toBeLessThan(bottomLine[0].y);

      // Left line X should be less than right line X
      expect(leftLine[0].x).toBeLessThan(rightLine[0].x);
    });

    it("should space positions evenly", () => {
      const positions = SpawnPatterns.line(5, viewport, { edge: "top" });
      const xs = positions.map((p) => p.x).sort((a, b) => a - b);

      // Check spacing is roughly equal
      const spacing = xs[1] - xs[0];
      for (let i = 1; i < xs.length - 1; i++) {
        expect(xs[i + 1] - xs[i]).toBeCloseTo(spacing, 0);
      }
    });
  });

  describe("edge()", () => {
    it("should generate all positions from same random edge", () => {
      const positions = SpawnPatterns.edge(10, viewport);

      expect(positions).toHaveLength(10);

      // Determine which edge based on first position
      const first = positions[0];
      const halfW = viewport.width / 2;
      const halfH = viewport.height / 2;

      const isTop = first.y < viewport.cameraY - halfH;
      const isBottom = first.y > viewport.cameraY + halfH;
      const isLeft = first.x < viewport.cameraX - halfW;
      const isRight = first.x > viewport.cameraX + halfW;

      // All positions should be from the same edge
      for (const pos of positions) {
        if (isTop) {
          expect(pos.y).toBeLessThan(viewport.cameraY - halfH);
        } else if (isBottom) {
          expect(pos.y).toBeGreaterThan(viewport.cameraY + halfH);
        } else if (isLeft) {
          expect(pos.x).toBeLessThan(viewport.cameraX - halfW);
        } else if (isRight) {
          expect(pos.x).toBeGreaterThan(viewport.cameraX + halfW);
        }
      }
    });

    it("should allow specifying the edge", () => {
      const positions = SpawnPatterns.edge(5, viewport, { edge: "left" });

      for (const pos of positions) {
        expect(pos.x).toBeLessThan(viewport.cameraX - viewport.width / 2);
      }
    });
  });

  describe("getPatternFunction()", () => {
    it("should return correct function for pattern name", () => {
      expect(SpawnPatterns.getPatternFunction("random")).toBe(SpawnPatterns.random);
      expect(SpawnPatterns.getPatternFunction("cluster")).toBe(SpawnPatterns.cluster);
      expect(SpawnPatterns.getPatternFunction("ring")).toBe(SpawnPatterns.ring);
      expect(SpawnPatterns.getPatternFunction("line")).toBe(SpawnPatterns.line);
      expect(SpawnPatterns.getPatternFunction("edge")).toBe(SpawnPatterns.edge);
    });

    it("should return random for unknown pattern", () => {
      expect(SpawnPatterns.getPatternFunction("unknown")).toBe(SpawnPatterns.random);
    });
  });
});
