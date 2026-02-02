import { useState, useEffect, useCallback, useMemo } from "react";
import { useDesignerStore, exportEnemyConfig } from "../stores/designerStore";
import { PreviewCanvas, type YukaParams } from "../components/PreviewCanvas";
import { YukaDebugPanel } from "../components/YukaDebugPanel";
import { PropertyPanel } from "../components/PropertyPanel";
import { ConfigList } from "../components/ConfigList";

export function EnemyDesigner() {
  const {
    enemies,
    selectedEnemyId,
    preview,
    addEnemy,
    updateEnemy,
    deleteEnemy,
    selectEnemy,
    importEnemy,
    getEnemyConfig,
    setPreviewPaused,
    setPreviewTimeScale,
    setPreviewEnemyCount,
    loadFromGame,
  } = useDesignerStore();

  // Get selected config
  const selectedConfig = selectedEnemyId ? enemies[selectedEnemyId] : null;
  const selectedEnemyTypeConfig = selectedEnemyId ? getEnemyConfig(selectedEnemyId) : null;

  // Yuka override state (for live tuning without modifying config)
  const [yukaOverrides, setYukaOverrides] = useState<YukaParams | null>(null);

  // Get current Yuka params (from overrides or config)
  const currentYukaParams: YukaParams = useMemo(() => {
    if (yukaOverrides) return yukaOverrides;
    if (!selectedConfig) {
      return {
        alignment: 0.2,
        cohesion: 0,
        separation: 15,
        seekWeight: 1,
        maxForce: 150,
        maxSpeed: 100,
        boundingRadius: 30,
        neighborhoodRadius: 200,
      };
    }
    return {
      alignment: selectedConfig.flocking.alignment,
      cohesion: selectedConfig.flocking.cohesion,
      separation: selectedConfig.flocking.separation,
      seekWeight: selectedConfig.behavior.seekWeight,
      maxForce: selectedConfig.movement.maxForce,
      maxSpeed: selectedConfig.movement.maxSpeed,
      boundingRadius: selectedConfig.visual.radius * 2,
      neighborhoodRadius: Math.max(200, selectedConfig.visual.radius * 8),
    };
  }, [selectedConfig, yukaOverrides]);

  // Reset Yuka overrides when selected config changes
  useEffect(() => {
    setYukaOverrides(null);
  }, [selectedEnemyId]);

  // Load game configs on mount
  useEffect(() => {
    loadFromGame();
  }, [loadFromGame]);

  // Apply Yuka overrides to config
  const handleApplyYukaToConfig = useCallback(() => {
    if (!selectedEnemyId || !yukaOverrides) return;

    updateEnemy(selectedEnemyId, {
      flocking: {
        alignment: yukaOverrides.alignment,
        cohesion: yukaOverrides.cohesion,
        separation: yukaOverrides.separation,
      },
      movement: {
        ...enemies[selectedEnemyId].movement,
        maxForce: yukaOverrides.maxForce,
        maxSpeed: yukaOverrides.maxSpeed,
      },
      behavior: {
        seekWeight: yukaOverrides.seekWeight,
      },
    });

    setYukaOverrides(null);
  }, [selectedEnemyId, yukaOverrides, updateEnemy, enemies]);

  // Reset Yuka to config values
  const handleResetYukaToConfig = useCallback(() => {
    setYukaOverrides(null);
  }, []);

  // Handle export
  const handleExport = useCallback(
    (id: string) => {
      const config = enemies[id];
      if (config) {
        exportEnemyConfig(config);
      }
    },
    [enemies]
  );

  // Convert enemies map to list for ConfigList
  const enemyList = useMemo(
    () =>
      Object.values(enemies).map((e) => ({
        id: e.id,
        name: e.name,
        color: e.visual.color,
      })),
    [enemies]
  );

  return (
    <div className="h-full flex">
      {/* Left sidebar - Config list */}
      <div className="w-56 p-3 border-r border-gray-700">
        <ConfigList
          title="Enemies"
          items={enemyList}
          selectedId={selectedEnemyId}
          onSelect={selectEnemy}
          onAdd={() => addEnemy()}
          onDelete={deleteEnemy}
          onImport={importEnemy}
          onExport={handleExport}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConfig ? (
          <>
            {/* Top section - Preview and Yuka Debug */}
            <div className="flex gap-4 p-4 border-b border-gray-700">
              {/* Preview Canvas */}
              <div className="flex flex-col gap-3">
                <PreviewCanvas
                  enemyConfig={selectedEnemyTypeConfig}
                  enemyCount={preview.enemyCount}
                  isPaused={preview.isPaused}
                  timeScale={preview.timeScale}
                  yukaOverrides={yukaOverrides || undefined}
                />

                {/* Preview controls */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setPreviewPaused(!preview.isPaused)}
                    className={`px-4 py-2 rounded font-medium ${
                      preview.isPaused
                        ? "bg-green-600 hover:bg-green-500"
                        : "bg-yellow-600 hover:bg-yellow-500"
                    }`}
                  >
                    {preview.isPaused ? "▶ Play" : "⏸ Pause"}
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Speed:</span>
                    <select
                      value={preview.timeScale}
                      onChange={(e) => setPreviewTimeScale(parseFloat(e.target.value))}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={4}>4x</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Count:</span>
                    <input
                      type="number"
                      value={preview.enemyCount}
                      onChange={(e) => setPreviewEnemyCount(parseInt(e.target.value) || 1)}
                      min={1}
                      max={20}
                      className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Yuka Debug Panel */}
              <div className="w-64">
                <YukaDebugPanel
                  params={currentYukaParams}
                  onChange={setYukaOverrides}
                  onApplyToConfig={handleApplyYukaToConfig}
                  onResetToConfig={handleResetYukaToConfig}
                />
              </div>
            </div>

            {/* Bottom section - Property Panel */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-3xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-200">
                    Editing: {selectedConfig.name}
                  </h2>
                  <button
                    onClick={() => handleExport(selectedEnemyId!)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                  >
                    Export JSON
                  </button>
                </div>
                <PropertyPanel
                  config={selectedConfig}
                  onChange={(updates) => updateEnemy(selectedEnemyId!, updates)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">👾</div>
              <div className="text-lg">Select or create an enemy to begin</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
