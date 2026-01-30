import { Link } from "react-router-dom";

const GEAR_TYPES = [
  { name: "Weapon", token: "$WEAPON", stat: "Damage", color: "text-game-damage" },
  { name: "Armor", token: "$ARMOR", stat: "Defense", color: "text-game-defense" },
  { name: "Power", token: "$POWER", stat: "AoE", color: "text-rarity-epic" },
  { name: "Gloves", token: "$GLOVES", stat: "Attack Speed", color: "text-rarity-rare" },
  { name: "Amulet", token: "$AMULET", stat: "XP Gain", color: "text-game-xp" },
  { name: "Boots", token: "$BOOTS", stat: "Move Speed", color: "text-rarity-uncommon" },
];

export function StakingPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary-400">Gear Staking</h1>
        <Link to="/" className="text-gray-400 hover:text-white transition-colors">
          Back
        </Link>
      </div>

      <p className="text-gray-400 mb-6">
        Stake gear tokens to boost your in-game stats. Higher stakes = bigger bonuses!
      </p>

      {/* Gear slots grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {GEAR_TYPES.map((gear) => (
          <div key={gear.name} className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{gear.name}</h3>
              <span className="text-sm text-gray-400">{gear.token}</span>
            </div>

            <div className="mb-4">
              <p className="text-gray-400 text-sm">Staked Amount</p>
              <p className="text-xl font-bold text-white">0</p>
            </div>

            <div className="mb-4">
              <p className="text-gray-400 text-sm">Bonus</p>
              <p className={`text-lg font-bold ${gear.color}`}>+0% {gear.stat}</p>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 bg-primary-600 hover:bg-primary-500 text-white py-2 px-3 rounded text-sm transition-colors">
                Stake
              </button>
              <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded text-sm transition-colors">
                Unstake
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Maintenance info */}
      <div className="mt-8 bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-bold text-white mb-2">Maintenance Pool</h2>
        <p className="text-gray-400 text-sm mb-4">
          Stakes decay 5% weekly if not maintained. Pay maintenance to keep your bonuses active.
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Next Maintenance Due</p>
            <p className="text-white">Connect wallet to view</p>
          </div>
          <button
            className="bg-game-xp hover:opacity-90 text-black font-bold py-2 px-4 rounded transition-opacity"
            disabled
          >
            Pay Maintenance
          </button>
        </div>
      </div>
    </div>
  );
}
