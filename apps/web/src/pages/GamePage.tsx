import { Link } from "react-router-dom";

export function GamePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-primary-400 mb-2">Game Arena</h1>
        <p className="text-gray-400">PixiJS game canvas will render here</p>
      </div>

      {/* Placeholder for PixiJS canvas */}
      <div className="w-full max-w-4xl aspect-video bg-gray-800 rounded-lg border-2 border-gray-700 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg">Game Canvas</p>
          <p className="text-sm">Connect wallet to start playing</p>
        </div>
      </div>

      <div className="flex gap-4 mt-4">
        <Link
          to="/"
          className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded transition-colors"
        >
          Back to Menu
        </Link>
      </div>
    </div>
  );
}
