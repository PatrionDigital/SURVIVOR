/**
 * Camera configuration options
 */
export interface CameraOptions {
  /**
   * Lerp factor for smooth camera follow.
   * 0 = instant follow (no smoothing)
   * 0.1 = smooth follow (default)
   * Higher values = faster catch-up
   */
  lerpFactor?: number;
}

/**
 * Viewport bounds in world coordinates
 */
export interface Viewport {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Camera class for following a target with optional smooth interpolation.
 *
 * The camera maintains a position in world space and provides methods
 * to calculate viewport bounds for rendering and entity culling.
 *
 * @example
 * ```typescript
 * const camera = new Camera({ lerpFactor: 0.1 });
 *
 * // In update loop
 * camera.update(player.x, player.y, deltaMs);
 *
 * // Get viewport for enemy spawning
 * const viewport = camera.getViewport(screenWidth, screenHeight);
 * ```
 */
export class Camera {
  /** Camera X position in world space */
  x: number = 0;

  /** Camera Y position in world space */
  y: number = 0;

  /** Lerp factor for smooth follow (0 = instant, higher = faster) */
  private lerpFactor: number;

  constructor(options?: CameraOptions) {
    this.lerpFactor = options?.lerpFactor ?? 0.1;
  }

  /**
   * Update camera position to follow a target.
   *
   * Uses frame-rate independent smoothing when lerpFactor > 0.
   * When lerpFactor = 0, camera snaps instantly to target.
   *
   * @param targetX - Target X position to follow
   * @param targetY - Target Y position to follow
   * @param deltaMs - Time since last frame in milliseconds
   */
  update(targetX: number, targetY: number, deltaMs: number): void {
    if (this.lerpFactor === 0) {
      // Instant follow
      this.x = targetX;
      this.y = targetY;
      return;
    }

    // Handle zero deltaMs (no movement)
    if (deltaMs === 0) {
      return;
    }

    // Frame-rate independent smooth interpolation
    // The formula ensures consistent behavior regardless of frame rate
    // by adjusting the interpolation factor based on actual time elapsed
    const t = 1 - Math.pow(1 - this.lerpFactor, deltaMs / 16.67);

    this.x += (targetX - this.x) * t;
    this.y += (targetY - this.y) * t;
  }

  /**
   * Get the viewport bounds in world coordinates.
   *
   * The viewport is centered on the camera position and extends
   * half the screen dimensions in each direction.
   *
   * @param screenWidth - Screen width in pixels
   * @param screenHeight - Screen height in pixels
   * @returns Viewport bounds in world coordinates
   */
  getViewport(screenWidth: number, screenHeight: number): Viewport {
    const halfWidth = screenWidth / 2;
    const halfHeight = screenHeight / 2;

    return {
      left: this.x - halfWidth,
      right: this.x + halfWidth,
      top: this.y - halfHeight,
      bottom: this.y + halfHeight,
    };
  }

  /**
   * Set the lerp factor for smooth follow.
   *
   * @param factor - Lerp factor (0 = instant, clamped to 0-1)
   */
  setLerpFactor(factor: number): void {
    this.lerpFactor = Math.max(0, Math.min(1, factor));
  }
}
