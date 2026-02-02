/**
 * Spawn position with coordinates
 */
export interface SpawnPosition {
  x: number;
  y: number;
}

/**
 * Viewport information for spawn calculations
 */
export interface ViewportInfo {
  /** Camera center X position */
  cameraX: number;
  /** Camera center Y position */
  cameraY: number;
  /** Viewport width */
  width: number;
  /** Viewport height */
  height: number;
  /** Distance from viewport edge to spawn */
  spawnOffset: number;
}

/**
 * Options for cluster spawn pattern
 */
export interface ClusterOptions {
  /** Radius of the cluster */
  radius?: number;
}

/**
 * Options for ring spawn pattern
 */
export interface RingOptions {
  /** Radius of the ring */
  radius?: number;
  /** Custom center X (defaults to camera position) */
  centerX?: number;
  /** Custom center Y (defaults to camera position) */
  centerY?: number;
}

/**
 * Options for line spawn pattern
 */
export interface LineOptions {
  /** Edge to spawn from */
  edge: "top" | "bottom" | "left" | "right";
}

/**
 * Options for edge spawn pattern
 */
export interface EdgeOptions {
  /** Specific edge to use (random if not specified) */
  edge?: "top" | "bottom" | "left" | "right";
}

type Edge = "top" | "bottom" | "left" | "right";

/**
 * SpawnPatterns - Utility class for calculating spawn positions
 *
 * Provides various patterns for spawning enemies:
 * - random: Random positions around viewport edges
 * - cluster: Grouped positions near a single point
 * - ring: Positions in a circle around a point
 * - line: Positions in a line from one edge
 * - edge: All positions from the same random edge
 */
export class SpawnPatterns {
  /**
   * Generate random spawn positions around viewport edges
   */
  static random(count: number, viewport: ViewportInfo): SpawnPosition[] {
    const positions: SpawnPosition[] = [];
    const edges: Edge[] = ["top", "bottom", "left", "right"];

    for (let i = 0; i < count; i++) {
      const edge = edges[Math.floor(Math.random() * edges.length)];
      positions.push(SpawnPatterns.getPositionOnEdge(edge, viewport));
    }

    return positions;
  }

  /**
   * Generate clustered spawn positions around a single point
   */
  static cluster(
    count: number,
    viewport: ViewportInfo,
    options: ClusterOptions = {}
  ): SpawnPosition[] {
    const radius = options.radius ?? 50;

    // Pick random edge for cluster center
    const edges: Edge[] = ["top", "bottom", "left", "right"];
    const edge = edges[Math.floor(Math.random() * edges.length)];
    const center = SpawnPatterns.getPositionOnEdge(edge, viewport);

    const positions: SpawnPosition[] = [];
    for (let i = 0; i < count; i++) {
      // Random position within cluster radius
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;

      positions.push({
        x: center.x + Math.cos(angle) * dist,
        y: center.y + Math.sin(angle) * dist,
      });
    }

    return positions;
  }

  /**
   * Generate spawn positions in a ring around a center point
   */
  static ring(count: number, viewport: ViewportInfo, options: RingOptions = {}): SpawnPosition[] {
    const radius = options.radius ?? 400;
    const centerX = options.centerX ?? viewport.cameraX;
    const centerY = options.centerY ?? viewport.cameraY;

    const positions: SpawnPosition[] = [];
    const angleStep = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      positions.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    }

    return positions;
  }

  /**
   * Generate spawn positions in a line from one edge
   */
  static line(count: number, viewport: ViewportInfo, options: LineOptions): SpawnPosition[] {
    const { edge } = options;
    const positions: SpawnPosition[] = [];

    const halfW = viewport.width / 2;
    const halfH = viewport.height / 2;
    const offset = viewport.spawnOffset;

    switch (edge) {
      case "top": {
        const y = viewport.cameraY - halfH - offset;
        const startX = viewport.cameraX - halfW;
        const endX = viewport.cameraX + halfW;
        const step = (endX - startX) / (count - 1 || 1);
        for (let i = 0; i < count; i++) {
          positions.push({ x: startX + i * step, y });
        }
        break;
      }

      case "bottom": {
        const y = viewport.cameraY + halfH + offset;
        const startX = viewport.cameraX - halfW;
        const endX = viewport.cameraX + halfW;
        const step = (endX - startX) / (count - 1 || 1);
        for (let i = 0; i < count; i++) {
          positions.push({ x: startX + i * step, y });
        }
        break;
      }

      case "left": {
        const x = viewport.cameraX - halfW - offset;
        const startY = viewport.cameraY - halfH;
        const endY = viewport.cameraY + halfH;
        const step = (endY - startY) / (count - 1 || 1);
        for (let i = 0; i < count; i++) {
          positions.push({ x, y: startY + i * step });
        }
        break;
      }

      case "right": {
        const x = viewport.cameraX + halfW + offset;
        const startY = viewport.cameraY - halfH;
        const endY = viewport.cameraY + halfH;
        const step = (endY - startY) / (count - 1 || 1);
        for (let i = 0; i < count; i++) {
          positions.push({ x, y: startY + i * step });
        }
        break;
      }
    }

    return positions;
  }

  /**
   * Generate spawn positions all from the same edge
   */
  static edge(count: number, viewport: ViewportInfo, options: EdgeOptions = {}): SpawnPosition[] {
    const edges: Edge[] = ["top", "bottom", "left", "right"];
    const edge = options.edge ?? edges[Math.floor(Math.random() * edges.length)];

    const positions: SpawnPosition[] = [];

    for (let i = 0; i < count; i++) {
      positions.push(SpawnPatterns.getPositionOnEdge(edge, viewport));
    }

    return positions;
  }

  /**
   * Get a single random position on a specific edge
   */
  private static getPositionOnEdge(edge: Edge, viewport: ViewportInfo): SpawnPosition {
    const halfW = viewport.width / 2;
    const halfH = viewport.height / 2;
    const offset = viewport.spawnOffset;

    switch (edge) {
      case "top":
        return {
          x: viewport.cameraX - halfW + Math.random() * viewport.width,
          y: viewport.cameraY - halfH - offset,
        };

      case "bottom":
        return {
          x: viewport.cameraX - halfW + Math.random() * viewport.width,
          y: viewport.cameraY + halfH + offset,
        };

      case "left":
        return {
          x: viewport.cameraX - halfW - offset,
          y: viewport.cameraY - halfH + Math.random() * viewport.height,
        };

      case "right":
        return {
          x: viewport.cameraX + halfW + offset,
          y: viewport.cameraY - halfH + Math.random() * viewport.height,
        };
    }
  }

  /**
   * Get the pattern function by name
   */
  static getPatternFunction(
    name: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): (count: number, viewport: ViewportInfo, options?: any) => SpawnPosition[] {
    switch (name) {
      case "random":
        return SpawnPatterns.random;
      case "cluster":
        return SpawnPatterns.cluster;
      case "ring":
        return SpawnPatterns.ring;
      case "line":
        return SpawnPatterns.line;
      case "edge":
        return SpawnPatterns.edge;
      default:
        return SpawnPatterns.random;
    }
  }
}
