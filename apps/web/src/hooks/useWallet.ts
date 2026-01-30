import { useCallback, useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useSignIn } from "@farcaster/auth-kit";
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

const SIWF_STORAGE_KEY = "farcaster_survivors_siwf_user";

// Helper to safely access localStorage
const getStoredSiwfUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SIWF_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as {
        fid: number;
        username: string;
        displayName: string;
        pfpUrl: string;
        custody: `0x${string}`;
      };
    }
  } catch {
    // Invalid stored data, clear it
    localStorage.removeItem(SIWF_STORAGE_KEY);
  }
  return null;
};

/**
 * Hook for wallet connection that integrates wagmi with Farcaster Mini App SDK
 * and Sign In With Farcaster (SIWF) for browser-based authentication.
 *
 * - In Mini App context: auto-connects wallet via farcasterMiniApp connector
 * - In browser context: uses SIWF for authentication (QR code flow)
 */
export function useWallet(): UseWalletReturn {
  const { context, isReady: isMiniAppReady, isInMiniApp } = useMiniApp();

  // SIWF state for browser authentication - initialize from localStorage
  const [siwfUser, setSiwfUser] = useState<{
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
    custody: `0x${string}`;
  } | null>(() => getStoredSiwfUser());

  // Persist SIWF user to localStorage when it changes
  useEffect(() => {
    if (siwfUser) {
      localStorage.setItem(SIWF_STORAGE_KEY, JSON.stringify(siwfUser));
    }
  }, [siwfUser]);

  // SIWF hook for browser authentication
  // Note: SignInButton from auth-kit handles the QR code UI
  const {
    signOut: siwfSignOut,
    isSuccess: isSiwfSuccess,
    error: siwfError,
  } = useSignIn({
    onSuccess: ({ fid, username, displayName, pfpUrl, custody }) => {
      if (fid !== undefined) {
        const userData = {
          fid,
          username: username ?? "",
          displayName: displayName ?? "",
          pfpUrl: pfpUrl ?? "",
          custody: custody as `0x${string}`,
        };
        setSiwfUser(userData);
      }
    },
  });

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
  // In browser: use SIWF authentication (check both success state and stored user)
  const isConnected = isInMiniApp ? wagmiIsConnected : (isSiwfSuccess || siwfUser !== null);
  const address = isInMiniApp ? wagmiAddress : siwfUser?.custody;

  // Auto-connect when in mini app context and ready
  useEffect(() => {
    if (isInMiniApp && isMiniAppReady && miniAppConnector && !wagmiIsConnected && !isPending) {
      wagmiConnect({ connector: miniAppConnector });
    }
  }, [isInMiniApp, isMiniAppReady, miniAppConnector, wagmiIsConnected, isPending, wagmiConnect]);

  // Sync connection state with playerStore
  useEffect(() => {
    if (isConnected && address) {
      const userFid = isInMiniApp
        ? (context?.user?.fid ?? null)
        : (siwfUser?.fid ?? null);
      storeConnect(address, userFid ?? 0);
    } else if (!isConnected) {
      storeDisconnect();
    }
  }, [isConnected, address, isInMiniApp, context?.user?.fid, siwfUser?.fid, storeConnect, storeDisconnect]);

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
      setSiwfUser(null);
      // Clear persisted session
      localStorage.removeItem(SIWF_STORAGE_KEY);
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

  // Get user profile data from Mini App context or SIWF
  const getUserProfile = () => {
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
        username: siwfUser.username || null,
        displayName: siwfUser.displayName || null,
        pfpUrl: siwfUser.pfpUrl || null,
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
