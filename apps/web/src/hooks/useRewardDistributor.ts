import {
  useReadContracts,
  useWriteContract,
  useAccount,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits } from "viem";
import { useMemo, useCallback, useState } from "react";
import { rewardDistributorAbi } from "@survivor/sdk";
import { getNetworkAddresses } from "@/lib/contracts";
import { useTransactionService } from "@/lib/TransactionService";

const DECIMALS = 18;

/**
 * Reward types matching the RewardDistributor contract
 */
export enum RewardType {
  GAMEPLAY = 0,
  DAILY_LOGIN = 1,
  ACHIEVEMENT = 2,
  SOCIAL = 3,
}

export interface RewardClaimData {
  amount: bigint;
  rewardType: RewardType;
  nonce: bigint;
  expiry: number;
  signature: `0x${string}`;
}

export interface UseRewardDistributorReturn {
  // Read state
  contractAddress: `0x${string}` | undefined;
  canClaim: boolean;
  dailyClaimed: bigint;
  formattedDailyClaimed: string;
  remainingAllowance: bigint;
  formattedRemainingAllowance: string;
  lastClaimTime: number;
  cooldownRemaining: number; // seconds until can claim again
  isLoading: boolean;
  error: Error | null;

  // Actions
  claim: (claimData: RewardClaimData) => Promise<void>;
  refetch: () => void;

  // Transaction state
  isPending: boolean;
  isConfirming: boolean;
  txHash: `0x${string}` | undefined;
  claimError: string | null;
}

const CLAIM_COOLDOWN_SECONDS = 60;

export function useRewardDistributor(): UseRewardDistributorReturn {
  const { address, isConnected } = useAccount();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [claimError, setClaimError] = useState<string | null>(null);

  // Contract address
  const networkAddresses = getNetworkAddresses();
  const contractAddress = networkAddresses.rewardDistributor || undefined;

  // Read contract state
  const readContracts = useMemo(() => {
    if (!contractAddress || !address) return [];
    return [
      {
        address: contractAddress,
        abi: rewardDistributorAbi,
        functionName: "canClaim" as const,
        args: [address] as const,
      },
      {
        address: contractAddress,
        abi: rewardDistributorAbi,
        functionName: "getDailyClaimed" as const,
        args: [address] as const,
      },
      {
        address: contractAddress,
        abi: rewardDistributorAbi,
        functionName: "getRemainingDailyAllowance" as const,
        args: [address] as const,
      },
      {
        address: contractAddress,
        abi: rewardDistributorAbi,
        functionName: "getLastClaimTime" as const,
        args: [address] as const,
      },
    ];
  }, [contractAddress, address]);

  const {
    data: readResults,
    isLoading,
    error,
    refetch,
  } = useReadContracts({
    contracts: readContracts as Array<{
      address: `0x${string}`;
      abi: typeof rewardDistributorAbi;
      functionName:
        | "canClaim"
        | "getDailyClaimed"
        | "getRemainingDailyAllowance"
        | "getLastClaimTime";
      args: readonly [`0x${string}`];
    }>,
    query: {
      enabled: isConnected && !!address && !!contractAddress && readContracts.length > 0,
    },
  });

  // Parse read results
  const canClaim = useMemo(() => {
    if (!readResults?.[0]) return false;
    return readResults[0].status === "success" ? (readResults[0].result as boolean) : false;
  }, [readResults]);

  const dailyClaimed = useMemo(() => {
    if (!readResults?.[1]) return 0n;
    return readResults[1].status === "success" ? (readResults[1].result as bigint) : 0n;
  }, [readResults]);

  const remainingAllowance = useMemo(() => {
    if (!readResults?.[2]) return 0n;
    return readResults[2].status === "success" ? (readResults[2].result as bigint) : 0n;
  }, [readResults]);

  const lastClaimTime = useMemo(() => {
    if (!readResults?.[3]) return 0;
    return readResults[3].status === "success" ? Number(readResults[3].result as bigint) : 0;
  }, [readResults]);

  const cooldownRemaining = useMemo(() => {
    if (lastClaimTime === 0) return 0;
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - lastClaimTime;
    const remaining = CLAIM_COOLDOWN_SECONDS - elapsed;
    return Math.max(0, remaining);
  }, [lastClaimTime]);

  // Write contract hooks
  const { writeContractAsync, isPending: wagmiIsPending } = useWriteContract();
  const txService = useTransactionService(writeContractAsync);
  const [localIsPending, setLocalIsPending] = useState(false);
  const isPending = wagmiIsPending || localIsPending;

  // Wait for transaction receipt
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Claim function
  const claim = useCallback(
    async (claimData: RewardClaimData) => {
      if (!contractAddress) {
        throw new Error("RewardDistributor contract not configured");
      }

      // Clear previous errors
      setClaimError(null);

      try {
        setLocalIsPending(true);
        const hash = await txService.writeContract({
          address: contractAddress,
          abi: rewardDistributorAbi,
          functionName: "claim",
          args: [
            claimData.amount,
            claimData.rewardType,
            claimData.nonce,
            BigInt(claimData.expiry),
            claimData.signature,
          ],
        });
        setTxHash(hash);
        // Refetch state after claim
        refetch();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to claim reward";
        setClaimError(errorMessage);
        throw err;
      } finally {
        setLocalIsPending(false);
      }
    },
    [contractAddress, txService, refetch]
  );

  return {
    contractAddress,
    canClaim,
    dailyClaimed,
    formattedDailyClaimed: formatUnits(dailyClaimed, DECIMALS),
    remainingAllowance,
    formattedRemainingAllowance: formatUnits(remainingAllowance, DECIMALS),
    lastClaimTime,
    cooldownRemaining,
    isLoading,
    error: error as Error | null,
    claim,
    refetch,
    isPending,
    isConfirming,
    txHash,
    claimError,
  };
}
