import { useRef, useCallback, useMemo } from "react";
import type { WavePhase, TimedEvent } from "@game/waves/types";

interface TimelineProps {
  /** Total duration in milliseconds */
  totalDuration: number;
  /** Current playhead position in ms */
  currentTime: number;
  /** Phases to display */
  phases: WavePhase[];
  /** Events to display */
  events: TimedEvent[];
  /** Selected phase ID */
  selectedPhaseId: string | null;
  /** Selected event ID */
  selectedEventId: string | null;
  /** Callback when playhead position changes */
  onTimeChange: (time: number) => void;
  /** Callback when phase is selected */
  onPhaseSelect: (id: string) => void;
  /** Callback when event is selected */
  onEventSelect: (id: string) => void;
  /** Callback when phase timing changes */
  onPhaseChange: (id: string, startTime: number, endTime: number) => void;
  /** Callback when event timing changes */
  onEventChange: (id: string, triggerTime: number) => void;
}

const TIMELINE_HEIGHT = 120;
const PHASE_HEIGHT = 40;
const EVENT_ROW_TOP = 70;
const PADDING = 20;

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Phase color palette
const PHASE_COLORS = [
  { bg: "bg-blue-600/50", border: "border-blue-400" },
  { bg: "bg-purple-600/50", border: "border-purple-400" },
  { bg: "bg-green-600/50", border: "border-green-400" },
  { bg: "bg-orange-600/50", border: "border-orange-400" },
  { bg: "bg-pink-600/50", border: "border-pink-400" },
];

// Event icons
const EVENT_ICONS: Record<string, string> = {
  boss_spawn: "👹",
  horde: "🔴",
  phase_change: "🔄",
  special_spawn: "⭐",
  difficulty_spike: "⚡",
  rest_period: "💤",
};

export function Timeline({
  totalDuration,
  currentTime,
  phases,
  events,
  selectedPhaseId,
  selectedEventId,
  onTimeChange,
  onPhaseSelect,
  onEventSelect,
  onPhaseChange,
  onEventChange,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<"playhead" | "phase-start" | "phase-end" | "event" | null>(null);
  const dragTargetIdRef = useRef<string | null>(null);

  // Calculate positions
  const timeToX = useCallback(
    (time: number, width: number) => {
      return PADDING + ((width - PADDING * 2) * time) / totalDuration;
    },
    [totalDuration]
  );

  const xToTime = useCallback(
    (x: number, width: number) => {
      const clampedX = Math.max(PADDING, Math.min(x, width - PADDING));
      return ((clampedX - PADDING) / (width - PADDING * 2)) * totalDuration;
    },
    [totalDuration]
  );

  // Time markers
  const timeMarkers = useMemo(() => {
    const markers: number[] = [];
    const interval = totalDuration <= 5 * 60 * 1000 ? 60 * 1000 : 5 * 60 * 1000; // 1min or 5min intervals
    for (let t = 0; t <= totalDuration; t += interval) {
      markers.push(t);
    }
    return markers;
  }, [totalDuration]);

  // Handle mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const width = rect.width;

      // Check if clicking on playhead
      const playheadX = timeToX(currentTime, width);
      if (Math.abs(x - playheadX) < 10 && y < 25) {
        isDraggingRef.current = "playhead";
        return;
      }

      // Check if clicking on event
      for (const event of events) {
        const eventX = timeToX(event.triggerTime, width);
        if (Math.abs(x - eventX) < 15 && y >= EVENT_ROW_TOP - 10 && y <= EVENT_ROW_TOP + 30) {
          isDraggingRef.current = "event";
          dragTargetIdRef.current = event.id;
          onEventSelect(event.id);
          return;
        }
      }

      // Check if clicking on phase
      for (const phase of phases) {
        const startX = timeToX(phase.startTime, width);
        const endX = timeToX(phase.endTime, width);

        if (y >= 30 && y <= 30 + PHASE_HEIGHT) {
          // Check phase edges for resize
          if (Math.abs(x - startX) < 8) {
            isDraggingRef.current = "phase-start";
            dragTargetIdRef.current = phase.id;
            onPhaseSelect(phase.id);
            return;
          }
          if (Math.abs(x - endX) < 8) {
            isDraggingRef.current = "phase-end";
            dragTargetIdRef.current = phase.id;
            onPhaseSelect(phase.id);
            return;
          }
          // Check phase body for selection
          if (x >= startX && x <= endX) {
            onPhaseSelect(phase.id);
            return;
          }
        }
      }

      // Click on empty timeline - move playhead
      const newTime = xToTime(x, width);
      onTimeChange(Math.max(0, Math.min(totalDuration, newTime)));
    },
    [
      currentTime,
      events,
      phases,
      timeToX,
      xToTime,
      totalDuration,
      onTimeChange,
      onPhaseSelect,
      onEventSelect,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const width = rect.width;
      const newTime = Math.max(0, Math.min(totalDuration, xToTime(x, width)));

      if (isDraggingRef.current === "playhead") {
        onTimeChange(newTime);
      } else if (isDraggingRef.current === "event" && dragTargetIdRef.current) {
        onEventChange(dragTargetIdRef.current, newTime);
      } else if (isDraggingRef.current === "phase-start" && dragTargetIdRef.current) {
        const phase = phases.find((p) => p.id === dragTargetIdRef.current);
        if (phase && newTime < phase.endTime - 1000) {
          onPhaseChange(dragTargetIdRef.current, newTime, phase.endTime);
        }
      } else if (isDraggingRef.current === "phase-end" && dragTargetIdRef.current) {
        const phase = phases.find((p) => p.id === dragTargetIdRef.current);
        if (phase && newTime > phase.startTime + 1000) {
          onPhaseChange(dragTargetIdRef.current, phase.startTime, newTime);
        }
      }
    },
    [totalDuration, xToTime, phases, onTimeChange, onEventChange, onPhaseChange]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = null;
    dragTargetIdRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative bg-gray-800 rounded-lg overflow-hidden select-none"
      style={{ height: TIMELINE_HEIGHT }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Time markers */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      >
        {containerRef.current &&
          timeMarkers.map((t) => {
            const x = timeToX(t, containerRef.current!.offsetWidth);
            return (
              <g key={t}>
                <line x1={x} y1={20} x2={x} y2={TIMELINE_HEIGHT} stroke="#4b5563" strokeWidth={1} />
                <text x={x} y={15} fill="#9ca3af" fontSize={10} textAnchor="middle">
                  {formatTime(t)}
                </text>
              </g>
            );
          })}
      </svg>

      {/* Phases */}
      {containerRef.current &&
        phases.map((phase, index) => {
          const width = containerRef.current!.offsetWidth;
          const startX = timeToX(phase.startTime, width);
          const endX = timeToX(phase.endTime, width);
          const phaseWidth = endX - startX;
          const colors = PHASE_COLORS[index % PHASE_COLORS.length];
          const isSelected = phase.id === selectedPhaseId;

          return (
            <div
              key={phase.id}
              className={`absolute cursor-pointer ${colors.bg} border-2 ${colors.border} rounded
                         ${isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-gray-800" : ""}`}
              style={{
                left: startX,
                top: 30,
                width: phaseWidth,
                height: PHASE_HEIGHT,
              }}
            >
              <div className="px-2 py-1 text-xs font-medium truncate">{phase.name}</div>
              {/* Resize handles */}
              <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20" />
              <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20" />
            </div>
          );
        })}

      {/* Events */}
      {containerRef.current &&
        events.map((event) => {
          const width = containerRef.current!.offsetWidth;
          const x = timeToX(event.triggerTime, width);
          const isSelected = event.id === selectedEventId;
          const icon = EVENT_ICONS[event.type] || "❓";

          return (
            <div
              key={event.id}
              className={`absolute cursor-pointer transform -translate-x-1/2
                         ${isSelected ? "scale-125" : "hover:scale-110"} transition-transform`}
              style={{ left: x, top: EVENT_ROW_TOP }}
              title={`${event.type}: ${event.id} @ ${formatTime(event.triggerTime)}`}
            >
              <div className={`text-xl ${isSelected ? "ring-2 ring-cyan-400 rounded-full" : ""}`}>
                {icon}
              </div>
            </div>
          );
        })}

      {/* Playhead */}
      {containerRef.current && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 cursor-ew-resize"
          style={{ left: timeToX(currentTime, containerRef.current.offsetWidth) }}
        >
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-cyan-400 rotate-45" />
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xs text-cyan-400 whitespace-nowrap">
            {formatTime(currentTime)}
          </div>
        </div>
      )}
    </div>
  );
}
