import { Link } from "react-router-dom";

export function ProfilePage() {
  // Placeholder stats
  const stats = {
    totalGamesPlayed: 42,
    highestWave: 45,
    highestScore: 125000,
    totalVscEarned: "1,250,000",
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary-400">Profile</h1>
        <Link to="/" className="text-gray-400 hover:text-white transition-colors">
          Back
        </Link>
      </div>

      {/* Wallet connection status */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Wallet</p>
            <p className="text-white font-mono">Not connected</p>
          </div>
          <button className="bg-primary-600 hover:bg-primary-500 text-white py-2 px-4 rounded transition-colors">
            Connect Wallet
          </button>
        </div>
      </div>

      {/* Player stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Games Played</p>
          <p className="text-2xl font-bold text-white">{stats.totalGamesPlayed}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Highest Wave</p>
          <p className="text-2xl font-bold text-white">{stats.highestWave}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Highest Score</p>
          <p className="text-2xl font-bold text-primary-400">
            {stats.highestScore.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total $VSC Earned</p>
          <p className="text-2xl font-bold text-game-xp">{stats.totalVscEarned}</p>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-bold text-white mb-4">Recent Sessions</h2>
        <p className="text-gray-400 text-center py-8">Connect wallet to view session history</p>
      </div>
    </div>
  );
}
