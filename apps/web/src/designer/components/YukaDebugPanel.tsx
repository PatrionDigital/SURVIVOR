import type { YukaParams } from "./PreviewCanvas";

interface YukaDebugPanelProps {
  /** Current Yuka parameters */
  params: YukaParams;
  /** Callback when parameters change */
  onChange: (params: YukaParams) => void;
  /** Callback to apply current params to config */
  onApplyToConfig: () => void;
  /** Callback to reset to config values */
  onResetToConfig: () => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-cyan-400 font-mono">{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:bg-cyan-500
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}

export function YukaDebugPanel({
  params,
  onChange,
  onApplyToConfig,
  onResetToConfig,
}: YukaDebugPanelProps) {
  const updateParam = (key: keyof YukaParams, value: number) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-cyan-400">Yuka Debug</h3>
        <div className="text-xs text-gray-500">Live tuning</div>
      </div>

      <div className="space-y-3">
        <div className="text-xs text-gray-500 uppercase tracking-wide">Flocking</div>
        <Slider
          label="Alignment"
          value={params.alignment}
          min={0}
          max={5}
          step={0.1}
          onChange={(v) => updateParam("alignment", v)}
        />
        <Slider
          label="Cohesion"
          value={params.cohesion}
          min={0}
          max={5}
          step={0.1}
          onChange={(v) => updateParam("cohesion", v)}
        />
        <Slider
          label="Separation"
          value={params.separation}
          min={0}
          max={20}
          step={0.5}
          onChange={(v) => updateParam("separation", v)}
        />
      </div>

      <div className="space-y-3">
        <div className="text-xs text-gray-500 uppercase tracking-wide">Behavior</div>
        <Slider
          label="Seek Weight"
          value={params.seekWeight}
          min={0}
          max={5}
          step={0.1}
          onChange={(v) => updateParam("seekWeight", v)}
        />
      </div>

      <div className="space-y-3">
        <div className="text-xs text-gray-500 uppercase tracking-wide">Movement</div>
        <Slider
          label="Max Force"
          value={params.maxForce}
          min={10}
          max={300}
          step={10}
          onChange={(v) => updateParam("maxForce", v)}
        />
        <Slider
          label="Max Speed"
          value={params.maxSpeed}
          min={10}
          max={500}
          step={10}
          onChange={(v) => updateParam("maxSpeed", v)}
        />
      </div>

      <div className="space-y-3">
        <div className="text-xs text-gray-500 uppercase tracking-wide">Detection</div>
        <Slider
          label="Bounding Radius"
          value={params.boundingRadius}
          min={5}
          max={100}
          step={5}
          onChange={(v) => updateParam("boundingRadius", v)}
        />
        <Slider
          label="Neighborhood"
          value={params.neighborhoodRadius}
          min={50}
          max={500}
          step={25}
          onChange={(v) => updateParam("neighborhoodRadius", v)}
        />
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-700">
        <button
          onClick={onApplyToConfig}
          className="flex-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-sm font-medium transition-colors"
        >
          Apply to Config
        </button>
        <button
          onClick={onResetToConfig}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
