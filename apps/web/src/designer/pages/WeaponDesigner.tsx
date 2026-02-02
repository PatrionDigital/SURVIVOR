import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Application, Graphics } from "pixi.js";
import { useDesignerStore, exportWeaponConfig } from "../stores/designerStore";
import { ConfigList } from "../components/ConfigList";
import type { WeaponConfig } from "@game/combat/types";

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 300;

interface WeaponPreviewProps {
  config: WeaponConfig;
  isPaused: boolean;
}

function WeaponPreview({ config, isPaused }: WeaponPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const projectilesRef = useRef<Graphics[]>([]);
  const cooldownRef = useRef(0);
  const targetRef = useRef({ x: CANVAS_WIDTH - 100, y: CANVAS_HEIGHT / 2 });

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

      // Draw player position (left side)
      const player = new Graphics();
      player.circle(80, CANVAS_HEIGHT / 2, 20);
      player.fill(0x00ff00);
      player.stroke({ color: 0xffffff, width: 2 });
      app.stage.addChild(player);

      // Draw target
      const target = new Graphics();
      target.circle(targetRef.current.x, targetRef.current.y, 15);
      target.fill(0xff4444);
      target.stroke({ color: 0xffffff, width: 2 });
      app.stage.addChild(target);

      // Range indicator
      const range = new Graphics();
      range.circle(80, CANVAS_HEIGHT / 2, config.range);
      range.stroke({ color: 0x00ff00, width: 1, alpha: 0.3 });
      app.stage.addChild(range);
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  // Update preview on config change
  useEffect(() => {
    if (!appRef.current) return;

    // Clear existing projectiles
    for (const p of projectilesRef.current) {
      p.destroy();
    }
    projectilesRef.current = [];
    cooldownRef.current = 0;
  }, [config]);

  // Animation loop
  useEffect(() => {
    if (!appRef.current || isPaused) return;

    let animId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      cooldownRef.current -= delta;

      // Fire projectiles
      if (cooldownRef.current <= 0) {
        cooldownRef.current = config.cooldown;
        fireProjectiles();
      }

      // Update projectiles
      const toRemove: number[] = [];
      for (let i = 0; i < projectilesRef.current.length; i++) {
        const p = projectilesRef.current[i];
        const data = (p as unknown as { userData: { dx: number; dy: number; lifetime: number } })
          .userData;

        // Move
        p.x += data.dx * config.projectileSpeed * (delta / 1000);
        p.y += data.dy * config.projectileSpeed * (delta / 1000);

        // Check lifetime
        data.lifetime -= delta;
        if (data.lifetime <= 0 || p.x > CANVAS_WIDTH + 50 || p.x < -50) {
          toRemove.push(i);
        }
      }

      // Remove dead projectiles
      for (let i = toRemove.length - 1; i >= 0; i--) {
        const idx = toRemove[i];
        projectilesRef.current[idx].destroy();
        projectilesRef.current.splice(idx, 1);
      }

      animId = requestAnimationFrame(animate);
    };

    const fireProjectiles = () => {
      if (!appRef.current) return;

      const origin = { x: 80, y: CANVAS_HEIGHT / 2 };
      const target = targetRef.current;

      const dx = target.x - origin.x;
      const dy = target.y - origin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const baseDir = { x: dx / dist, y: dy / dist };
      const baseAngle = Math.atan2(baseDir.y, baseDir.x);

      const count = config.projectilesPerShot;
      const spreadRad = (config.spreadAngle * Math.PI) / 180;
      const angleStep = count > 1 ? spreadRad / (count - 1) : 0;
      const startAngle = -spreadRad / 2;

      for (let i = 0; i < count; i++) {
        const angle = baseAngle + startAngle + angleStep * i;
        const dir = { x: Math.cos(angle), y: Math.sin(angle) };

        const g = new Graphics();
        g.circle(0, 0, config.visual.radius);
        g.fill(config.visual.color);
        g.x = origin.x;
        g.y = origin.y;

        (g as unknown as { userData: { dx: number; dy: number; lifetime: number } }).userData = {
          dx: dir.x,
          dy: dir.y,
          lifetime: config.projectileLifetime,
        };

        appRef.current!.stage.addChild(g);
        projectilesRef.current.push(g);
      }
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [config, isPaused]);

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden border border-gray-700"
      style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
    />
  );
}

export function WeaponDesigner() {
  const {
    weapons,
    selectedWeaponId,
    addWeapon,
    updateWeapon,
    deleteWeapon,
    selectWeapon,
    importWeapon,
  } = useDesignerStore();

  const [isPaused, setIsPaused] = useState(false);

  const selectedConfig = selectedWeaponId ? weapons[selectedWeaponId] : null;

  // Handle export
  const handleExport = useCallback(
    (id: string) => {
      const config = weapons[id];
      if (config) {
        exportWeaponConfig(config);
      }
    },
    [weapons]
  );

  // Convert weapons map to list for ConfigList
  const weaponList = useMemo(
    () =>
      Object.values(weapons).map((w) => ({
        id: w.id,
        name: w.name,
        color: `#${w.visual.color.toString(16).padStart(6, "0")}`,
      })),
    [weapons]
  );

  // Update config helper
  const updateConfig = useCallback(
    (updates: Partial<WeaponConfig>) => {
      if (selectedWeaponId) {
        updateWeapon(selectedWeaponId, updates);
      }
    },
    [selectedWeaponId, updateWeapon]
  );

  return (
    <div className="h-full flex">
      {/* Left sidebar - Config list */}
      <div className="w-56 p-3 border-r border-gray-700">
        <ConfigList
          title="Weapons"
          items={weaponList}
          selectedId={selectedWeaponId}
          onSelect={selectWeapon}
          onAdd={() => addWeapon()}
          onDelete={deleteWeapon}
          onImport={importWeapon}
          onExport={handleExport}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConfig ? (
          <>
            {/* Preview section */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-start gap-4">
                <WeaponPreview config={selectedConfig} isPaused={isPaused} />

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className={`px-4 py-2 rounded font-medium ${
                      isPaused
                        ? "bg-green-600 hover:bg-green-500"
                        : "bg-yellow-600 hover:bg-yellow-500"
                    }`}
                  >
                    {isPaused ? "▶ Play" : "⏸ Pause"}
                  </button>

                  <div className="text-xs text-gray-400 space-y-1 mt-2">
                    <div>
                      DPS:{" "}
                      {Math.round(
                        (selectedConfig.damage * selectedConfig.projectilesPerShot) /
                          (selectedConfig.cooldown / 1000)
                      )}
                    </div>
                    <div>Fire Rate: {(1000 / selectedConfig.cooldown).toFixed(1)}/s</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Properties */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-2xl space-y-6">
                {/* Basic info */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-cyan-400 mb-3">Basic Info</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400">ID</label>
                      <input
                        type="text"
                        value={selectedConfig.id}
                        onChange={(e) => updateConfig({ id: e.target.value })}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Name</label>
                      <input
                        type="text"
                        value={selectedConfig.name}
                        onChange={(e) => updateConfig({ name: e.target.value })}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Combat stats */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-cyan-400 mb-3">Combat</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-400">Damage</label>
                      <input
                        type="number"
                        value={selectedConfig.damage}
                        onChange={(e) => updateConfig({ damage: parseInt(e.target.value) || 1 })}
                        min={1}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Cooldown (ms)</label>
                      <input
                        type="number"
                        value={selectedConfig.cooldown}
                        onChange={(e) =>
                          updateConfig({ cooldown: parseInt(e.target.value) || 100 })
                        }
                        min={50}
                        step={50}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Range (px)</label>
                      <input
                        type="number"
                        value={selectedConfig.range}
                        onChange={(e) => updateConfig({ range: parseInt(e.target.value) || 100 })}
                        min={50}
                        step={25}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Pierce Count</label>
                      <input
                        type="number"
                        value={selectedConfig.pierce}
                        onChange={(e) => updateConfig({ pierce: parseInt(e.target.value) || 0 })}
                        min={0}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Projectile settings */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-cyan-400 mb-3">Projectile</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-400">Speed (px/s)</label>
                      <input
                        type="number"
                        value={selectedConfig.projectileSpeed}
                        onChange={(e) =>
                          updateConfig({ projectileSpeed: parseInt(e.target.value) || 100 })
                        }
                        min={50}
                        step={50}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Lifetime (ms)</label>
                      <input
                        type="number"
                        value={selectedConfig.projectileLifetime}
                        onChange={(e) =>
                          updateConfig({ projectileLifetime: parseInt(e.target.value) || 500 })
                        }
                        min={100}
                        step={100}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Radius</label>
                      <input
                        type="number"
                        value={selectedConfig.visual.radius}
                        onChange={(e) =>
                          updateConfig({
                            visual: {
                              ...selectedConfig.visual,
                              radius: parseInt(e.target.value) || 4,
                            },
                          })
                        }
                        min={2}
                        max={20}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Color</label>
                      <input
                        type="color"
                        value={`#${selectedConfig.visual.color.toString(16).padStart(6, "0")}`}
                        onChange={(e) =>
                          updateConfig({
                            visual: {
                              ...selectedConfig.visual,
                              color: parseInt(e.target.value.slice(1), 16),
                            },
                          })
                        }
                        className="w-full h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Spread settings */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-cyan-400 mb-3">Spread / Multi-shot</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400">Projectiles Per Shot</label>
                      <input
                        type="number"
                        value={selectedConfig.projectilesPerShot}
                        onChange={(e) =>
                          updateConfig({ projectilesPerShot: parseInt(e.target.value) || 1 })
                        }
                        min={1}
                        max={12}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Spread Angle (degrees)</label>
                      <input
                        type="number"
                        value={selectedConfig.spreadAngle}
                        onChange={(e) =>
                          updateConfig({ spreadAngle: parseInt(e.target.value) || 0 })
                        }
                        min={0}
                        max={180}
                        step={5}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-400">
                    {selectedConfig.projectilesPerShot > 1 && (
                      <div>
                        Angle between projectiles:{" "}
                        {selectedConfig.projectilesPerShot > 1
                          ? (
                              selectedConfig.spreadAngle /
                              (selectedConfig.projectilesPerShot - 1)
                            ).toFixed(1)
                          : 0}
                        °
                      </div>
                    )}
                  </div>
                </div>

                {/* Export */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleExport(selectedWeaponId!)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                  >
                    Export JSON
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">🔫</div>
              <div className="text-lg">Select or create a weapon to begin</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
