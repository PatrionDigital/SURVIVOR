/**
 * Vector2 type for movement
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Input state exposed to the game
 */
export interface InputState {
  movement: Vector2;
}

/**
 * Keyboard key state tracking
 */
interface KeyState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * Touch/pointer state tracking
 */
interface TouchState {
  active: boolean;
  pointerId: number | null;
  origin: Vector2;
  current: Vector2;
}

/**
 * InputSystem - Handles keyboard and touch/pointer input for player movement
 *
 * Features:
 * - Keyboard input (WASD, arrow keys)
 * - Touch/pointer input with virtual joystick
 * - 100px dead zone for touch input
 * - Normalized movement vector (-1 to 1)
 * - Keyboard priority over touch when both active
 *
 * @example
 * ```typescript
 * const input = new InputSystem();
 * input.attach(containerElement);
 *
 * // In game loop
 * const state = input.getState();
 * player.move(state.movement.x, state.movement.y);
 *
 * // Cleanup
 * input.destroy();
 * ```
 */
export class InputSystem {
  private element: HTMLElement | null = null;
  private _isAttached = false;
  private _isEnabled = true;

  // Keyboard state
  private keyState: KeyState = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  // Touch/pointer state
  private touchState: TouchState = {
    active: false,
    pointerId: null,
    origin: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
  };

  // Dead zone for virtual joystick (in pixels)
  private readonly DEAD_ZONE = 20;

  // Max distance for full input (in pixels beyond dead zone)
  // Total distance for full input = DEAD_ZONE + MAX_DISTANCE = 80px
  // This is achievable from any screen position without hitting edges
  private readonly MAX_DISTANCE = 60;

  // Bound event handlers (for cleanup)
  private boundHandlers: {
    keydown: (e: KeyboardEvent) => void;
    keyup: (e: KeyboardEvent) => void;
    pointerdown: (e: PointerEvent) => void;
    pointermove: (e: PointerEvent) => void;
    pointerup: (e: PointerEvent) => void;
    pointercancel: (e: PointerEvent) => void;
  };

  constructor() {
    // Bind handlers to preserve 'this' context
    this.boundHandlers = {
      keydown: this.handleKeyDown.bind(this),
      keyup: this.handleKeyUp.bind(this),
      pointerdown: this.handlePointerDown.bind(this),
      pointermove: this.handlePointerMove.bind(this),
      pointerup: this.handlePointerUp.bind(this),
      pointercancel: this.handlePointerCancel.bind(this),
    };
  }

  // ============ Getters ============

  get isAttached(): boolean {
    return this._isAttached;
  }

  get isTouching(): boolean {
    return this.touchState.active;
  }

  get isEnabled(): boolean {
    return this._isEnabled;
  }

  get touchOrigin(): Vector2 {
    return { ...this.touchState.origin };
  }

  get touchCurrent(): Vector2 {
    return { ...this.touchState.current };
  }

  // ============ Public Methods ============

  /**
   * Attach input system to a DOM element
   * @param element - The element to attach to (for pointer events)
   */
  attach(element: HTMLElement): void {
    if (this._isAttached) {
      this.detach();
    }

    this.element = element;
    this._isAttached = true;

    // Keyboard events on window
    window.addEventListener("keydown", this.boundHandlers.keydown);
    window.addEventListener("keyup", this.boundHandlers.keyup);

    // Pointer events on element
    element.addEventListener("pointerdown", this.boundHandlers.pointerdown);
    element.addEventListener("pointermove", this.boundHandlers.pointermove);
    element.addEventListener("pointerup", this.boundHandlers.pointerup);
    element.addEventListener("pointercancel", this.boundHandlers.pointercancel);
  }

  /**
   * Detach input system from current element
   */
  detach(): void {
    if (!this._isAttached) {
      return;
    }

    // Remove keyboard events
    window.removeEventListener("keydown", this.boundHandlers.keydown);
    window.removeEventListener("keyup", this.boundHandlers.keyup);

    // Remove pointer events
    if (this.element) {
      this.element.removeEventListener("pointerdown", this.boundHandlers.pointerdown);
      this.element.removeEventListener("pointermove", this.boundHandlers.pointermove);
      this.element.removeEventListener("pointerup", this.boundHandlers.pointerup);
      this.element.removeEventListener("pointercancel", this.boundHandlers.pointercancel);
    }

    this.element = null;
    this._isAttached = false;
    this.resetState();
  }

  /**
   * Enable input processing
   */
  enable(): void {
    this._isEnabled = true;
  }

  /**
   * Disable input processing and clear current state
   */
  disable(): void {
    this._isEnabled = false;
    this.resetState();
  }

  /**
   * Get the current input state
   * @returns Current input state with normalized movement vector
   */
  getState(): InputState {
    if (!this._isEnabled) {
      return { movement: { x: 0, y: 0 } };
    }

    // Calculate keyboard movement
    const keyboardMovement = this.calculateKeyboardMovement();

    // If keyboard has input, prioritize it
    if (keyboardMovement.x !== 0 || keyboardMovement.y !== 0) {
      return { movement: keyboardMovement };
    }

    // Otherwise use touch input
    const touchMovement = this.calculateTouchMovement();
    return { movement: touchMovement };
  }

  /**
   * Destroy the input system and clean up all resources
   */
  destroy(): void {
    this.detach();
    this.resetState();
  }

  // ============ Private Methods ============

  /**
   * Reset all input state
   */
  private resetState(): void {
    this.keyState = {
      up: false,
      down: false,
      left: false,
      right: false,
    };

    this.touchState = {
      active: false,
      pointerId: null,
      origin: { x: 0, y: 0 },
      current: { x: 0, y: 0 },
    };
  }

  /**
   * Calculate normalized movement from keyboard state
   */
  private calculateKeyboardMovement(): Vector2 {
    let x = 0;
    let y = 0;

    if (this.keyState.left) x -= 1;
    if (this.keyState.right) x += 1;
    if (this.keyState.up) y -= 1;
    if (this.keyState.down) y += 1;

    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const magnitude = Math.sqrt(x * x + y * y);
      x /= magnitude;
      y /= magnitude;
    }

    return { x, y };
  }

  /**
   * Calculate normalized movement from touch state
   */
  private calculateTouchMovement(): Vector2 {
    if (!this.touchState.active) {
      return { x: 0, y: 0 };
    }

    const dx = this.touchState.current.x - this.touchState.origin.x;
    const dy = this.touchState.current.y - this.touchState.origin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Inside dead zone
    if (distance <= this.DEAD_ZONE) {
      return { x: 0, y: 0 };
    }

    // Calculate direction
    const dirX = dx / distance;
    const dirY = dy / distance;

    // Calculate magnitude (0 to 1) based on distance beyond dead zone
    const effectiveDistance = distance - this.DEAD_ZONE;
    const magnitude = Math.min(effectiveDistance / this.MAX_DISTANCE, 1);

    return {
      x: dirX * magnitude,
      y: dirY * magnitude,
    };
  }

  // ============ Event Handlers ============

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this._isEnabled) return;

    const key = e.key.toLowerCase();

    switch (key) {
      case "w":
      case "arrowup":
        this.keyState.up = true;
        break;
      case "s":
      case "arrowdown":
        this.keyState.down = true;
        break;
      case "a":
      case "arrowleft":
        this.keyState.left = true;
        break;
      case "d":
      case "arrowright":
        this.keyState.right = true;
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (!this._isEnabled) return;

    const key = e.key.toLowerCase();

    switch (key) {
      case "w":
      case "arrowup":
        this.keyState.up = false;
        break;
      case "s":
      case "arrowdown":
        this.keyState.down = false;
        break;
      case "a":
      case "arrowleft":
        this.keyState.left = false;
        break;
      case "d":
      case "arrowright":
        this.keyState.right = false;
        break;
    }
  }

  private handlePointerDown(e: PointerEvent): void {
    if (!this._isEnabled) return;

    // Only track first touch
    if (this.touchState.active) return;

    // Convert to element-relative coordinates
    const pos = this.getElementRelativePosition(e);

    this.touchState.active = true;
    this.touchState.pointerId = e.pointerId;
    this.touchState.origin = pos;
    this.touchState.current = pos;
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this._isEnabled) return;

    // Only track the original pointer
    if (!this.touchState.active || e.pointerId !== this.touchState.pointerId) {
      return;
    }

    // Convert to element-relative coordinates
    this.touchState.current = this.getElementRelativePosition(e);
  }

  /**
   * Convert viewport coordinates to element-relative coordinates
   */
  private getElementRelativePosition(e: PointerEvent): Vector2 {
    if (!this.element) {
      return { x: e.clientX, y: e.clientY };
    }

    const rect = this.element.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this._isEnabled) return;

    // Only clear if it's the tracked pointer
    if (e.pointerId !== this.touchState.pointerId) return;

    this.clearTouch();
  }

  private handlePointerCancel(e: PointerEvent): void {
    if (!this._isEnabled) return;

    // Only clear if it's the tracked pointer
    if (e.pointerId !== this.touchState.pointerId) return;

    this.clearTouch();
  }

  private clearTouch(): void {
    this.touchState.active = false;
    this.touchState.pointerId = null;
    this.touchState.origin = { x: 0, y: 0 };
    this.touchState.current = { x: 0, y: 0 };
  }
}
