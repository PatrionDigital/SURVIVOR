import { useState, useEffect, useCallback, useMemo } from "react";
import { useDesignerStore, exportWaveConfig } from "../stores/designerStore";
import { Timeline } from "../components/Timeline";
import { PhaseEditor } from "../components/PhaseEditor";
import { EventEditor } from "../components/EventEditor";
import { ConfigList } from "../components/ConfigList";
import type { WavePhase, TimedEvent } from "@game/waves/types";

type SelectionType = "phase" | "event" | null;

export function WaveDesigner() {
  const {
    waves,
    enemies,
    selectedWaveId,
    addWave,
    updateWave,
    deleteWave,
    selectWave,
    importWave,
  } = useDesignerStore();

  // Selection state
  const [selectionType, setSelectionType] = useState<SelectionType>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Get selected config
  const selectedConfig = selectedWaveId ? waves[selectedWaveId] : null;

  // Available enemy types from enemy configs
  const availableEnemyTypes = useMemo(() => Object.keys(enemies), [enemies]);

  // Get selected phase/event
  const selectedPhase = useMemo(() => {
    if (!selectedConfig || !selectedPhaseId) return null;
    return selectedConfig.phases.find((p) => p.id === selectedPhaseId) || null;
  }, [selectedConfig, selectedPhaseId]);

  const selectedEvent = useMemo(() => {
    if (!selectedConfig || !selectedEventId) return null;
    return selectedConfig.events.find((e) => e.id === selectedEventId) || null;
  }, [selectedConfig, selectedEventId]);

  // Reset selection when wave changes
  useEffect(() => {
    setSelectionType(null);
    setSelectedPhaseId(null);
    setSelectedEventId(null);
    setCurrentTime(0);
    setIsPlaying(false);
  }, [selectedWaveId]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || !selectedConfig) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 100 * playbackSpeed;
        if (next >= selectedConfig.globalSettings.maxGameTime) {
          setIsPlaying(false);
          return selectedConfig.globalSettings.maxGameTime;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, selectedConfig]);

  // Handle phase selection
  const handleSelectPhase = useCallback((phaseId: string) => {
    setSelectionType("phase");
    setSelectedPhaseId(phaseId);
    setSelectedEventId(null);
  }, []);

  // Handle event selection
  const handleSelectEvent = useCallback((eventId: string) => {
    setSelectionType("event");
    setSelectedEventId(eventId);
    setSelectedPhaseId(null);
  }, []);

  // Handle time change
  const handleTimeChange = useCallback((time: number) => {
    setCurrentTime(time);
    setIsPlaying(false);
  }, []);

  // Handle phase timing change (from timeline drag)
  const handlePhaseTimingChange = useCallback(
    (phaseId: string, startTime: number, endTime: number) => {
      if (!selectedWaveId || !selectedConfig) return;

      const updatedPhases = selectedConfig.phases.map((p) =>
        p.id === phaseId ? { ...p, startTime, endTime } : p
      );

      updateWave(selectedWaveId, { phases: updatedPhases });
    },
    [selectedWaveId, selectedConfig, updateWave]
  );

  // Handle event timing change (from timeline drag)
  const handleEventTimingChange = useCallback(
    (eventId: string, triggerTime: number) => {
      if (!selectedWaveId || !selectedConfig) return;

      const updatedEvents = selectedConfig.events.map((e) =>
        e.id === eventId ? { ...e, triggerTime } : e
      );

      updateWave(selectedWaveId, { events: updatedEvents });
    },
    [selectedWaveId, selectedConfig, updateWave]
  );

  // Add new phase
  const handleAddPhase = useCallback(() => {
    if (!selectedWaveId || !selectedConfig) return;

    const phases = selectedConfig.phases;
    const lastPhase = phases[phases.length - 1];
    const startTime = lastPhase ? lastPhase.endTime : 0;
    const duration = 60000; // 1 minute default

    const newPhase: WavePhase = {
      id: `phase-${Date.now()}`,
      name: `Phase ${phases.length + 1}`,
      startTime,
      endTime: startTime + duration,
      enemyTypes: availableEnemyTypes.slice(0, 1),
      spawnRateMultiplier: 1.0,
      maxEnemies: 20,
    };

    updateWave(selectedWaveId, {
      phases: [...phases, newPhase],
    });

    handleSelectPhase(newPhase.id);
  }, [selectedWaveId, selectedConfig, availableEnemyTypes, updateWave, handleSelectPhase]);

  // Add new event
  const handleAddEvent = useCallback(() => {
    if (!selectedWaveId || !selectedConfig) return;

    const newEvent: TimedEvent = {
      id: `event-${Date.now()}`,
      type: "boss_spawn",
      triggerTime: currentTime,
      data: {},
    };

    updateWave(selectedWaveId, {
      events: [...selectedConfig.events, newEvent],
    });

    handleSelectEvent(newEvent.id);
  }, [selectedWaveId, selectedConfig, currentTime, updateWave, handleSelectEvent]);

  // Update phase
  const handleUpdatePhase = useCallback(
    (updates: Partial<WavePhase>) => {
      if (!selectedWaveId || !selectedConfig || !selectedPhaseId) return;

      const updatedPhases = selectedConfig.phases.map((p) =>
        p.id === selectedPhaseId ? { ...p, ...updates } : p
      );

      updateWave(selectedWaveId, { phases: updatedPhases });
    },
    [selectedWaveId, selectedConfig, selectedPhaseId, updateWave]
  );

  // Update event
  const handleUpdateEvent = useCallback(
    (updates: Partial<TimedEvent>) => {
      if (!selectedWaveId || !selectedConfig || !selectedEventId) return;

      const updatedEvents = selectedConfig.events.map((e) =>
        e.id === selectedEventId ? { ...e, ...updates } : e
      );

      updateWave(selectedWaveId, { events: updatedEvents });
    },
    [selectedWaveId, selectedConfig, selectedEventId, updateWave]
  );

  // Delete phase
  const handleDeletePhase = useCallback(() => {
    if (!selectedWaveId || !selectedConfig || !selectedPhaseId) return;

    const updatedPhases = selectedConfig.phases.filter((p) => p.id !== selectedPhaseId);
    updateWave(selectedWaveId, { phases: updatedPhases });
    setSelectionType(null);
    setSelectedPhaseId(null);
  }, [selectedWaveId, selectedConfig, selectedPhaseId, updateWave]);

  // Delete event
  const handleDeleteEvent = useCallback(() => {
    if (!selectedWaveId || !selectedConfig || !selectedEventId) return;

    const updatedEvents = selectedConfig.events.filter((e) => e.id !== selectedEventId);
    updateWave(selectedWaveId, { events: updatedEvents });
    setSelectionType(null);
    setSelectedEventId(null);
  }, [selectedWaveId, selectedConfig, selectedEventId, updateWave]);

  // Update global settings
  const handleUpdateGlobalSettings = useCallback(
    (key: string, value: number) => {
      if (!selectedWaveId || !selectedConfig) return;

      updateWave(selectedWaveId, {
        globalSettings: {
          ...selectedConfig.globalSettings,
          [key]: value,
        },
      });
    },
    [selectedWaveId, selectedConfig, updateWave]
  );

  // Handle export
  const handleExport = useCallback(
    (id: string) => {
      const config = waves[id];
      if (config) {
        exportWaveConfig(config);
      }
    },
    [waves]
  );

  // Convert waves map to list for ConfigList
  const waveList = useMemo(
    () =>
      Object.values(waves).map((w) => ({
        id: w.id,
        name: w.name,
      })),
    [waves]
  );

  return (
    <div className="h-full flex">
      {/* Left sidebar - Config list */}
      <div className="w-56 p-3 border-r border-gray-700">
        <ConfigList
          title="Wave Configs"
          items={waveList}
          selectedId={selectedWaveId}
          onSelect={selectWave}
          onAdd={() => addWave()}
          onDelete={deleteWave}
          onImport={importWave}
          onExport={handleExport}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConfig ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-200">
                  Editing: {selectedConfig.name}
                </h2>
                <input
                  type="text"
                  value={selectedConfig.name}
                  onChange={(e) => updateWave(selectedWaveId!, { name: e.target.value })}
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                />
              </div>
              <button
                onClick={() => handleExport(selectedWaveId!)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Export JSON
              </button>
            </div>

            {/* Timeline section */}
            <div className="p-4 border-b border-gray-700">
              <Timeline
                phases={selectedConfig.phases}
                events={selectedConfig.events}
                totalDuration={selectedConfig.globalSettings.maxGameTime}
                currentTime={currentTime}
                selectedPhaseId={selectedPhaseId}
                selectedEventId={selectedEventId}
                onPhaseSelect={handleSelectPhase}
                onEventSelect={handleSelectEvent}
                onTimeChange={handleTimeChange}
                onPhaseChange={handlePhaseTimingChange}
                onEventChange={handleEventTimingChange}
              />

              {/* Playback controls */}
              <div className="flex items-center gap-4 mt-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-4 py-2 rounded font-medium ${
                    isPlaying
                      ? "bg-yellow-600 hover:bg-yellow-500"
                      : "bg-green-600 hover:bg-green-500"
                  }`}
                >
                  {isPlaying ? "⏸ Pause" : "▶ Play"}
                </button>

                <button
                  onClick={() => setCurrentTime(0)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  ⏮ Reset
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Speed:</span>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                  >
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={5}>5x</option>
                    <option value={10}>10x</option>
                    <option value={60}>60x</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddPhase}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                  >
                    + Phase
                  </button>
                  <button
                    onClick={handleAddEvent}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm"
                  >
                    + Event
                  </button>
                </div>
              </div>
            </div>

            {/* Editor panel */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Left: Selected item editor */}
                <div>
                  {selectionType === "phase" && selectedPhase && (
                    <PhaseEditor
                      phase={selectedPhase}
                      availableEnemyTypes={availableEnemyTypes}
                      onChange={handleUpdatePhase}
                      onDelete={handleDeletePhase}
                    />
                  )}

                  {selectionType === "event" && selectedEvent && (
                    <EventEditor
                      event={selectedEvent}
                      availableEnemyTypes={availableEnemyTypes}
                      onChange={handleUpdateEvent}
                      onDelete={handleDeleteEvent}
                    />
                  )}

                  {!selectionType && (
                    <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500">
                      <div className="text-2xl mb-2">👆</div>
                      <div>Click a phase or event in the timeline to edit</div>
                    </div>
                  )}
                </div>

                {/* Right: Global settings */}
                <div className="bg-gray-800 rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold text-cyan-400">Global Settings</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400">Base Spawn Interval (ms)</label>
                      <input
                        type="number"
                        value={selectedConfig.globalSettings.baseSpawnInterval}
                        onChange={(e) =>
                          handleUpdateGlobalSettings(
                            "baseSpawnInterval",
                            parseInt(e.target.value) || 1000
                          )
                        }
                        min={100}
                        step={100}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-400">Min Spawn Interval (ms)</label>
                      <input
                        type="number"
                        value={selectedConfig.globalSettings.minSpawnInterval}
                        onChange={(e) =>
                          handleUpdateGlobalSettings(
                            "minSpawnInterval",
                            parseInt(e.target.value) || 100
                          )
                        }
                        min={50}
                        step={50}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-400">Max Game Time (ms)</label>
                      <input
                        type="number"
                        value={selectedConfig.globalSettings.maxGameTime}
                        onChange={(e) =>
                          handleUpdateGlobalSettings(
                            "maxGameTime",
                            parseInt(e.target.value) || 1200000
                          )
                        }
                        min={60000}
                        step={60000}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.floor(selectedConfig.globalSettings.maxGameTime / 60000)} minutes
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400">Spawn Distance from Viewport</label>
                      <input
                        type="number"
                        value={selectedConfig.globalSettings.spawnDistanceFromViewport || 100}
                        onChange={(e) =>
                          handleUpdateGlobalSettings(
                            "spawnDistanceFromViewport",
                            parseInt(e.target.value) || 100
                          )
                        }
                        min={50}
                        step={10}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      />
                    </div>
                  </div>

                  {/* Wave metadata */}
                  <div className="pt-4 border-t border-gray-700">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Metadata</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400">Version</label>
                        <input
                          type="text"
                          value={selectedConfig.version}
                          onChange={(e) => updateWave(selectedWaveId!, { version: e.target.value })}
                          placeholder="1.0.0"
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Description</label>
                        <input
                          type="text"
                          value={selectedConfig.description || ""}
                          onChange={(e) =>
                            updateWave(selectedWaveId!, { description: e.target.value })
                          }
                          placeholder="Wave description..."
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary stats */}
                  <div className="pt-4 border-t border-gray-700">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Summary</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-gray-700/50 rounded p-2">
                        <div className="text-2xl font-bold text-blue-400">
                          {selectedConfig.phases.length}
                        </div>
                        <div className="text-xs text-gray-400">Phases</div>
                      </div>
                      <div className="bg-gray-700/50 rounded p-2">
                        <div className="text-2xl font-bold text-purple-400">
                          {selectedConfig.events.length}
                        </div>
                        <div className="text-xs text-gray-400">Events</div>
                      </div>
                      <div className="bg-gray-700/50 rounded p-2">
                        <div className="text-2xl font-bold text-cyan-400">
                          {Math.floor(selectedConfig.globalSettings.maxGameTime / 60000)}m
                        </div>
                        <div className="text-xs text-gray-400">Duration</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">🌊</div>
              <div className="text-lg">Select or create a wave config to begin</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
