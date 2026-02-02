import { useEffect, useRef, useCallback } from "react";
import { Application, Container, Graphics } from "pixi.js";
import { EntityManager } from "yuka";
import { createGameWorld, type GameWorld, type Entity } from "@game/ecs/World";
import { createEnemy, destroyEnemy } from "@game/enemies";
import { enemyAISystem } from "@game/enemies/EnemyAISystem";
import { renderSystem } from "@game/ecs/systems/RenderSystem";
import { Camera } from "@game/Camera";
import type { EnemyTypeConfig } from "@game/enemies/types";

interface PreviewCanvasProps {
  /** Enemy config to preview */
  enemyConfig: EnemyTypeConfig | null;
  /** Number of enemies to spawn */
  enemyCount: number;
  /** Whether preview is paused */
  isPaused: boolean;
  /** Time scale (1 = normal, 2 = 2x speed, etc.) */
  timeScale: number;
  /** External Yuka parameter overrides */
  yukaOverrides?: Partial<YukaParams>;
}

export interface YukaParams {
  alignment: number;
  cohesion: number;
  separation: number;
  seekWeight: number;
  maxForce: number;
  maxSpeed: number;
  boundingRadius: number;
  neighborhoodRadius: number;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

export function PreviewCanvas({
  enemyConfig,
  enemyCount,
  isPaused,
  timeScale,
  yukaOverrides,
}: PreviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<GameWorld | null>(null);
  const yukaManagerRef = useRef<EntityManager | null>(null);
  const gameContainerRef = useRef<Container | null>(null);
  const enemiesRef = useRef<Entity[]>([]);
  const targetRef = useRef<{ x: number; y: number }>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
  const targetGraphicsRef = useRef<Graphics | null>(null);
  const isDraggingRef = useRef(false);
  const cameraRef = useRef<Camera | null>(null);

  // Initialize PixiJS
  useEffect(() => {
    if (!containerRef.current) return;

    const initPixi = async () => {
      const app = new Application();
      await app.init({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x1a1a2e,
        antialias: true,
      });

      containerRef.current!.appendChild(app.canvas);
      appRef.current = app;

      // Create game container
      const gameContainer = new Container();
      app.stage.addChild(gameContainer);
      gameContainerRef.current = gameContainer;

      // Create ECS world
      worldRef.current = createGameWorld();

      // Create Yuka manager
      yukaManagerRef.current = new EntityManager();

      // Create camera (fixed at center for preview)
      cameraRef.current = new Camera({ lerpFactor: 1 });
      cameraRef.current.x = CANVAS_WIDTH / 2;
      cameraRef.current.y = CANVAS_HEIGHT / 2;

      // Create target marker
      const targetGraphics = new Graphics();
      targetGraphics.circle(0, 0, 10);
      targetGraphics.fill({ color: 0x00ff88, alpha: 0.8 });
      targetGraphics.circle(0, 0, 5);
      targetGraphics.fill({ color: 0xffffff });
      targetGraphics.position.set(targetRef.current.x, targetRef.current.y);
      gameContainer.addChild(targetGraphics);
      targetGraphicsRef.current = targetGraphics;

      // Draw grid background
      const bgGraphics = new Graphics();
      const gridSize = 50;
      for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
        bgGraphics.moveTo(x, 0);
        bgGraphics.lineTo(x, CANVAS_HEIGHT);
      }
      for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
        bgGraphics.moveTo(0, y);
        bgGraphics.lineTo(CANVAS_WIDTH, y);
      }
      bgGraphics.stroke({ width: 1, color: 0x333355, alpha: 0.5 });
      gameContainer.addChildAt(bgGraphics, 0);

      // Game loop
      let lastTime = performance.now();
      app.ticker.add(() => {
        if (isPaused) return;

        const now = performance.now();
        const deltaMs = (now - lastTime) * timeScale;
        lastTime = now;

        // Update Yuka AI
        if (yukaManagerRef.current && worldRef.current) {
          enemyAISystem(worldRef.current, yukaManagerRef.current, deltaMs, targetRef.current);
        }

        // Render
        if (worldRef.current && cameraRef.current) {
          renderSystem(worldRef.current, cameraRef.current, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
      });
    };

    initPixi();

    return () => {
      // Cleanup
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  // Handle pause/timeScale changes
  useEffect(() => {
    // Pause state is handled in the game loop
  }, [isPaused, timeScale]);

  // Handle target dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on target
    const dx = x - targetRef.current.x;
    const dy = y - targetRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) < 20) {
      isDraggingRef.current = true;
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(0, Math.min(CANVAS_WIDTH, e.clientX - rect.left));
    const y = Math.max(0, Math.min(CANVAS_HEIGHT, e.clientY - rect.top));

    targetRef.current = { x, y };
    if (targetGraphicsRef.current) {
      targetGraphicsRef.current.position.set(x, y);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Spawn enemies when config changes
  const spawnEnemies = useCallback(() => {
    if (!worldRef.current || !yukaManagerRef.current || !gameContainerRef.current || !enemyConfig) {
      return;
    }

    // Clear existing enemies
    for (const entity of enemiesRef.current) {
      destroyEnemy(worldRef.current, yukaManagerRef.current, entity);
    }
    enemiesRef.current = [];

    // Apply Yuka overrides to config if provided
    const configWithOverrides: EnemyTypeConfig = yukaOverrides
      ? {
          ...enemyConfig,
          flocking: {
            alignment: yukaOverrides.alignment ?? enemyConfig.flocking.alignment,
            cohesion: yukaOverrides.cohesion ?? enemyConfig.flocking.cohesion,
            separation: yukaOverrides.separation ?? enemyConfig.flocking.separation,
          },
          movement: {
            ...enemyConfig.movement,
            maxSpeed: yukaOverrides.maxSpeed ?? enemyConfig.movement.maxSpeed,
            maxForce: yukaOverrides.maxForce ?? enemyConfig.movement.maxForce,
          },
          behavior: {
            seekWeight: yukaOverrides.seekWeight ?? enemyConfig.behavior.seekWeight,
          },
        }
      : enemyConfig;

    // Spawn new enemies in a circle around center
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const spawnRadius = 150;

    for (let i = 0; i < enemyCount; i++) {
      const angle = (i / enemyCount) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * spawnRadius;
      const y = centerY + Math.sin(angle) * spawnRadius;

      const entity = createEnemy(
        worldRef.current,
        yukaManagerRef.current,
        gameContainerRef.current,
        configWithOverrides,
        { x, y }
      );
      enemiesRef.current.push(entity);
    }
  }, [enemyConfig, enemyCount, yukaOverrides]);

  // Respawn when config or count changes
  useEffect(() => {
    spawnEnemies();
  }, [spawnEnemies]);

  // Reset function
  const handleReset = useCallback(() => {
    // Reset target to center
    targetRef.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    if (targetGraphicsRef.current) {
      targetGraphicsRef.current.position.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }
    // Respawn enemies
    spawnEnemies();
  }, [spawnEnemies]);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden border border-gray-600 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      />
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>Drag the green target to move enemies</span>
        <button
          onClick={handleReset}
          className="ml-auto px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
