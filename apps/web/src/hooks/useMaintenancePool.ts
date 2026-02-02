import {
  useReadContracts,
  useWriteContract,
  useAccount,
  useBlockNumber,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useEffect, useMemo, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CONTRACT_ADDRESSES, maintenancePoolAbi, vscTokenAbi } from "@survivor/sdk";

const VSC_DECIMALS = 18;

export interface MaintenanceData {
  balance: bigint;
  formattedBalance: string;
  threshold: bigint;
  formattedThreshold: string;
  isActive: boolean;
  percentage: number;
  pendingDecay: bigint;
  formattedPendingDecay: string;
  walletBalance: bigint;
  formattedWalletBalance: string;
  allowance: bigint;
}

export interface UseMaintenancePoolReturn {
  data: MaintenanceData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Actions
  deposit: (amount: string) => Promise<void>;
  withdraw: (amount: string) => Promise<void>;
  approve: (amount: string) => Promise<void>;

  // Transaction state
  isPending: boolean;
  isConfirming: boolean;
  txHash: `0x${string}` | undefined;
}

export function useMaintenancePool(): UseMaintenancePoolReturn {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  // Contract addresses
  const maintenancePoolAddress = CONTRACT_ADDRESSES.testnet.maintenancePool || undefined;
  const vscTokenAddress = CONTRACT_ADDRESSES.testnet.vscToken || undefined;

  // Build multicall contracts
  const contracts = useMemo(() => {
    if (!address || !maintenancePoolAddress || !vscTokenAddress) return [];

    return [
      // Pool balance
      {
        address: maintenancePoolAddress,
        abi: maintenancePoolAbi,
        functionName: "getPoolBalance" as const,
        args: [address] as const,
      },
      // Threshold
      {
        address: maintenancePoolAddress,
        abi: maintenancePoolAbi,
        functionName: "getThreshold" as const,
        args: [address] as const,
      },
      // Status
      {
        address: maintenancePoolAddress,
        abi: maintenancePoolAbi,
        functionName: "getMaintenanceStatus" as const,
        args: [address] as const,
      },
      // Percentage
      {
        address: maintenancePoolAddress,
        abi: maintenancePoolAbi,
        functionName: "getMaintenancePercentage" as const,
        args: [address] as const,
      },
      // Pending decay
      {
        address: maintenancePoolAddress,
        abi: maintenancePoolAbi,
        functionName: "getPendingDecay" as const,
        args: [address] as const,
      },
      // VSC wallet balance
      {
        address: vscTokenAddress,
        abi: vscTokenAbi,
        functionName: "balanceOf" as const,
        args: [address] as const,
      },
      // VSC allowance to maintenance pool
      {
        address: vscTokenAddress,
        abi: vscTokenAbi,
        functionName: "allowance" as const,
        args: [address, maintenancePoolAddress] as const,
      },
    ];
  }, [address, maintenancePoolAddress, vscTokenAddress]);

  const {
    data: results,
    isLoading,
    error,
    refetch,
    queryKey,
  } = useReadContracts({
    contracts,
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

  // Write contract hooks
  const { writeContractAsync, isPending } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Format data
  const data: MaintenanceData | null = useMemo(() => {
    if (!results || results.length < 7) return null;

    const balance = results[0]?.status === "success" ? (results[0].result as bigint) : 0n;
    const threshold = results[1]?.status === "success" ? (results[1].result as bigint) : 0n;
    const isActive = results[2]?.status === "success" ? (results[2].result as boolean) : false;
    const percentage = results[3]?.status === "success" ? Number(results[3].result as bigint) : 0;
    const pendingDecay = results[4]?.status === "success" ? (results[4].result as bigint) : 0n;
    const walletBalance = results[5]?.status === "success" ? (results[5].result as bigint) : 0n;
    const allowance = results[6]?.status === "success" ? (results[6].result as bigint) : 0n;

    return {
      balance,
      formattedBalance: formatUnits(balance, VSC_DECIMALS),
      threshold,
      formattedThreshold: formatUnits(threshold, VSC_DECIMALS),
      isActive,
      percentage,
      pendingDecay,
      formattedPendingDecay: formatUnits(pendingDecay, VSC_DECIMALS),
      walletBalance,
      formattedWalletBalance: formatUnits(walletBalance, VSC_DECIMALS),
      allowance,
    };
  }, [results]);

  // Deposit tokens
  const deposit = useCallback(
    async (amount: string) => {
      if (!maintenancePoolAddress) throw new Error("Maintenance pool not configured");
      const parsedAmount = parseUnits(amount, VSC_DECIMALS);

      const hash = await writeContractAsync({
        address: maintenancePoolAddress,
        abi: maintenancePoolAbi,
        functionName: "deposit",
        args: [parsedAmount],
      });
      setTxHash(hash);
    },
    [maintenancePoolAddress, writeContractAsync]
  );

  // Withdraw tokens
  const withdraw = useCallback(
    async (amount: string) => {
      if (!maintenancePoolAddress) throw new Error("Maintenance pool not configured");
      const parsedAmount = parseUnits(amount, VSC_DECIMALS);

      const hash = await writeContractAsync({
        address: maintenancePoolAddress,
        abi: maintenancePoolAbi,
        functionName: "withdraw",
        args: [parsedAmount],
      });
      setTxHash(hash);
    },
    [maintenancePoolAddress, writeContractAsync]
  );

  // Approve tokens for maintenance pool
  const approve = useCallback(
    async (amount: string) => {
      if (!vscTokenAddress || !maintenancePoolAddress)
        throw new Error("Token not configured");
      const parsedAmount = parseUnits(amount, VSC_DECIMALS);

      const hash = await writeContractAsync({
        address: vscTokenAddress,
        abi: vscTokenAbi,
        functionName: "approve",
        args: [maintenancePoolAddress, parsedAmount],
      });
      setTxHash(hash);
    },
    [vscTokenAddress, maintenancePoolAddress, writeContractAsync]
  );

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch,
    deposit,
    withdraw,
    approve,
    isPending,
    isConfirming,
    txHash,
  };
}
