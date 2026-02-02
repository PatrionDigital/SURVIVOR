import { useReadContracts, useAccount, useBlockNumber } from "wagmi";
import { formatUnits } from "viem";
import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { gearTokenAbi, GEAR_TOKEN_SYMBOLS } from "@survivor/sdk";
import { getNetworkAddresses } from "@/lib/contracts";

export type GearSlot = keyof typeof GEAR_TOKEN_SYMBOLS;

export interface GearTokenBalance {
  slot: GearSlot;
  symbol: string;
  balance: bigint;
  formattedBalance: string;
}

export interface UseGearTokensReturn {
  balances: GearTokenBalance[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  getBalance: (slot: GearSlot) => GearTokenBalance | undefined;
}

const GEAR_SLOTS: GearSlot[] = ["weapon", "armor", "power", "gloves", "amulet", "boots"];

const GEAR_DECIMALS = 18;

/**
 * Hook to read all gear token balances for the connected wallet
 * Auto-refreshes on new blocks
 */
export function useGearTokens(): UseGearTokensReturn {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();

  // Get gear token addresses (auto-selects anvil in local dev, testnet otherwise)
  const networkAddresses = getNetworkAddresses();
  const gearAddresses = networkAddresses.gearTokens;

  // Build multicall contracts array
  const contracts = useMemo(() => {
    if (!address) return [];

    return GEAR_SLOTS.map((slot) => ({
      address: gearAddresses[slot] || undefined,
      abi: gearTokenAbi,
      functionName: "balanceOf" as const,
      args: [address] as const,
    })).filter((c) => !!c.address);
  }, [address, gearAddresses]);

  // Read all balances in one multicall
  const {
    data: results,
    isLoading,
    error,
    refetch,
    queryKey,
  } = useReadContracts({
    contracts: contracts as Array<{
      address: `0x${string}`;
      abi: typeof gearTokenAbi;
      functionName: "balanceOf";
      args: readonly [`0x${string}`];
    }>,
    query: {
      enabled: isConnected && !!address && contracts.length > 0,
    },
  });

  // Watch for new blocks to auto-refresh
  const { data: blockNumber } = useBlockNumber({ watch: true });

  useEffect(() => {
    if (blockNumber && queryKey) {
      queryClient.invalidateQueries({ queryKey });
    }
  }, [blockNumber, queryClient, queryKey]);

  // Format balances
  const balances: GearTokenBalance[] = useMemo(() => {
    if (!results) return [];

    return GEAR_SLOTS.map((slot, index) => {
      const result = results[index];
      const balance = result?.status === "success" ? (result.result as bigint) : 0n;

      return {
        slot,
        symbol: GEAR_TOKEN_SYMBOLS[slot],
        balance,
        formattedBalance: formatUnits(balance, GEAR_DECIMALS),
      };
    });
  }, [results]);

  // Helper to get balance for a specific slot
  const getBalance = (slot: GearSlot): GearTokenBalance | undefined => {
    return balances.find((b) => b.slot === slot);
  };

  return {
    balances,
    isLoading,
    error: error as Error | null,
    refetch,
    getBalance,
  };
}
