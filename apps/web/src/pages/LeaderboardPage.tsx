import { Link } from "react-router-dom";
import { useState } from "react";

type Period = "daily" | "weekly" | "allTime";

export function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("daily");

  // Placeholder data
  const leaderboardData = [
    { rank: 1, username: "player1.eth", score: 125000, wave: 45 },
    { rank: 2, username: "survivor.fc", score: 98000, wave: 38 },
    { rank: 3, username: "0x1234...abcd", score: 87500, wave: 35 },
    { rank: 4, username: "gamer.base", score: 76000, wave: 32 },
    { rank: 5, username: "farcaster.user", score: 65000, wave: 28 },
  ];

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary-400">Leaderboard</h1>
        <Link to="/" className="text-gray-400 hover:text-white transition-colors">
          Back
        </Link>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        {(["daily", "weekly", "allTime"] as Period[]).map((p) => (
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

      {/* Leaderboard table */}
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
            {leaderboardData.map((entry) => (
              <tr key={entry.rank} className="border-t border-gray-700">
                <td className="py-3 px-4">
                  <span
                    className={`font-bold ${
                      entry.rank === 1
                        ? "text-yellow-400"
                        : entry.rank === 2
                          ? "text-gray-300"
                          : entry.rank === 3
                            ? "text-amber-600"
                            : "text-gray-400"
                    }`}
                  >
                    #{entry.rank}
                  </span>
                </td>
                <td className="py-3 px-4 text-white">{entry.username}</td>
                <td className="py-3 px-4 text-right text-primary-400">
                  {entry.score.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right text-gray-400">{entry.wave}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
