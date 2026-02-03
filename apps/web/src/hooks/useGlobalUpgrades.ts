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
import { globalUpgradeNftAbi, vscTokenAbi } from "@survivor/sdk";
import { getNetworkAddresses } from "@/lib/contracts";
import { useTransactionService } from "@/lib/TransactionService";

const VSC_DECIMALS = 18;

// Upgrade type metadata
export interface UpgradeType {
  id: number;
  name: string;
  description: string;
  benefit: string;
}

export const UPGRADE_TYPES: UpgradeType[] = [
  {
    id: 1,
    name: "Max Health",
    description: "Increase maximum health",
    benefit: "+5% per level",
  },
  {
    id: 2,
    name: "Base Damage",
    description: "Increase base damage output",
    benefit: "+5% per level",
  },
  {
    id: 3,
    name: "Move Speed",
    description: "Increase movement speed",
    benefit: "+5% per level",
  },
  {
    id: 4,
    name: "XP Gain",
    description: "Increase experience gain rate",
    benefit: "+5% per level",
  },
  {
    id: 5,
    name: "Pickup Range",
    description: "Increase pickup range for items",
    benefit: "+10% per level",
  },
  {
    id: 6,
    name: "Revival",
    description: "Gain extra lives",
    benefit: "+1 life per level",
  },
  {
    id: 7,
    name: "Starting Weapon",
    description: "Start with additional weapon slots",
    benefit: "+1 slot per level",
  },
];

export interface UpgradeData {
  type: UpgradeType;
  owned: number;
  maxOwned: number;
  nextCost: bigint;
  formattedNextCost: string;
  canAfford: boolean;
  isMaxed: boolean;
}

export interface UseGlobalUpgradesReturn {
  // Upgrade data
  upgrades: UpgradeData[] | null;
  vscBalance: bigint;
  formattedVscBalance: string;
  vscAllowance: bigint;
  needsApproval: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Actions
  mint: (upgradeType: number) => Promise<void>;
  approve: (amount: string) => Promise<void>;

  // Transaction state
  isPending: boolean;
  isConfirming: boolean;
  txHash: `0x${string}` | undefined;
}

export function useGlobalUpgrades(): UseGlobalUpgradesReturn {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  // Contract addresses (auto-selects anvil in local dev, testnet otherwise)
  const networkAddresses = getNetworkAddresses();
  const globalUpgradeNftAddress = networkAddresses.globalUpgradeNFT || undefined;
  const vscTokenAddress = networkAddresses.vscToken || undefined;

  // Check if query should be enabled
  const queryEnabled = isConnected && !!address && !!globalUpgradeNftAddress;

  // Get all upgrade counts
  const {
    data: allUpgradesRaw,
    isLoading: upgradesLoading,
    error: upgradesError,
    refetch: refetchUpgrades,
    queryKey: upgradesQueryKey,
  } = useReadContract({
    address: globalUpgradeNftAddress,
    abi: globalUpgradeNftAbi,
    functionName: "getAllUpgrades",
    args: address ? [address] : undefined,
    query: {
      enabled: queryEnabled,
    },
  });

  // Get VSC balance
  const { data: vscBalanceRaw, refetch: refetchVscBalance } = useReadContract({
    address: vscTokenAddress,
    abi: vscTokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && !!vscTokenAddress,
    },
  });

  // Get VSC allowance
  const { data: vscAllowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: vscTokenAddress,
    abi: vscTokenAbi,
    functionName: "allowance",
    args: address && globalUpgradeNftAddress ? [address, globalUpgradeNftAddress] : undefined,
    query: {
      enabled: isConnected && !!address && !!vscTokenAddress && !!globalUpgradeNftAddress,
    },
  });

  // Get costs for next upgrade of each type
  const costContracts = useMemo(() => {
    if (!address || !globalUpgradeNftAddress) return [];
    return UPGRADE_TYPES.map((type) => ({
      address: globalUpgradeNftAddress,
      abi: globalUpgradeNftAbi,
      functionName: "getMintCost" as const,
      args: [address, BigInt(type.id)] as const,
    }));
  }, [address, globalUpgradeNftAddress]);

  const { data: costResults, refetch: refetchCosts } = useReadContracts({
    contracts: costContracts as Array<{
      address: `0x${string}`;
      abi: typeof globalUpgradeNftAbi;
      functionName: "getMintCost";
      args: readonly [`0x${string}`, bigint];
    }>,
    query: {
      enabled: queryEnabled && costContracts.length > 0,
    },
  });

  // Watch for new blocks to auto-refresh (disabled during initial load to prevent loading loops)
  const { data: blockNumber } = useBlockNumber({ watch: !upgradesLoading });

  useEffect(() => {
    // Only invalidate if we're not currently loading and have data
    if (blockNumber && upgradesQueryKey && !upgradesLoading && allUpgradesRaw !== undefined) {
      queryClient.invalidateQueries({ queryKey: upgradesQueryKey });
    }
  }, [blockNumber, queryClient, upgradesQueryKey, upgradesLoading, allUpgradesRaw]);

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

  // Format VSC balance and allowance
  const vscBalance = (vscBalanceRaw as bigint | undefined) || 0n;
  const vscAllowance = (vscAllowanceRaw as bigint | undefined) || 0n;
  const formattedVscBalance = formatUnits(vscBalance, VSC_DECIMALS);

  // Format upgrade data
  const upgrades: UpgradeData[] | null = useMemo(() => {
    if (!allUpgradesRaw || !costResults) {
      return null;
    }

    const ownedCounts = allUpgradesRaw as readonly bigint[];

    return UPGRADE_TYPES.map((type, index) => {
      const owned = Number(ownedCounts[index] ?? 0n);
      const maxOwned = 10; // MAX_PER_TYPE constant from contract
      const isMaxed = owned >= maxOwned;

      const nextCost =
        costResults[index]?.status === "success" ? (costResults[index].result as bigint) : 0n;
      const canAfford = vscBalance >= nextCost && !isMaxed;

      return {
        type,
        owned,
        maxOwned,
        nextCost,
        formattedNextCost: formatUnits(nextCost, VSC_DECIMALS),
        canAfford,
        isMaxed,
      };
    });
  }, [allUpgradesRaw, costResults, vscBalance]);

  // Check if approval is needed (for any non-maxed upgrade)
  const needsApproval = useMemo(() => {
    if (!upgrades) return false;
    // If there's any upgrade we could potentially mint and we don't have enough allowance
    const minCost = upgrades
      .filter((u) => !u.isMaxed)
      .reduce((min, u) => (u.nextCost < min ? u.nextCost : min), BigInt(Number.MAX_SAFE_INTEGER));
    return vscAllowance < minCost;
  }, [upgrades, vscAllowance]);

  // Refetch all data
  const refetch = useCallback(() => {
    refetchUpgrades();
    refetchVscBalance();
    refetchAllowance();
    refetchCosts();
  }, [refetchUpgrades, refetchVscBalance, refetchAllowance, refetchCosts]);

  // Mint an upgrade
  const mint = useCallback(
    async (upgradeType: number) => {
      if (!globalUpgradeNftAddress) throw new Error("GlobalUpgradeNFT contract not configured");

      try {
        setLocalIsPending(true);
        const hash = await txService.writeContract({
          address: globalUpgradeNftAddress,
          abi: globalUpgradeNftAbi,
          functionName: "mint",
          args: [BigInt(upgradeType)],
        });
        setTxHash(hash);
        refetch(); // Refresh data after successful transaction
      } finally {
        setLocalIsPending(false);
      }
    },
    [globalUpgradeNftAddress, txService, refetch]
  );

  // Approve VSC for GlobalUpgradeNFT
  const approve = useCallback(
    async (amount: string) => {
      if (!vscTokenAddress || !globalUpgradeNftAddress)
        throw new Error("Contracts not configured");
      const parsedAmount = parseUnits(amount, VSC_DECIMALS);

      try {
        setLocalIsPending(true);
        const hash = await txService.writeContract({
          address: vscTokenAddress,
          abi: vscTokenAbi,
          functionName: "approve",
          args: [globalUpgradeNftAddress, parsedAmount],
        });
        setTxHash(hash);
        refetch(); // Refresh allowances after approval
      } finally {
        setLocalIsPending(false);
      }
    },
    [vscTokenAddress, globalUpgradeNftAddress, txService, refetch]
  );

  return {
    upgrades,
    vscBalance,
    formattedVscBalance,
    vscAllowance,
    needsApproval,
    isLoading: upgradesLoading,
    error: upgradesError as Error | null,
    refetch,
    mint,
    approve,
    isPending,
    isConfirming,
    txHash,
  };
}
