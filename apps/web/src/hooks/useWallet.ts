import { useCallback, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useSiwfAuth } from "@/lib/siwfAuth";
import { usePlayerStore } from "@/stores/playerStore";
import { useMiniApp } from "./useMiniApp";
import { isLocalDev } from "@/lib/wagmi";

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
  isLocalDev: boolean;

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
 * - In local dev: auto-connects Anvil wallet (second default account)
 * - In Mini App context: auto-connects wallet via farcasterMiniApp connector
 * - In browser context: uses SIWF for authentication (persisted via localStorage)
 */
export function useWallet(): UseWalletReturn {
  const { context, isReady: isMiniAppReady, isInMiniApp } = useMiniApp();

  // SIWF auth with localStorage persistence
  const {
    user: siwfUser,
    isAuthenticated: siwfAuthenticated,
    signOut: siwfSignOut,
  } = useSiwfAuth();

  // wagmi hooks
  const { address: wagmiAddress, isConnected: wagmiIsConnected, isConnecting } = useAccount();
  const { connect: wagmiConnect, connectors, error: connectError, isPending } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  // Zustand store
  const { connect: storeConnect, disconnect: storeDisconnect, fid: storeFid } = usePlayerStore();

  // Get the first connector (mock in local dev, farcasterMiniApp in prod)
  const primaryConnector = connectors[0];

  // Determine effective connection state
  // In local dev: use wagmi connection with mock connector
  // In Mini App: use wagmi connection
  // In browser: use SIWF auth (persisted via localStorage)
  const isConnected = isLocalDev || isInMiniApp ? wagmiIsConnected : siwfAuthenticated;
  const address = isLocalDev || isInMiniApp ? wagmiAddress : (siwfUser?.custody ?? undefined);

  // Expected Anvil address (second default account)
  const ANVIL_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  // Auto-connect in local dev mode or mini app context
  useEffect(() => {
    if (isLocalDev && primaryConnector && !isPending) {
      // In local dev, if not connected OR connected to wrong address, reconnect
      const wrongAddress =
        wagmiIsConnected && wagmiAddress?.toLowerCase() !== ANVIL_ADDRESS.toLowerCase();
      if (!wagmiIsConnected || wrongAddress) {
        if (wrongAddress) {
          console.log("[useWallet] Wrong address detected, reconnecting to Anvil...", {
            current: wagmiAddress,
            expected: ANVIL_ADDRESS,
          });
          wagmiDisconnect();
        }
        wagmiConnect({ connector: primaryConnector });
      }
    } else if (
      isInMiniApp &&
      isMiniAppReady &&
      primaryConnector &&
      !wagmiIsConnected &&
      !isPending
    ) {
      wagmiConnect({ connector: primaryConnector });
    }
  }, [
    isLocalDev,
    isInMiniApp,
    isMiniAppReady,
    primaryConnector,
    wagmiIsConnected,
    wagmiAddress,
    isPending,
    wagmiConnect,
    wagmiDisconnect,
  ]);

  // Sync connection state with playerStore
  useEffect(() => {
    if (isConnected && address) {
      // In local dev, use a mock FID (12345 for testing)
      const userFid = isLocalDev
        ? 12345
        : isInMiniApp
          ? (context?.user?.fid ?? null)
          : (siwfUser?.fid ?? null);
      storeConnect(address, userFid ?? 0);
    } else if (!isConnected) {
      storeDisconnect();
    }
  }, [
    isConnected,
    address,
    isInMiniApp,
    context?.user?.fid,
    siwfUser?.fid,
    storeConnect,
    storeDisconnect,
  ]);

  // Connect function
  // In local dev: connects Anvil wallet
  // In Mini App: connects via farcasterMiniApp connector
  // In browser: auth-kit's SignInButton handles the SIWF flow
  const connect = useCallback(() => {
    if ((isLocalDev || isInMiniApp) && primaryConnector && !wagmiIsConnected && !isPending) {
      wagmiConnect({ connector: primaryConnector });
    }
  }, [primaryConnector, wagmiIsConnected, isPending, wagmiConnect]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (isLocalDev || isInMiniApp) {
      wagmiDisconnect();
    } else {
      siwfSignOut();
    }
    storeDisconnect();
  }, [wagmiDisconnect, siwfSignOut, storeDisconnect]);

  // Determine connection state
  const getConnectionState = (): ConnectionState => {
    if (connectError) return "error";
    if (isConnecting || isPending) return "connecting";
    if (isConnected) return "connected";
    return "disconnected";
  };

  // Get user profile data from Mini App context, SIWF user, or local dev mock
  const getUserProfile = () => {
    // In local dev, return mock user data
    if (isLocalDev) {
      return {
        fid: 12345,
        username: "anvil-dev",
        displayName: "Anvil Developer",
        pfpUrl: null,
      };
    }
    if (isInMiniApp && context?.user) {
      return {
        fid: context.user.fid,
        username: context.user.username ?? null,
        displayName: context.user.displayName ?? null,
        pfpUrl: context.user.pfpUrl ?? null,
      };
    }
    if (siwfUser) {
      return {
        fid: siwfUser.fid,
        username: siwfUser.username,
        displayName: siwfUser.displayName,
        pfpUrl: siwfUser.pfpUrl,
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
    error: connectError ?? null,

    fid: userProfile.fid,
    username: userProfile.username,
    displayName: userProfile.displayName,
    pfpUrl: userProfile.pfpUrl,
    isInMiniApp,
    isMiniAppReady,
    isLocalDev,

    connect,
    disconnect,

    shortAddress,
  };
}
