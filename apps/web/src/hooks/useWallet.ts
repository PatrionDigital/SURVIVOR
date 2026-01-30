import { useCallback, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
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
 * and syncs state with the playerStore
 */
export function useWallet(): UseWalletReturn {
  const { context, isReady: isMiniAppReady, isInMiniApp } = useMiniApp();

  // wagmi hooks
  const { address, isConnected, isConnecting } = useAccount();
  const { connect: wagmiConnect, connectors, error: connectError, isPending } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  // Zustand store
  const { connect: storeConnect, disconnect: storeDisconnect, fid: storeFid } = usePlayerStore();

  // Get the Farcaster Mini App connector
  const miniAppConnector = connectors[0];

  // Auto-connect when mini app is ready and not already connected
  useEffect(() => {
    if (isMiniAppReady && miniAppConnector && !isConnected && !isPending) {
      wagmiConnect({ connector: miniAppConnector });
    }
  }, [isMiniAppReady, miniAppConnector, isConnected, isPending, wagmiConnect]);

  // Sync connection state with playerStore
  useEffect(() => {
    if (isConnected && address) {
      const userFid = context?.user?.fid ?? null;
      storeConnect(address, userFid ?? 0);
    } else {
      storeDisconnect();
    }
  }, [isConnected, address, context?.user?.fid, storeConnect, storeDisconnect]);

  // Connect function
  const connect = useCallback(() => {
    if (miniAppConnector && !isConnected && !isPending) {
      wagmiConnect({ connector: miniAppConnector });
    }
  }, [miniAppConnector, isConnected, isPending, wagmiConnect]);

  // Disconnect function
  const disconnect = useCallback(() => {
    wagmiDisconnect();
    storeDisconnect();
  }, [wagmiDisconnect, storeDisconnect]);

  // Determine connection state
  const getConnectionState = (): ConnectionState => {
    if (connectError) return "error";
    if (isConnecting || isPending) return "connecting";
    if (isConnected) return "connected";
    return "disconnected";
  };

  // Format short address
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  return {
    address,
    isConnected,
    isConnecting: isConnecting || isPending,
    connectionState: getConnectionState(),
    error: connectError ?? null,

    fid: context?.user?.fid ?? storeFid,
    isInMiniApp,
    isMiniAppReady,

    connect,
    disconnect,

    shortAddress,
  };
}
