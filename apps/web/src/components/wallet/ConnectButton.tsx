import { SignInButton } from "@farcaster/auth-kit";
import { useWallet } from "@/hooks";

interface ConnectButtonProps {
  className?: string;
}

/**
 * Button to display wallet connection status
 * - In Mini App context: auto-connects to Farcaster
 * - In browser context: uses SignInButton from auth-kit for SIWF flow
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
  } = useWallet();

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
        onClick={connect}
        className={`bg-red-600 hover:bg-red-500 text-white text-sm py-2 px-4 rounded transition-colors ${className}`}
      >
        Retry
      </button>
    );
  }

  // In Mini App context - show custom connect button
  if (isInMiniApp) {
    return (
      <button
        onClick={connect}
        className={`bg-primary-600 hover:bg-primary-500 text-white text-sm py-2 px-4 rounded transition-colors ${className}`}
      >
        Connect
      </button>
    );
  }

  // In browser context - use auth-kit's SignInButton for SIWF
  return <SignInButton />;
}
