import { Outlet, Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@/components/wallet";

const NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/game", label: "Play" },
  { path: "/leaderboard", label: "Leaderboard" },
  { path: "/staking", label: "Staking" },
  { path: "/profile", label: "Profile" },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary-400 hover:text-primary-300">
            Farcaster Survivors
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded transition-colors ${
                  location.pathname === item.path
                    ? "bg-primary-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Wallet connection button */}
          <ConnectButton />
        </div>

        {/* Mobile navigation */}
        <nav className="md:hidden flex items-center justify-around border-t border-gray-700 py-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                location.pathname === item.path
                  ? "text-primary-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-4">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>Built on Base L2 | Powered by Farcaster</p>
        </div>
      </footer>
    </div>
  );
}
