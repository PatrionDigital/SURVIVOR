import { useCallback } from "react";
import { useDesignerStore } from "../stores/designerStore";

interface DesignerHubProps {
  onNavigate: (tab: "enemy" | "wave" | "upgrade" | "weapon") => void;
}

const TOOLS = [
  {
    id: "enemy" as const,
    title: "Enemy Designer",
    description: "Create and edit enemy types with live AI behavior preview",
    icon: "👾",
    color: "from-red-500 to-orange-500",
  },
  {
    id: "wave" as const,
    title: "Wave Designer",
    description: "Design wave configurations with visual timeline editor",
    icon: "🌊",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "upgrade" as const,
    title: "Upgrade Designer",
    description: "Balance and configure the upgrade pool for level-ups",
    icon: "⬆️",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "weapon" as const,
    title: "Weapon Designer",
    description: "Configure weapon parameters with live projectile preview",
    icon: "🔫",
    color: "from-purple-500 to-pink-500",
  },
];

export function DesignerHub({ onNavigate }: DesignerHubProps) {
  const { enemies, waves, upgrades, weapons, resetToDefaults, loadFromGame } = useDesignerStore();

  // Export all configs
  const handleExportAll = useCallback(() => {
    const data = {
      enemies: Object.values(enemies),
      waves: Object.values(waves),
      upgrades,
      weapons: Object.values(weapons),
      exportedAt: new Date().toISOString(),
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `game-configs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [enemies, waves, upgrades, weapons]);

  // Import all configs
  const handleImportAll = useCallback(() => {
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

          // Import enemies
          if (data.enemies && Array.isArray(data.enemies)) {
            for (const enemy of data.enemies) {
              useDesignerStore.getState().importEnemy(enemy);
            }
          }

          // Import waves
          if (data.waves && Array.isArray(data.waves)) {
            for (const wave of data.waves) {
              useDesignerStore.getState().importWave(wave);
            }
          }

          // Import upgrades
          if (data.upgrades && Array.isArray(data.upgrades)) {
            useDesignerStore.getState().setUpgrades(data.upgrades);
          }

          // Import weapons
          if (data.weapons && Array.isArray(data.weapons)) {
            for (const weapon of data.weapons) {
              useDesignerStore.getState().importWeapon(weapon);
            }
          }

          alert("Import successful!");
        } catch (err) {
          console.error("Failed to import configs:", err);
          alert("Failed to import configs. Check console for details.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  // Load from game
  const handleLoadFromGame = useCallback(async () => {
    await loadFromGame();
    alert("Loaded configurations from game files!");
  }, [loadFromGame]);

  // Reset all
  const handleResetAll = useCallback(() => {
    if (confirm("Are you sure you want to reset all configurations to defaults?")) {
      resetToDefaults();
    }
  }, [resetToDefaults]);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Welcome header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Designer Tools Hub</h1>
          <p className="text-gray-400">Create, edit, and balance game content with live previews</p>
        </div>

        {/* Tool cards */}
        <div className="grid grid-cols-2 gap-4">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onNavigate(tool.id)}
              className="group bg-gray-800 rounded-xl p-6 text-left hover:bg-gray-750 transition-all hover:scale-[1.02] border border-gray-700 hover:border-gray-600"
            >
              <div className={`inline-block p-3 rounded-lg bg-gradient-to-br ${tool.color} mb-4`}>
                <span className="text-3xl">{tool.icon}</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-cyan-400 transition-colors">
                {tool.title}
              </h3>
              <p className="text-gray-400 text-sm">{tool.description}</p>
            </button>
          ))}
        </div>

        {/* Stats overview */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Current Configurations</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400">{Object.keys(enemies).length}</div>
              <div className="text-sm text-gray-400">Enemies</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400">{Object.keys(waves).length}</div>
              <div className="text-sm text-gray-400">Waves</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400">{upgrades.length}</div>
              <div className="text-sm text-gray-400">Upgrades</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400">{Object.keys(weapons).length}</div>
              <div className="text-sm text-gray-400">Weapons</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleLoadFromGame}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm flex items-center gap-2"
            >
              <span>📂</span>
              Load from Game Files
            </button>
            <button
              onClick={handleExportAll}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm flex items-center gap-2"
            >
              <span>📤</span>
              Export All Configs
            </button>
            <button
              onClick={handleImportAll}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm flex items-center gap-2"
            >
              <span>📥</span>
              Import Configs
            </button>
            <button
              onClick={handleResetAll}
              className="px-4 py-2 bg-red-600/50 hover:bg-red-600 rounded-lg text-sm flex items-center gap-2"
            >
              <span>🗑️</span>
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Help section */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Getting Started</h2>
          <div className="space-y-3 text-sm text-gray-400">
            <p>
              <strong className="text-gray-300">1. Load existing configs</strong> - Click "Load from
              Game Files" to import the current game configurations as a starting point.
            </p>
            <p>
              <strong className="text-gray-300">2. Edit and preview</strong> - Use the individual
              designers to modify enemies, waves, upgrades, and weapons with live previews.
            </p>
            <p>
              <strong className="text-gray-300">3. Export your changes</strong> - Export individual
              configs or all configs at once to JSON files.
            </p>
            <p>
              <strong className="text-gray-300">4. Apply to game</strong> - Copy exported JSON files
              to the <code className="bg-gray-700 px-1 rounded">public/data/</code> directory.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          Configurations are automatically saved to localStorage
        </div>
      </div>
    </div>
  );
}
