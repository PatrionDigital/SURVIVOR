import { Link } from "react-router-dom";
import { useWallet, usePlayerProfile } from "@/hooks";
import type { GameSession } from "@/hooks";

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

// Helper to format session duration
function formatDuration(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const durationMs = end.getTime() - start.getTime();
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// Helper to format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Session card component
function SessionCard({ session }: { session: GameSession }) {
  const statusColor = {
    completed: "text-green-400",
    active: "text-blue-400",
    abandoned: "text-gray-400",
  }[session.status];

  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className={`text-xs font-medium uppercase ${statusColor}`}>{session.status}</span>
          <p className="text-xs text-gray-500 mt-1">{formatDate(session.started_at)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">
            Duration: {formatDuration(session.started_at, session.ended_at)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div>
          <p className="text-xs text-gray-400">Score</p>
          <p className="text-lg font-bold text-primary-400">
            {session.final_score?.toLocaleString() || "N/A"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Level</p>
          <p className="text-lg font-bold text-white">{session.final_wave || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Kills</p>
          <p className="text-lg font-bold text-red-400">{session.total_kills || "N/A"}</p>
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { isConnected, shortAddress, username, fid, disconnect, isLocalDev } = useWallet();
  const { profile, sessions, isLoading, error, refetch } = usePlayerProfile();

  // Get stats from profile or use defaults
  const stats = profile?.stats || {
    totalGamesPlayed: 0,
    highestWave: 0,
    highestScore: 0,
    totalVscEarned: "0",
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
      {isLoading ? (
        <div className="bg-gray-800 rounded-lg p-6 mb-6 text-center">
          <p className="text-gray-400">Loading stats...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 mb-6">
          <p className="text-red-400 text-center">{error.message}</p>
          <button
            onClick={refetch}
            className="mt-4 mx-auto block px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Games Played</p>
            <p className="text-2xl font-bold text-white">{stats.totalGamesPlayed}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Highest Level</p>
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
      )}

      {/* Recent sessions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-bold text-white mb-4">Recent Sessions</h2>
        {!isConnected ? (
          <p className="text-gray-400 text-center py-8">Sign in to view session history</p>
        ) : isLoading ? (
          <p className="text-gray-400 text-center py-8">Loading sessions...</p>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error.message}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
            >
              Retry
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No sessions yet. Play a game to see your history!
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto pr-2">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
