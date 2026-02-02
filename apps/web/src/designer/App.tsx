import { useState } from "react";
import { EnemyDesigner } from "./pages/EnemyDesigner";
import { WaveDesigner } from "./pages/WaveDesigner";
import { UpgradeDesigner } from "./pages/UpgradeDesigner";
import { WeaponDesigner } from "./pages/WeaponDesigner";
import { DesignerHub } from "./pages/DesignerHub";

type DesignerTab = "hub" | "enemy" | "wave" | "upgrade" | "weapon";

const TABS: { id: DesignerTab; label: string; icon: string }[] = [
  { id: "hub", label: "Hub", icon: "🏠" },
  { id: "enemy", label: "Enemies", icon: "👾" },
  { id: "wave", label: "Waves", icon: "🌊" },
  { id: "upgrade", label: "Upgrades", icon: "⬆️" },
  { id: "weapon", label: "Weapons", icon: "🔫" },
];

export function DesignerApp() {
  const [activeTab, setActiveTab] = useState<DesignerTab>("hub");

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header with navigation */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between px-4 py-2">
          <h1 className="text-xl font-bold text-cyan-400">Designer Tools</h1>
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-cyan-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
          <div className="text-sm text-gray-400">Development Only</div>
        </div>
      </header>

      {/* Main content */}
      <main className="h-[calc(100vh-52px)]">
        {activeTab === "hub" && <DesignerHub onNavigate={setActiveTab} />}
        {activeTab === "enemy" && <EnemyDesigner />}
        {activeTab === "wave" && <WaveDesigner />}
        {activeTab === "upgrade" && <UpgradeDesigner />}
        {activeTab === "weapon" && <WeaponDesigner />}
      </main>
    </div>
  );
}
