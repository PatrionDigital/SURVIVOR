import type { WavePhase } from "@game/waves/types";

interface PhaseEditorProps {
  phase: WavePhase;
  availableEnemyTypes: string[];
  onChange: (updates: Partial<WavePhase>) => void;
  onDelete: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function parseTime(str: string): number {
  const [minutes, seconds] = str.split(":").map(Number);
  return (minutes * 60 + (seconds || 0)) * 1000;
}

export function PhaseEditor({ phase, availableEnemyTypes, onChange, onDelete }: PhaseEditorProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-cyan-400">Phase Editor</h3>
        <button
          onClick={onDelete}
          className="px-2 py-1 bg-red-600/50 hover:bg-red-600 rounded text-xs"
        >
          Delete
        </button>
      </div>

      {/* Basic info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400">ID</label>
          <input
            type="text"
            value={phase.id}
            onChange={(e) => onChange({ id: e.target.value })}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Name</label>
          <input
            type="text"
            value={phase.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
          />
        </div>
      </div>

      {/* Timing */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400">Start Time</label>
          <input
            type="text"
            value={formatTime(phase.startTime)}
            onChange={(e) => onChange({ startTime: parseTime(e.target.value) })}
            placeholder="0:00"
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">End Time</label>
          <input
            type="text"
            value={formatTime(phase.endTime)}
            onChange={(e) => onChange({ endTime: parseTime(e.target.value) })}
            placeholder="3:00"
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm font-mono"
          />
        </div>
      </div>

      {/* Enemy Types */}
      <div>
        <label className="text-xs text-gray-400">Enemy Types</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {availableEnemyTypes.map((type) => (
            <label key={type} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={phase.enemyTypes.includes(type)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange({ enemyTypes: [...phase.enemyTypes, type] });
                  } else {
                    onChange({ enemyTypes: phase.enemyTypes.filter((t) => t !== type) });
                  }
                }}
                className="rounded bg-gray-700 border-gray-600"
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      {/* Spawning */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400">Spawn Rate Multiplier</label>
          <input
            type="number"
            value={phase.spawnRateMultiplier}
            onChange={(e) => onChange({ spawnRateMultiplier: parseFloat(e.target.value) || 1 })}
            min={0.1}
            max={5}
            step={0.1}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Max Enemies</label>
          <input
            type="number"
            value={phase.maxEnemies}
            onChange={(e) => onChange({ maxEnemies: parseInt(e.target.value) || 10 })}
            min={1}
            max={100}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
          />
        </div>
      </div>

      {/* Difficulty Multipliers */}
      <div>
        <label className="text-xs text-gray-400 block mb-2">Difficulty Multipliers</label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500">Health</label>
            <input
              type="number"
              value={phase.healthMultiplier ?? 1}
              onChange={(e) => onChange({ healthMultiplier: parseFloat(e.target.value) || 1 })}
              min={0.5}
              max={5}
              step={0.1}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Damage</label>
            <input
              type="number"
              value={phase.damageMultiplier ?? 1}
              onChange={(e) => onChange({ damageMultiplier: parseFloat(e.target.value) || 1 })}
              min={0.5}
              max={5}
              step={0.1}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Speed</label>
            <input
              type="number"
              value={phase.speedMultiplier ?? 1}
              onChange={(e) => onChange({ speedMultiplier: parseFloat(e.target.value) || 1 })}
              min={0.5}
              max={3}
              step={0.1}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
