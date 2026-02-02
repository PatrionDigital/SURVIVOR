import { useState } from "react";
import { EnemyDesigner } from "./pages/EnemyDesigner";
import { WaveDesigner } from "./pages/WaveDesigner";

type DesignerTab = "enemy" | "wave";

export function DesignerApp() {
  const [activeTab, setActiveTab] = useState<DesignerTab>("enemy");

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header with navigation */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between px-4 py-2">
          <h1 className="text-xl font-bold text-cyan-400">Designer Tools</h1>
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("enemy")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "enemy"
                  ? "bg-cyan-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Enemy Designer
            </button>
            <button
              onClick={() => setActiveTab("wave")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "wave"
                  ? "bg-cyan-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Wave Designer
            </button>
          </nav>
          <div className="text-sm text-gray-400">Development Only</div>
        </div>
      </header>

      {/* Main content */}
      <main className="h-[calc(100vh-52px)]">
        {activeTab === "enemy" && <EnemyDesigner />}
        {activeTab === "wave" && <WaveDesigner />}
      </main>
    </div>
  );
}
