import { useState, useCallback, useMemo } from "react";
import { useDesignerStore, exportUpgradePool } from "../stores/designerStore";
import type { Upgrade, UpgradeType } from "@game/leveling/UpgradeChoices";

const UPGRADE_TYPES: { value: UpgradeType; label: string; icon: string; unit: string }[] = [
  { value: "damage", label: "Damage", icon: "⚔️", unit: "" },
  { value: "attackSpeed", label: "Attack Speed", icon: "⚡", unit: "%" },
  { value: "moveSpeed", label: "Move Speed", icon: "👟", unit: " px/s" },
  { value: "maxHealth", label: "Max Health", icon: "❤️", unit: " HP" },
  { value: "healthRegen", label: "Health Regen", icon: "💚", unit: " HP/s" },
  { value: "pickupRange", label: "Pickup Range", icon: "🧲", unit: " px" },
  { value: "xpBonus", label: "XP Bonus", icon: "✨", unit: "%" },
];

function getTypeInfo(type: UpgradeType) {
  return UPGRADE_TYPES.find((t) => t.value === type) || UPGRADE_TYPES[0];
}

function formatValue(type: UpgradeType, value: number): string {
  const info = getTypeInfo(type);
  if (type === "attackSpeed" || type === "xpBonus") {
    return `+${Math.round(value * 100)}${info.unit}`;
  }
  return `+${value}${info.unit}`;
}

interface UpgradeEditorProps {
  upgrade: Upgrade;
  onChange: (updates: Partial<Upgrade>) => void;
  onDelete: () => void;
}

function UpgradeEditor({ upgrade, onChange, onDelete }: UpgradeEditorProps) {
  const typeInfo = getTypeInfo(upgrade.type);

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-cyan-400">Edit Upgrade</h3>
        <button
          onClick={onDelete}
          className="px-2 py-1 bg-red-600/50 hover:bg-red-600 rounded text-xs"
        >
          Delete
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400">ID</label>
          <input
            type="text"
            value={upgrade.id}
            onChange={(e) => onChange({ id: e.target.value })}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Name</label>
          <input
            type="text"
            value={upgrade.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400">Description</label>
        <input
          type="text"
          value={upgrade.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
        />
      </div>

      <div>
        <label className="text-xs text-gray-400">Type</label>
        <div className="grid grid-cols-4 gap-2 mt-1">
          {UPGRADE_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => onChange({ type: type.value })}
              className={`px-2 py-2 rounded text-xs text-left flex items-center gap-1
                         ${
                           upgrade.type === type.value
                             ? "bg-cyan-600 text-white"
                             : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                         }`}
            >
              <span>{type.icon}</span>
              <span className="truncate">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400">Value ({typeInfo.label})</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={
              upgrade.type === "attackSpeed" || upgrade.type === "xpBonus"
                ? upgrade.value * 100
                : upgrade.value
            }
            onChange={(e) => {
              const rawValue = parseFloat(e.target.value) || 0;
              const value =
                upgrade.type === "attackSpeed" || upgrade.type === "xpBonus"
                  ? rawValue / 100
                  : rawValue;
              onChange({ value });
            }}
            step={upgrade.type === "attackSpeed" || upgrade.type === "xpBonus" ? 5 : 1}
            className="w-32 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
          />
          <span className="text-gray-400 text-sm">
            = {formatValue(upgrade.type, upgrade.value)}
          </span>
        </div>
      </div>

      {/* Preview card */}
      <div className="pt-4 border-t border-gray-700">
        <label className="text-xs text-gray-400 mb-2 block">Preview</label>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{typeInfo.icon}</span>
            <div>
              <div className="font-bold text-white">{upgrade.name}</div>
              <div className="text-sm text-gray-400">{upgrade.description}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UpgradeDesigner() {
  const { upgrades, setUpgrades } = useDesignerStore();
  const [selectedUpgradeId, setSelectedUpgradeId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<UpgradeType | "all">("all");

  // Get selected upgrade
  const selectedUpgrade = useMemo(
    () => upgrades.find((u) => u.id === selectedUpgradeId) || null,
    [upgrades, selectedUpgradeId]
  );

  // Filter upgrades
  const filteredUpgrades = useMemo(
    () => (filterType === "all" ? upgrades : upgrades.filter((u) => u.type === filterType)),
    [upgrades, filterType]
  );

  // Group upgrades by type for visualization
  const upgradesByType = useMemo(() => {
    const grouped = new Map<UpgradeType, Upgrade[]>();
    for (const upgrade of upgrades) {
      const list = grouped.get(upgrade.type) || [];
      list.push(upgrade);
      grouped.set(upgrade.type, list);
    }
    return grouped;
  }, [upgrades]);

  // Add new upgrade
  const handleAddUpgrade = useCallback(() => {
    const newUpgrade: Upgrade = {
      id: `upgrade-${Date.now()}`,
      name: "New Upgrade",
      description: "+X Stat",
      type: filterType === "all" ? "damage" : filterType,
      value: 10,
    };
    setUpgrades([...upgrades, newUpgrade]);
    setSelectedUpgradeId(newUpgrade.id);
  }, [upgrades, filterType, setUpgrades]);

  // Update upgrade
  const handleUpdateUpgrade = useCallback(
    (updates: Partial<Upgrade>) => {
      if (!selectedUpgradeId) return;
      setUpgrades(upgrades.map((u) => (u.id === selectedUpgradeId ? { ...u, ...updates } : u)));
    },
    [upgrades, selectedUpgradeId, setUpgrades]
  );

  // Delete upgrade
  const handleDeleteUpgrade = useCallback(() => {
    if (!selectedUpgradeId) return;
    setUpgrades(upgrades.filter((u) => u.id !== selectedUpgradeId));
    setSelectedUpgradeId(null);
  }, [upgrades, selectedUpgradeId, setUpgrades]);

  // Import upgrades
  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (Array.isArray(data)) {
            setUpgrades(data);
          }
        } catch (err) {
          console.error("Failed to import upgrades:", err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setUpgrades]);

  // Export upgrades
  const handleExport = useCallback(() => {
    exportUpgradePool(upgrades);
  }, [upgrades]);

  return (
    <div className="h-full flex">
      {/* Left sidebar - Upgrade list */}
      <div className="w-72 p-3 border-r border-gray-700 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-200">Upgrade Pool</h2>
          <div className="flex gap-1">
            <button
              onClick={handleImport}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              title="Import JSON"
            >
              📥
            </button>
            <button
              onClick={handleExport}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              title="Export JSON"
            >
              📤
            </button>
          </div>
        </div>

        {/* Type filter */}
        <div className="mb-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as UpgradeType | "all")}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
          >
            <option value="all">All Types</option>
            {UPGRADE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Upgrade list */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {filteredUpgrades.map((upgrade) => {
            const typeInfo = getTypeInfo(upgrade.type);
            return (
              <button
                key={upgrade.id}
                onClick={() => setSelectedUpgradeId(upgrade.id)}
                className={`w-full px-3 py-2 rounded text-left flex items-center gap-2
                           ${
                             selectedUpgradeId === upgrade.id
                               ? "bg-cyan-600 text-white"
                               : "bg-gray-800 hover:bg-gray-700"
                           }`}
              >
                <span>{typeInfo.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{upgrade.name}</div>
                  <div className="text-xs text-gray-400 truncate">
                    {formatValue(upgrade.type, upgrade.value)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleAddUpgrade}
          className="mt-3 w-full py-2 bg-green-600 hover:bg-green-500 rounded text-sm"
        >
          + Add Upgrade
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Stats visualization */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Upgrade Distribution</h3>
          <div className="grid grid-cols-7 gap-2">
            {UPGRADE_TYPES.map((type) => {
              const count = upgradesByType.get(type.value)?.length || 0;
              return (
                <div key={type.value} className="bg-gray-800 rounded p-2 text-center">
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-lg font-bold text-cyan-400">{count}</div>
                  <div className="text-xs text-gray-400">{type.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedUpgrade ? (
            <div className="max-w-xl">
              <UpgradeEditor
                upgrade={selectedUpgrade}
                onChange={handleUpdateUpgrade}
                onDelete={handleDeleteUpgrade}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-4">⬆️</div>
                <div className="text-lg">Select or create an upgrade to edit</div>
              </div>
            </div>
          )}
        </div>

        {/* Balance preview */}
        <div className="p-4 border-t border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Balance Preview</h3>
          <div className="text-xs text-gray-400">
            <div className="grid grid-cols-7 gap-2">
              {UPGRADE_TYPES.map((type) => {
                const typeUpgrades = upgradesByType.get(type.value) || [];
                const totalValue = typeUpgrades.reduce((sum, u) => sum + u.value, 0);
                const avgValue = typeUpgrades.length > 0 ? totalValue / typeUpgrades.length : 0;
                return (
                  <div key={type.value} className="text-center">
                    <div className="text-cyan-400">
                      Avg:{" "}
                      {type.value === "attackSpeed" || type.value === "xpBonus"
                        ? `${Math.round(avgValue * 100)}%`
                        : avgValue.toFixed(1)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
