import { Link } from "react-router-dom";
import { useState } from "react";
import { useLeaderboard, useWallet } from "@/hooks";
import type { LeaderboardPeriod } from "@/hooks";

export function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("daily");
  const { address } = useWallet();
  const { entries, isLoading, error, refetch } = useLeaderboard(period);

  // Format address to display username or shortened address
  const formatPlayerName = (entry: (typeof entries)[0]) => {
    if (entry.players.farcaster_username) {
      return `@${entry.players.farcaster_username}`;
    }
    const addr = entry.players.wallet_address;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Check if entry is current player
  const isCurrentPlayer = (entry: (typeof entries)[0]) => {
    return address && entry.players.wallet_address.toLowerCase() === address.toLowerCase();
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary-400">Leaderboard</h1>
        <Link to="/" className="text-gray-400 hover:text-white transition-colors">
          Back
        </Link>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        {(["daily", "weekly", "allTime"] as LeaderboardPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`py-2 px-4 rounded transition-colors ${
              period === p
                ? "bg-primary-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {p === "allTime" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">Loading leaderboard...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 mb-6">
          <p className="text-red-400 text-center">{error.message}</p>
          <button
            onClick={refetch}
            className="mt-4 mx-auto block px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && entries.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">No leaderboard entries yet. Be the first to play!</p>
        </div>
      )}

      {/* Leaderboard table */}
      {!isLoading && !error && entries.length > 0 && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="py-3 px-4 text-left text-gray-300">Rank</th>
                <th className="py-3 px-4 text-left text-gray-300">Player</th>
                <th className="py-3 px-4 text-right text-gray-300">Score</th>
                <th className="py-3 px-4 text-right text-gray-300">Wave</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isCurrent = isCurrentPlayer(entry);
                return (
                  <tr
                    key={entry.rank}
                    className={`border-t border-gray-700 ${
                      isCurrent ? "bg-primary-900/20 border-primary-500/50" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold ${
                          entry.rank === 1
                            ? "text-yellow-400"
                            : entry.rank === 2
                              ? "text-gray-300"
                              : entry.rank === 3
                                ? "text-amber-600"
                                : isCurrent
                                  ? "text-primary-400"
                                  : "text-gray-400"
                        }`}
                      >
                        #{entry.rank}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 ${isCurrent ? "text-primary-400 font-semibold" : "text-white"}`}
                    >
                      {formatPlayerName(entry)}
                      {isCurrent && <span className="ml-2 text-xs text-primary-400">(You)</span>}
                    </td>
                    <td className="py-3 px-4 text-right text-primary-400 font-semibold">
                      {entry.score.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">{entry.wave}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
