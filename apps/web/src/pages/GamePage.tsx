import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef } from "react";
import { Graphics } from "pixi.js";
import { GameCanvas, GameEngine, InputSystem, InputState } from "../game";
import { useGameStore, useSettingsStore } from "../stores";

export function GamePage() {
  const { isPlaying, pauseGame, setSurvivalTime } = useGameStore();
  const { showVirtualJoystick, toggleVirtualJoystick } = useSettingsStore();
  const playerRef = useRef<Graphics | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const joystickBaseRef = useRef<Graphics | null>(null);
  const joystickKnobRef = useRef<Graphics | null>(null);
  const inputRef = useRef<InputSystem | null>(null);
  const showJoystickRef = useRef(showVirtualJoystick);

  // Keep ref in sync with store value
  useEffect(() => {
    showJoystickRef.current = showVirtualJoystick;
    // Hide joystick immediately if setting is turned off
    if (!showVirtualJoystick) {
      if (joystickBaseRef.current) joystickBaseRef.current.visible = false;
      if (joystickKnobRef.current) joystickKnobRef.current.visible = false;
    }
  }, [showVirtualJoystick]);

  // Player movement speed (pixels per second)
  const PLAYER_SPEED = 200;

  // Joystick visual settings
  const JOYSTICK_BASE_RADIUS = 60;
  const JOYSTICK_KNOB_RADIUS = 25;

  // Track survival time and move player based on input
  // Note: This callback is only called when the game loop is running
  const handleUpdate = useCallback(
    (deltaMs: number, input: InputState) => {
      setSurvivalTime((prev: number) => prev + deltaMs / 1000);

      // Move player based on input
      const player = playerRef.current;
      const engine = engineRef.current;
      if (player && engine) {
        const deltaSeconds = deltaMs / 1000;
        const moveX = input.movement.x * PLAYER_SPEED * deltaSeconds;
        const moveY = input.movement.y * PLAYER_SPEED * deltaSeconds;

        player.x += moveX;
        player.y += moveY;

        // Keep player within bounds
        const padding = 20;
        player.x = Math.max(padding, Math.min(engine.width - padding, player.x));
        player.y = Math.max(padding, Math.min(engine.height - padding, player.y));
      }

      // Update joystick visual (only if enabled in settings)
      const joystickBase = joystickBaseRef.current;
      const joystickKnob = joystickKnobRef.current;
      const inputSystem = inputRef.current;

      if (joystickBase && joystickKnob && inputSystem) {
        if (inputSystem.isTouching && showJoystickRef.current) {
          const origin = inputSystem.touchOrigin;
          const current = inputSystem.touchCurrent;

          // Show joystick at touch origin
          joystickBase.visible = true;
          joystickBase.x = origin.x;
          joystickBase.y = origin.y;

          // Calculate knob position (clamped to base radius)
          const dx = current.x - origin.x;
          const dy = current.y - origin.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxKnobDistance = JOYSTICK_BASE_RADIUS;

          let knobX = dx;
          let knobY = dy;

          if (distance > maxKnobDistance) {
            const scale = maxKnobDistance / distance;
            knobX = dx * scale;
            knobY = dy * scale;
          }

          joystickKnob.visible = true;
          joystickKnob.x = origin.x + knobX;
          joystickKnob.y = origin.y + knobY;
        } else {
          // Hide joystick when not touching
          joystickBase.visible = false;
          joystickKnob.visible = false;
        }
      }
    },
    [setSurvivalTime]
  );

  // Called when engine is ready - create player sprite and joystick
  const handleEngineReady = useCallback((engine: GameEngine, input: InputSystem) => {
    console.log("Game engine ready:", engine.width, "x", engine.height);
    console.log("Input system attached:", input.isAttached);

    engineRef.current = engine;
    inputRef.current = input;

    // Create a simple player sprite (circle)
    const player = new Graphics();
    player.circle(0, 0, 20);
    player.fill({ color: 0x00ff88 });
    player.stroke({ width: 3, color: 0xffffff });

    // Position at center
    player.x = engine.width / 2;
    player.y = engine.height / 2;

    // Add to stage
    engine.stage?.addChild(player);
    playerRef.current = player;

    // Create joystick base (outer circle)
    const joystickBase = new Graphics();
    joystickBase.circle(0, 0, JOYSTICK_BASE_RADIUS);
    joystickBase.fill({ color: 0xffffff, alpha: 0.2 });
    joystickBase.stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
    joystickBase.visible = false;
    engine.stage?.addChild(joystickBase);
    joystickBaseRef.current = joystickBase;

    // Create joystick knob (inner circle)
    const joystickKnob = new Graphics();
    joystickKnob.circle(0, 0, JOYSTICK_KNOB_RADIUS);
    joystickKnob.fill({ color: 0xffffff, alpha: 0.6 });
    joystickKnob.visible = false;
    engine.stage?.addChild(joystickKnob);
    joystickKnobRef.current = joystickKnob;

    console.log("Player sprite created at:", player.x, player.y);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Game header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Back
          </Link>
          <button
            onClick={toggleVirtualJoystick}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              showVirtualJoystick ? "bg-primary-600 text-white" : "bg-gray-700 text-gray-400"
            }`}
            title="Toggle virtual joystick visibility"
          >
            Joystick: {showVirtualJoystick ? "ON" : "OFF"}
          </button>
        </div>
        <h1 className="text-lg font-bold text-primary-400">Farcaster Survivors</h1>
        {isPlaying && (
          <button
            onClick={pauseGame}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Pause
          </button>
        )}
        {!isPlaying && <div className="w-12" />}
      </div>

      {/* Game canvas container */}
      <div className="flex-1 relative">
        <GameCanvas
          onReady={handleEngineReady}
          onUpdate={handleUpdate}
          className="w-full h-full"
          backgroundColor={0x0a0a1a}
        />
      </div>
    </div>
  );
}
