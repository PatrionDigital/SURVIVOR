import { useReadContract, useAccount, useBlockNumber } from "wagmi";
import { formatUnits } from "viem";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CONTRACT_ADDRESSES, vscTokenAbi, VSC_TOKEN_DECIMALS } from "@survivor/sdk";

export interface UseVSCTokenReturn {
  balance: bigint | undefined;
  formattedBalance: string;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to read VSC token balance for the connected wallet
 * Auto-refreshes on new blocks
 */
export function useVSCToken(): UseVSCTokenReturn {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();

  // Get the VSC token address based on chain
  // For now, use testnet addresses (will be configured via env)
  const vscTokenAddress = CONTRACT_ADDRESSES.testnet.vscToken;

  // Read balance
  const {
    data: balance,
    isLoading,
    error,
    refetch,
    queryKey,
  } = useReadContract({
    address: vscTokenAddress || undefined,
    abi: vscTokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && !!vscTokenAddress,
    },
  });

  // Watch for new blocks to auto-refresh
  const { data: blockNumber } = useBlockNumber({ watch: true });

  useEffect(() => {
    if (blockNumber && queryKey) {
      queryClient.invalidateQueries({ queryKey });
    }
  }, [blockNumber, queryClient, queryKey]);

  // Format balance for display
  const formattedBalance = balance !== undefined ? formatUnits(balance, VSC_TOKEN_DECIMALS) : "0";

  return {
    balance,
    formattedBalance,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
