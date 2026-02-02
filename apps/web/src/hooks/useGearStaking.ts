import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useAccount,
  useBlockNumber,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useEffect, useMemo, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { gearStakingAbi, gearTokenAbi, GEAR_TOKEN_SYMBOLS } from "@survivor/sdk";
import { getNetworkAddresses } from "@/lib/contracts";
import { useTransactionService } from "@/lib/TransactionService";

export type GearSlot = keyof typeof GEAR_TOKEN_SYMBOLS;
export type GearSlotIndex = 0 | 1 | 2 | 3 | 4 | 5;

const GEAR_SLOTS: GearSlot[] = ["weapon", "armor", "power", "gloves", "amulet", "boots"];
const GEAR_DECIMALS = 18;
const POWER_DECIMALS = 9; // Power uses sqrt, which halves decimal precision

// Tier names and colors
export const TIER_NAMES = ["None", "Common", "Uncommon", "Rare", "Epic", "Legendary"] as const;
export const TIER_COLORS = [
  "text-gray-500",
  "text-gray-300",
  "text-green-400",
  "text-blue-400",
  "text-purple-400",
  "text-yellow-400",
] as const;

export interface GearSlotData {
  slot: GearSlot;
  slotIndex: GearSlotIndex;
  symbol: string;
  stakedAmount: bigint;
  formattedStaked: string;
  power: bigint;
  formattedPower: string;
  tier: number;
  tierName: (typeof TIER_NAMES)[number];
  tierColor: (typeof TIER_COLORS)[number];
  walletBalance: bigint;
  formattedWalletBalance: string;
  allowance: bigint;
}

export interface PlayerStats {
  totalPower: bigint;
  formattedTotalPower: string;
  maintenanceActive: boolean;
  slots: GearSlotData[];
}

export interface UseGearStakingReturn {
  // Player stats
  stats: PlayerStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Actions
  stake: (slot: GearSlotIndex, amount: string) => Promise<void>;
  unstake: (slot: GearSlotIndex, amount: string) => Promise<void>;
  approve: (slot: GearSlotIndex, amount: string) => Promise<void>;

  // Transaction state
  isPending: boolean;
  isConfirming: boolean;
  txHash: `0x${string}` | undefined;
}

export function useGearStaking(): UseGearStakingReturn {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  // Contract addresses (auto-selects anvil in local dev, testnet otherwise)
  const networkAddresses = getNetworkAddresses();
  const gearStakingAddress = networkAddresses.gearStaking || undefined;
  const gearAddresses = networkAddresses.gearTokens;

  // Get player stats from contract
  const {
    data: playerStatsRaw,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
    queryKey: statsQueryKey,
  } = useReadContract({
    address: gearStakingAddress,
    abi: gearStakingAbi,
    functionName: "getPlayerStats",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && !!gearStakingAddress,
    },
  });

  // Get wallet balances for all gear tokens
  const balanceContracts = useMemo(() => {
    if (!address) return [];
    return GEAR_SLOTS.map((slot) => ({
      address: gearAddresses[slot] || undefined,
      abi: gearTokenAbi,
      functionName: "balanceOf" as const,
      args: [address] as const,
    })).filter((c) => !!c.address);
  }, [address, gearAddresses]);

  const { data: balanceResults, refetch: refetchBalances } = useReadContracts({
    contracts: balanceContracts as Array<{
      address: `0x${string}`;
      abi: typeof gearTokenAbi;
      functionName: "balanceOf";
      args: readonly [`0x${string}`];
    }>,
    query: {
      enabled: isConnected && !!address && balanceContracts.length > 0,
    },
  });

  // Get allowances for all gear tokens to staking contract
  const allowanceContracts = useMemo(() => {
    if (!address || !gearStakingAddress) return [];
    return GEAR_SLOTS.map((slot) => ({
      address: gearAddresses[slot] || undefined,
      abi: gearTokenAbi,
      functionName: "allowance" as const,
      args: [address, gearStakingAddress] as const,
    })).filter((c) => !!c.address);
  }, [address, gearAddresses, gearStakingAddress]);

  const { data: allowanceResults, refetch: refetchAllowances } = useReadContracts({
    contracts: allowanceContracts as Array<{
      address: `0x${string}`;
      abi: typeof gearTokenAbi;
      functionName: "allowance";
      args: readonly [`0x${string}`, `0x${string}`];
    }>,
    query: {
      enabled: isConnected && !!address && !!gearStakingAddress && allowanceContracts.length > 0,
    },
  });

  // Watch for new blocks to auto-refresh
  const { data: blockNumber } = useBlockNumber({ watch: true });

  useEffect(() => {
    if (blockNumber && statsQueryKey) {
      queryClient.invalidateQueries({ queryKey: statsQueryKey });
    }
  }, [blockNumber, queryClient, statsQueryKey]);

  // Write contract hooks - wagmi for production
  const { writeContractAsync, isPending: wagmiIsPending } = useWriteContract();

  // Transaction service - uses Anvil direct signing in local dev, wagmi in production
  const txService = useTransactionService(writeContractAsync);

  // Local pending state for Anvil transactions
  const [localIsPending, setLocalIsPending] = useState(false);
  const isPending = wagmiIsPending || localIsPending;

  // Wait for transaction receipt
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Format player stats
  const stats: PlayerStats | null = useMemo(() => {
    if (!playerStatsRaw) return null;

    const rawStats = playerStatsRaw as {
      stakedAmounts: readonly bigint[];
      slotPowers: readonly bigint[];
      totalPower: bigint;
      maintenanceActive: boolean;
    };

    const slots: GearSlotData[] = GEAR_SLOTS.map((slot, index) => {
      const stakedAmount = rawStats.stakedAmounts[index] ?? 0n;
      const power = rawStats.slotPowers[index] ?? 0n;
      const walletBalance =
        balanceResults?.[index]?.status === "success"
          ? (balanceResults[index].result as bigint)
          : 0n;
      const allowance =
        allowanceResults?.[index]?.status === "success"
          ? (allowanceResults[index].result as bigint)
          : 0n;

      // Calculate tier based on staked amount
      let tier = 0;
      if (stakedAmount >= parseUnits("100000", GEAR_DECIMALS)) tier = 5;
      else if (stakedAmount >= parseUnits("10000", GEAR_DECIMALS)) tier = 4;
      else if (stakedAmount >= parseUnits("1000", GEAR_DECIMALS)) tier = 3;
      else if (stakedAmount >= parseUnits("100", GEAR_DECIMALS)) tier = 2;
      else if (stakedAmount > 0n) tier = 1;

      return {
        slot,
        slotIndex: index as GearSlotIndex,
        symbol: GEAR_TOKEN_SYMBOLS[slot],
        stakedAmount,
        formattedStaked: formatUnits(stakedAmount, GEAR_DECIMALS),
        power,
        formattedPower: formatUnits(power, POWER_DECIMALS),
        tier,
        tierName: TIER_NAMES[tier],
        tierColor: TIER_COLORS[tier],
        walletBalance,
        formattedWalletBalance: formatUnits(walletBalance, GEAR_DECIMALS),
        allowance,
      };
    });

    return {
      totalPower: rawStats.totalPower,
      formattedTotalPower: formatUnits(rawStats.totalPower, POWER_DECIMALS),
      maintenanceActive: rawStats.maintenanceActive,
      slots,
    };
  }, [playerStatsRaw, balanceResults, allowanceResults]);

  // Refetch all data
  const refetch = useCallback(() => {
    refetchStats();
    refetchBalances();
    refetchAllowances();
  }, [refetchStats, refetchBalances, refetchAllowances]);

  // Stake tokens
  const stake = useCallback(
    async (slot: GearSlotIndex, amount: string) => {
      if (!gearStakingAddress) throw new Error("Staking contract not configured");
      const parsedAmount = parseUnits(amount, GEAR_DECIMALS);

      try {
        setLocalIsPending(true);
        const hash = await txService.writeContract({
          address: gearStakingAddress,
          abi: gearStakingAbi,
          functionName: "stake",
          args: [slot, parsedAmount],
        });
        setTxHash(hash);
        refetch(); // Refresh data after successful transaction
      } finally {
        setLocalIsPending(false);
      }
    },
    [gearStakingAddress, txService, refetch]
  );

  // Unstake tokens
  const unstake = useCallback(
    async (slot: GearSlotIndex, amount: string) => {
      if (!gearStakingAddress) throw new Error("Staking contract not configured");
      const parsedAmount = parseUnits(amount, GEAR_DECIMALS);

      try {
        setLocalIsPending(true);
        const hash = await txService.writeContract({
          address: gearStakingAddress,
          abi: gearStakingAbi,
          functionName: "unstake",
          args: [slot, parsedAmount],
        });
        setTxHash(hash);
        refetch(); // Refresh data after successful transaction
      } finally {
        setLocalIsPending(false);
      }
    },
    [gearStakingAddress, txService, refetch]
  );

  // Approve tokens for staking
  const approve = useCallback(
    async (slot: GearSlotIndex, amount: string) => {
      const tokenAddress = gearAddresses[GEAR_SLOTS[slot]];
      if (!tokenAddress || !gearStakingAddress) throw new Error("Token not configured");
      const parsedAmount = parseUnits(amount, GEAR_DECIMALS);

      try {
        setLocalIsPending(true);
        const hash = await txService.writeContract({
          address: tokenAddress,
          abi: gearTokenAbi,
          functionName: "approve",
          args: [gearStakingAddress, parsedAmount],
        });
        setTxHash(hash);
        refetch(); // Refresh allowances after approval
      } finally {
        setLocalIsPending(false);
      }
    },
    [gearAddresses, gearStakingAddress, txService, refetch]
  );

  return {
    stats,
    isLoading: statsLoading,
    error: statsError as Error | null,
    refetch,
    stake,
    unstake,
    approve,
    isPending,
    isConfirming,
    txHash,
  };
}
