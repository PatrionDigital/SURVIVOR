import { useCallback, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useProfile, useSignIn } from "@farcaster/auth-kit";
import { usePlayerStore } from "@/stores/playerStore";
import { useMiniApp } from "./useMiniApp";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface UseWalletReturn {
  // Connection state
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  connectionState: ConnectionState;
  error: Error | null;

  // Farcaster context
  fid: number | null;
  username: string | null;
  displayName: string | null;
  pfpUrl: string | null;
  isInMiniApp: boolean;
  isMiniAppReady: boolean;

  // Actions
  connect: () => void;
  disconnect: () => void;

  // Formatted address
  shortAddress: string | null;
}

/**
 * Hook for wallet connection that integrates wagmi with Farcaster Mini App SDK
 * and Sign In With Farcaster (SIWF) for browser-based authentication.
 *
 * - In Mini App context: auto-connects wallet via farcasterMiniApp connector
 * - In browser context: uses SIWF for authentication (persisted by auth-kit)
 */
export function useWallet(): UseWalletReturn {
  const { context, isReady: isMiniAppReady, isInMiniApp } = useMiniApp();

  // Auth-kit profile hook - persists across page refresh
  const { isAuthenticated, profile } = useProfile();

  // SIWF hook for sign out functionality
  const { signOut: siwfSignOut, error: siwfError } = useSignIn({});

  // wagmi hooks
  const { address: wagmiAddress, isConnected: wagmiIsConnected, isConnecting } = useAccount();
  const { connect: wagmiConnect, connectors, error: connectError, isPending } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  // Zustand store
  const { connect: storeConnect, disconnect: storeDisconnect, fid: storeFid } = usePlayerStore();

  // Get the Farcaster Mini App connector
  const miniAppConnector = connectors[0];

  // Determine effective connection state
  // In Mini App: use wagmi connection
  // In browser: use auth-kit's isAuthenticated (persisted)
  const isConnected = isInMiniApp ? wagmiIsConnected : isAuthenticated;
  const address = isInMiniApp ? wagmiAddress : (profile?.custody as `0x${string}` | undefined);

  // Auto-connect when in mini app context and ready
  useEffect(() => {
    if (isInMiniApp && isMiniAppReady && miniAppConnector && !wagmiIsConnected && !isPending) {
      wagmiConnect({ connector: miniAppConnector });
    }
  }, [isInMiniApp, isMiniAppReady, miniAppConnector, wagmiIsConnected, isPending, wagmiConnect]);

  // Sync connection state with playerStore
  useEffect(() => {
    if (isConnected && address) {
      const userFid = isInMiniApp ? (context?.user?.fid ?? null) : (profile?.fid ?? null);
      storeConnect(address, userFid ?? 0);
    } else if (!isConnected) {
      storeDisconnect();
    }
  }, [
    isConnected,
    address,
    isInMiniApp,
    context?.user?.fid,
    profile?.fid,
    storeConnect,
    storeDisconnect,
  ]);

  // Connect function (only used for Mini App context)
  // In browser context, auth-kit's SignInButton handles the SIWF flow
  const connect = useCallback(() => {
    if (isInMiniApp && miniAppConnector && !wagmiIsConnected && !isPending) {
      wagmiConnect({ connector: miniAppConnector });
    }
  }, [isInMiniApp, miniAppConnector, wagmiIsConnected, isPending, wagmiConnect]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (isInMiniApp) {
      wagmiDisconnect();
    } else {
      siwfSignOut();
    }
    storeDisconnect();
  }, [isInMiniApp, wagmiDisconnect, siwfSignOut, storeDisconnect]);

  // Determine connection state
  const getConnectionState = (): ConnectionState => {
    if (connectError || siwfError) return "error";
    if (isConnecting || isPending) return "connecting";
    if (isConnected) return "connected";
    return "disconnected";
  };

  // Get user profile data from Mini App context or auth-kit profile
  const getUserProfile = () => {
    if (isInMiniApp && context?.user) {
      return {
        fid: context.user.fid,
        username: context.user.username ?? null,
        displayName: context.user.displayName ?? null,
        pfpUrl: context.user.pfpUrl ?? null,
      };
    }
    if (profile) {
      return {
        fid: profile.fid ?? null,
        username: profile.username ?? null,
        displayName: profile.displayName ?? null,
        pfpUrl: profile.pfpUrl ?? null,
      };
    }
    return {
      fid: storeFid,
      username: null,
      displayName: null,
      pfpUrl: null,
    };
  };

  const userProfile = getUserProfile();

  // Format short address
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  return {
    address,
    isConnected,
    isConnecting: isConnecting || isPending,
    connectionState: getConnectionState(),
    error: connectError ?? siwfError ?? null,

    fid: userProfile.fid,
    username: userProfile.username,
    displayName: userProfile.displayName,
    pfpUrl: userProfile.pfpUrl,
    isInMiniApp,
    isMiniAppReady,

    connect,
    disconnect,

    shortAddress,
  };
}
