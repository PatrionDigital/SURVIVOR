import { useState } from "react";
import { QRCode } from "@farcaster/auth-kit";
import { useWallet } from "@/hooks";

interface ConnectButtonProps {
  className?: string;
}

/**
 * Button to display wallet connection status
 * - In Mini App context: auto-connects to Farcaster
 * - In browser context: shows SIWF QR code modal for authentication
 */
export function ConnectButton({ className = "" }: ConnectButtonProps) {
  const {
    isConnected,
    isConnecting,
    shortAddress,
    username,
    connect,
    connectionState,
    isInMiniApp,
    siwfUrl,
    isSiwfPolling,
  } = useWallet();

  const [showQrModal, setShowQrModal] = useState(false);

  // Handle connect click
  const handleConnect = () => {
    if (isInMiniApp) {
      // In Mini App, directly connect
      connect();
    } else {
      // In browser, show QR modal and trigger SIWF
      setShowQrModal(true);
      connect();
    }
  };

  // Close modal when connected
  if (showQrModal && isConnected) {
    setShowQrModal(false);
  }

  // Loading state (for Mini App)
  if (isConnecting && isInMiniApp) {
    return (
      <button
        disabled
        className={`bg-gray-600 text-gray-300 text-sm py-2 px-4 rounded cursor-wait ${className}`}
      >
        Connecting...
      </button>
    );
  }

  // Connected state - show username or short address
  if (isConnected && (shortAddress || username)) {
    return (
      <div
        className={`bg-green-600/20 border border-green-500/50 text-green-400 text-sm py-2 px-4 rounded flex items-center gap-2 ${className}`}
      >
        {username ? `@${username}` : shortAddress}
      </div>
    );
  }

  // Error state
  if (connectionState === "error") {
    return (
      <button
        onClick={handleConnect}
        className={`bg-red-600 hover:bg-red-500 text-white text-sm py-2 px-4 rounded transition-colors ${className}`}
      >
        Retry
      </button>
    );
  }

  // Disconnected state - show connect button with optional QR modal
  return (
    <>
      <button
        onClick={handleConnect}
        className={`bg-primary-600 hover:bg-primary-500 text-white text-sm py-2 px-4 rounded transition-colors ${className}`}
      >
        {isInMiniApp ? "Connect" : "Sign In"}
      </button>

      {/* SIWF QR Code Modal for browser */}
      {showQrModal && !isInMiniApp && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-gray-800 rounded-lg p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4 text-center">
              Sign In with Farcaster
            </h3>

            {isSiwfPolling && siwfUrl ? (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <QRCode uri={siwfUrl} />
                </div>
                <p className="text-gray-400 text-sm text-center">
                  Scan with your Farcaster app to sign in
                </p>
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                  Waiting for approval...
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-48 h-48 bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">Loading...</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowQrModal(false)}
              className="mt-4 w-full text-gray-400 hover:text-white text-sm py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
