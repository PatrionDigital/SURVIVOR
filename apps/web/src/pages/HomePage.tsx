import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary-400 mb-4">Farcaster Survivors</h1>
        <p className="text-gray-400 max-w-md">
          A crypto-native bullet heaven game. Survive waves of enemies, earn $VSC, and upgrade your
          gear.
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link
          to="/game"
          className="bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 px-8 rounded-lg text-center transition-colors"
        >
          Play Now
        </Link>

        <Link
          to="/leaderboard"
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg text-center transition-colors"
        >
          Leaderboard
        </Link>

        <Link
          to="/staking"
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg text-center transition-colors"
        >
          Gear Staking
        </Link>

        <Link
          to="/profile"
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg text-center transition-colors"
        >
          Profile
        </Link>
      </div>
    </div>
  );
}
