import { useWallet } from "@/hooks";

interface ConnectButtonProps {
  className?: string;
}

/**
 * Button to display wallet connection status
 * Auto-connects in Mini App context, shows manual connect for web fallback
 */
export function ConnectButton({ className = "" }: ConnectButtonProps) {
  const { isConnected, isConnecting, shortAddress, connect, connectionState } = useWallet();

  // Loading state
  if (isConnecting) {
    return (
      <button
        disabled
        className={`bg-gray-600 text-gray-300 text-sm py-2 px-4 rounded cursor-wait ${className}`}
      >
        Connecting...
      </button>
    );
  }

  // Connected state - show short address
  if (isConnected && shortAddress) {
    return (
      <div
        className={`bg-green-600/20 border border-green-500/50 text-green-400 text-sm py-2 px-4 rounded ${className}`}
      >
        {shortAddress}
      </div>
    );
  }

  // Error state
  if (connectionState === "error") {
    return (
      <button
        onClick={connect}
        className={`bg-red-600 hover:bg-red-500 text-white text-sm py-2 px-4 rounded transition-colors ${className}`}
      >
        Retry
      </button>
    );
  }

  // Disconnected state - show connect button
  return (
    <button
      onClick={connect}
      className={`bg-primary-600 hover:bg-primary-500 text-white text-sm py-2 px-4 rounded transition-colors ${className}`}
    >
      Connect
    </button>
  );
}
