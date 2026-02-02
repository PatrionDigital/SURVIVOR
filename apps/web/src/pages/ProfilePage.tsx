import { Link } from "react-router-dom";
import { useWallet } from "@/hooks";

// TODO: Remove clearAllWalletState and Reset Wallet button when moving to beta (Sepolia testing)
// Dev helper to clear all wallet state - only used for local Anvil development
function clearAllWalletState() {
  // Clear wagmi state
  Object.keys(localStorage)
    .filter((k) => k.startsWith("wagmi"))
    .forEach((k) => localStorage.removeItem(k));
  // Clear SIWF state
  localStorage.removeItem("farcaster_survivors_siwf_session");
  // Clear react-query cache
  Object.keys(localStorage)
    .filter((k) => k.includes("react-query") || k.includes("tanstack"))
    .forEach((k) => localStorage.removeItem(k));
  // Clear IndexedDB (wagmi uses this too)
  if (window.indexedDB) {
    indexedDB.databases().then((dbs) => {
      dbs.forEach((db) => {
        if (db.name) indexedDB.deleteDatabase(db.name);
      });
    });
  }
  // Reload to apply changes
  window.location.reload();
}

export function ProfilePage() {
  const { isConnected, shortAddress, username, fid, disconnect, isLocalDev } = useWallet();

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
            <p className="text-gray-400 text-sm">Account</p>
            {isConnected ? (
              <div>
                {username && <p className="text-white font-semibold">@{username}</p>}
                {fid && <p className="text-gray-400 text-sm">FID: {fid}</p>}
                {shortAddress && <p className="text-white font-mono text-sm">{shortAddress}</p>}
              </div>
            ) : (
              <p className="text-gray-500">Use the Sign In button in the header</p>
            )}
          </div>
          {isConnected && (
            <div className="flex items-center gap-3">
              <div className="bg-green-600/20 border border-green-500/50 text-green-400 text-sm py-2 px-4 rounded">
                Connected
              </div>
              {isLocalDev && (
                <button
                  onClick={() => {
                    disconnect();
                    clearAllWalletState();
                  }}
                  className="bg-red-600/20 border border-red-500/50 text-red-400 text-sm py-2 px-4 rounded hover:bg-red-600/30 transition-colors"
                >
                  Reset Wallet
                </button>
              )}
            </div>
          )}
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
        {isConnected ? (
          <p className="text-gray-400 text-center py-8">No sessions yet</p>
        ) : (
          <p className="text-gray-400 text-center py-8">Sign in to view session history</p>
        )}
      </div>
    </div>
  );
}
