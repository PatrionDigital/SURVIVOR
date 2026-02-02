import type { TimedEvent, WaveEventType, TimedEventData } from "@game/waves/types";

interface EventEditorProps {
  event: TimedEvent;
  availableEnemyTypes: string[];
  onChange: (updates: Partial<TimedEvent>) => void;
  onDelete: () => void;
}

const EVENT_TYPES: { value: WaveEventType; label: string; icon: string }[] = [
  { value: "boss_spawn", label: "Boss Spawn", icon: "👹" },
  { value: "horde", label: "Horde", icon: "🔴" },
  { value: "special_spawn", label: "Special Spawn", icon: "⭐" },
  { value: "difficulty_spike", label: "Difficulty Spike", icon: "⚡" },
  { value: "rest_period", label: "Rest Period", icon: "💤" },
];

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

export function EventEditor({ event, availableEnemyTypes, onChange, onDelete }: EventEditorProps) {
  const updateData = (updates: Partial<TimedEventData>) => {
    onChange({ data: { ...event.data, ...updates } });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-cyan-400">Event Editor</h3>
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
            value={event.id}
            onChange={(e) => onChange({ id: e.target.value })}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Trigger Time</label>
          <input
            type="text"
            value={formatTime(event.triggerTime)}
            onChange={(e) => onChange({ triggerTime: parseTime(e.target.value) })}
            placeholder="3:00"
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm font-mono"
          />
        </div>
      </div>

      {/* Event Type */}
      <div>
        <label className="text-xs text-gray-400">Event Type</label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {EVENT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => onChange({ type: type.value })}
              className={`px-3 py-2 rounded text-sm text-left flex items-center gap-2
                         ${
                           event.type === type.value
                             ? "bg-cyan-600 text-white"
                             : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                         }`}
            >
              <span>{type.icon}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Type-specific fields */}
      {(event.type === "boss_spawn" ||
        event.type === "horde" ||
        event.type === "special_spawn") && (
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <div>
            <label className="text-xs text-gray-400">Enemy Type</label>
            <select
              value={event.data.enemyType || ""}
              onChange={(e) => updateData({ enemyType: e.target.value })}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
            >
              <option value="">Select...</option>
              {availableEnemyTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {event.type === "boss_spawn" && (
            <div>
              <label className="text-xs text-gray-400">Boss Type</label>
              <input
                type="text"
                value={event.data.bossType || ""}
                onChange={(e) => updateData({ bossType: e.target.value })}
                placeholder="mini-boss"
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
              />
            </div>
          )}

          {(event.type === "horde" || event.type === "special_spawn") && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400">Count</label>
                <input
                  type="number"
                  value={event.data.count || 1}
                  onChange={(e) => updateData({ count: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={50}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                />
              </div>
              {event.type === "horde" && (
                <div>
                  <label className="text-xs text-gray-400">Duration (ms)</label>
                  <input
                    type="number"
                    value={event.data.duration || 5000}
                    onChange={(e) => updateData({ duration: parseInt(e.target.value) || 5000 })}
                    min={1000}
                    max={30000}
                    step={1000}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {event.type === "special_spawn" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400">Position X</label>
                <input
                  type="number"
                  value={event.data.position?.x || 0}
                  onChange={(e) =>
                    updateData({
                      position: {
                        x: parseInt(e.target.value) || 0,
                        y: event.data.position?.y || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Position Y</label>
                <input
                  type="number"
                  value={event.data.position?.y || 0}
                  onChange={(e) =>
                    updateData({
                      position: {
                        x: event.data.position?.x || 0,
                        y: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Repeat settings */}
      <div className="pt-2 border-t border-gray-700">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!event.repeat}
            onChange={(e) => {
              if (e.target.checked) {
                onChange({ repeat: { interval: 60000 } });
              } else {
                onChange({ repeat: undefined });
              }
            }}
            className="rounded bg-gray-700 border-gray-600"
          />
          Repeat
        </label>

        {event.repeat && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <label className="text-xs text-gray-400">Interval (ms)</label>
              <input
                type="number"
                value={event.repeat.interval}
                onChange={(e) =>
                  onChange({
                    repeat: { ...event.repeat!, interval: parseInt(e.target.value) || 60000 },
                  })
                }
                min={5000}
                step={1000}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Max Repeats</label>
              <input
                type="number"
                value={event.repeat.maxRepeats || ""}
                onChange={(e) =>
                  onChange({
                    repeat: {
                      ...event.repeat!,
                      maxRepeats: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  })
                }
                min={1}
                placeholder="Infinite"
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
