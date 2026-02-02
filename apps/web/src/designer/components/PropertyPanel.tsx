import type { EnemyTypeConfigJSON } from "@game/enemies/types";

interface PropertyPanelProps {
  config: EnemyTypeConfigJSON;
  onChange: (updates: Partial<EnemyTypeConfigJSON>) => void;
}

interface NumberInputProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

function NumberInput({ label, value, min, max, step = 1, onChange }: NumberInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm
                   focus:outline-none focus:border-cyan-500"
      />
    </div>
  );
}

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  // Convert hex string (0xff4444) to color picker format (#ff4444)
  const colorValue = `#${value.replace("0x", "")}`;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={colorValue}
          onChange={(e) => onChange(`0x${e.target.value.replace("#", "")}`)}
          className="w-10 h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm font-mono
                     focus:outline-none focus:border-cyan-500"
        />
      </div>
    </div>
  );
}

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function TextInput({ label, value, onChange }: TextInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm
                   focus:outline-none focus:border-cyan-500"
      />
    </div>
  );
}

function PropertySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <h4 className="text-sm font-medium text-gray-300 mb-3">{title}</h4>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export function PropertyPanel({ config, onChange }: PropertyPanelProps) {
  return (
    <div className="space-y-3">
      {/* Basic Info */}
      <PropertySection title="Basic">
        <TextInput label="ID" value={config.id} onChange={(v) => onChange({ id: v })} />
        <TextInput label="Name" value={config.name} onChange={(v) => onChange({ name: v })} />
      </PropertySection>

      {/* Visual */}
      <PropertySection title="Visual">
        <ColorInput
          label="Color"
          value={config.visual.color}
          onChange={(v) => onChange({ visual: { ...config.visual, color: v } })}
        />
        <NumberInput
          label="Radius"
          value={config.visual.radius}
          min={5}
          max={100}
          onChange={(v) => onChange({ visual: { ...config.visual, radius: v } })}
        />
      </PropertySection>

      {/* Combat */}
      <PropertySection title="Combat">
        <NumberInput
          label="Damage"
          value={config.combat.damage}
          min={0}
          onChange={(v) => onChange({ combat: { ...config.combat, damage: v } })}
        />
        <NumberInput
          label="Health"
          value={config.combat.health}
          min={1}
          onChange={(v) => onChange({ combat: { ...config.combat, health: v } })}
        />
        <NumberInput
          label="XP Value"
          value={config.combat.xpValue}
          min={0}
          onChange={(v) => onChange({ combat: { ...config.combat, xpValue: v } })}
        />
      </PropertySection>

      {/* Movement */}
      <PropertySection title="Movement">
        <NumberInput
          label="Max Speed"
          value={config.movement.maxSpeed}
          min={10}
          max={500}
          step={10}
          onChange={(v) => onChange({ movement: { ...config.movement, maxSpeed: v } })}
        />
        <NumberInput
          label="Max Force"
          value={config.movement.maxForce}
          min={10}
          max={300}
          step={10}
          onChange={(v) => onChange({ movement: { ...config.movement, maxForce: v } })}
        />
        <NumberInput
          label="Mass"
          value={config.movement.mass}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(v) => onChange({ movement: { ...config.movement, mass: v } })}
        />
      </PropertySection>

      {/* Flocking */}
      <PropertySection title="Flocking">
        <NumberInput
          label="Alignment"
          value={config.flocking.alignment}
          min={0}
          max={5}
          step={0.1}
          onChange={(v) => onChange({ flocking: { ...config.flocking, alignment: v } })}
        />
        <NumberInput
          label="Cohesion"
          value={config.flocking.cohesion}
          min={0}
          max={5}
          step={0.1}
          onChange={(v) => onChange({ flocking: { ...config.flocking, cohesion: v } })}
        />
        <NumberInput
          label="Separation"
          value={config.flocking.separation}
          min={0}
          max={20}
          step={0.5}
          onChange={(v) => onChange({ flocking: { ...config.flocking, separation: v } })}
        />
      </PropertySection>

      {/* Vision */}
      <PropertySection title="Vision">
        <NumberInput
          label="Range"
          value={config.vision.range}
          min={50}
          max={1000}
          step={25}
          onChange={(v) => onChange({ vision: { ...config.vision, range: v } })}
        />
        <NumberInput
          label="Field of View"
          value={config.vision.fieldOfView}
          min={45}
          max={360}
          step={15}
          onChange={(v) => onChange({ vision: { ...config.vision, fieldOfView: v } })}
        />
      </PropertySection>

      {/* Behavior */}
      <PropertySection title="Behavior">
        <NumberInput
          label="Seek Weight"
          value={config.behavior.seekWeight}
          min={0}
          max={5}
          step={0.1}
          onChange={(v) => onChange({ behavior: { seekWeight: v } })}
        />
      </PropertySection>
    </div>
  );
}
