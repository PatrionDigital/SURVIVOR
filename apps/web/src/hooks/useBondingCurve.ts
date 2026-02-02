import {
  useReadContracts,
  useWriteContract,
  useAccount,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useMemo, useCallback, useState } from "react";
import { bondingCurveAbi, vscTokenAbi, gearTokenAbi, GEAR_TOKEN_SYMBOLS } from "@survivor/sdk";
import { getNetworkAddresses } from "@/lib/contracts";
import { useTransactionService } from "@/lib/TransactionService";

export type GearSlot = keyof typeof GEAR_TOKEN_SYMBOLS;

const GEAR_SLOTS: GearSlot[] = ["weapon", "armor", "power", "gloves", "amulet", "boots"];
const DECIMALS = 18;

export interface BondingCurveData {
  slot: GearSlot;
  symbol: string;
  currentPrice: bigint;
  formattedPrice: string;
  totalSupply: bigint;
  formattedSupply: string;
  curveAddress: `0x${string}`;
}

export interface UseBondingCurveReturn {
  // Price data for all curves
  curves: BondingCurveData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Quote functions
  getBuyQuote: (slot: GearSlot, vscAmount: string) => Promise<{ tokensOut: bigint; fee: bigint } | null>;
  getSellQuote: (slot: GearSlot, tokenAmount: string) => Promise<{ vscOut: bigint; fee: bigint } | null>;

  // Allowances
  vscAllowance: (slot: GearSlot) => bigint;
  gearAllowance: (slot: GearSlot) => bigint;

  // Actions
  approveVsc: (slot: GearSlot, amount: string) => Promise<void>;
  approveGear: (slot: GearSlot, amount: string) => Promise<void>;
  buy: (slot: GearSlot, vscAmount: string, minTokensOut: string) => Promise<void>;
  sell: (slot: GearSlot, tokenAmount: string, minVscOut: string) => Promise<void>;

  // Transaction state
  isPending: boolean;
  isConfirming: boolean;
  txHash: `0x${string}` | undefined;
}

export function useBondingCurve(): UseBondingCurveReturn {
  const { address, isConnected } = useAccount();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  // Contract addresses
  const networkAddresses = getNetworkAddresses();
  const vscTokenAddress = networkAddresses.vscToken || undefined;
  const curveAddresses = networkAddresses.bondingCurves;
  const gearAddresses = networkAddresses.gearTokens;

  // Get current prices for all curves
  const priceContracts = useMemo(() => {
    return GEAR_SLOTS.map((slot) => ({
      address: curveAddresses[slot] || undefined,
      abi: bondingCurveAbi,
      functionName: "getCurrentPrice" as const,
    })).filter((c) => !!c.address);
  }, [curveAddresses]);

  const {
    data: priceResults,
    isLoading: pricesLoading,
    error: pricesError,
    refetch: refetchPrices,
  } = useReadContracts({
    contracts: priceContracts as Array<{
      address: `0x${string}`;
      abi: typeof bondingCurveAbi;
      functionName: "getCurrentPrice";
    }>,
    query: {
      enabled: priceContracts.length > 0,
    },
  });

  // Get total supply for all gear tokens
  const supplyContracts = useMemo(() => {
    return GEAR_SLOTS.map((slot) => ({
      address: gearAddresses[slot] || undefined,
      abi: gearTokenAbi,
      functionName: "totalSupply" as const,
    })).filter((c) => !!c.address);
  }, [gearAddresses]);

  const { data: supplyResults, refetch: refetchSupply } = useReadContracts({
    contracts: supplyContracts as Array<{
      address: `0x${string}`;
      abi: typeof gearTokenAbi;
      functionName: "totalSupply";
    }>,
    query: {
      enabled: supplyContracts.length > 0,
    },
  });

  // Get VSC allowances for all bonding curves
  const allowanceContracts = useMemo(() => {
    if (!address || !vscTokenAddress) return [];
    return GEAR_SLOTS.map((slot) => ({
      address: vscTokenAddress,
      abi: vscTokenAbi,
      functionName: "allowance" as const,
      args: [address, curveAddresses[slot]] as const,
    })).filter((c) => !!c.args[1]); // Filter out slots without curve addresses
  }, [address, vscTokenAddress, curveAddresses]);

  const { data: allowanceResults, refetch: refetchAllowances } = useReadContracts({
    contracts: allowanceContracts as Array<{
      address: `0x${string}`;
      abi: typeof vscTokenAbi;
      functionName: "allowance";
      args: readonly [`0x${string}`, `0x${string}`];
    }>,
    query: {
      enabled: isConnected && !!address && !!vscTokenAddress && allowanceContracts.length > 0,
    },
  });

  // Get gear token allowances for bonding curves (needed for selling)
  const gearAllowanceContracts = useMemo(() => {
    if (!address) return [];
    return GEAR_SLOTS.map((slot) => ({
      address: gearAddresses[slot] || undefined,
      abi: gearTokenAbi,
      functionName: "allowance" as const,
      args: [address, curveAddresses[slot]] as const,
    })).filter((c) => !!c.address && !!c.args[1]);
  }, [address, gearAddresses, curveAddresses]);

  const { data: gearAllowanceResults, refetch: refetchGearAllowances } = useReadContracts({
    contracts: gearAllowanceContracts as Array<{
      address: `0x${string}`;
      abi: typeof gearTokenAbi;
      functionName: "allowance";
      args: readonly [`0x${string}`, `0x${string}`];
    }>,
    query: {
      enabled: isConnected && !!address && gearAllowanceContracts.length > 0,
    },
  });

  // Write contract hooks
  const { writeContractAsync, isPending: wagmiIsPending } = useWriteContract();
  const txService = useTransactionService(writeContractAsync);
  const [localIsPending, setLocalIsPending] = useState(false);
  const isPending = wagmiIsPending || localIsPending;

  // Wait for transaction receipt
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Format curve data
  const curves: BondingCurveData[] = useMemo(() => {
    return GEAR_SLOTS.map((slot, index) => {
      const curveAddress = curveAddresses[slot] as `0x${string}`;
      const price =
        priceResults?.[index]?.status === "success"
          ? (priceResults[index].result as bigint)
          : 0n;
      const supply =
        supplyResults?.[index]?.status === "success"
          ? (supplyResults[index].result as bigint)
          : 0n;

      return {
        slot,
        symbol: GEAR_TOKEN_SYMBOLS[slot],
        currentPrice: price,
        formattedPrice: formatUnits(price, DECIMALS),
        totalSupply: supply,
        formattedSupply: formatUnits(supply, DECIMALS),
        curveAddress,
      };
    });
  }, [priceResults, supplyResults, curveAddresses]);

  // Get VSC allowance for a specific bonding curve
  const vscAllowance = useCallback(
    (slot: GearSlot): bigint => {
      const index = GEAR_SLOTS.indexOf(slot);
      if (index === -1 || !allowanceResults?.[index]) return 0n;
      return allowanceResults[index]?.status === "success"
        ? (allowanceResults[index].result as bigint)
        : 0n;
    },
    [allowanceResults]
  );

  // Get gear token allowance for a specific bonding curve (needed for selling)
  const gearAllowance = useCallback(
    (slot: GearSlot): bigint => {
      const index = GEAR_SLOTS.indexOf(slot);
      if (index === -1 || !gearAllowanceResults?.[index]) return 0n;
      return gearAllowanceResults[index]?.status === "success"
        ? (gearAllowanceResults[index].result as bigint)
        : 0n;
    },
    [gearAllowanceResults]
  );

  // Refetch all data
  const refetch = useCallback(() => {
    refetchPrices();
    refetchSupply();
    refetchAllowances();
    refetchGearAllowances();
  }, [refetchPrices, refetchSupply, refetchAllowances, refetchGearAllowances]);

  // Get buy quote (how many tokens for given VSC amount)
  // TODO: Implement with direct readContract call for real-time quotes
  const getBuyQuote = useCallback(
    async (slot: GearSlot, _vscAmount: string): Promise<{ tokensOut: bigint; fee: bigint } | null> => {
      const curveAddress = curveAddresses[slot];
      if (!curveAddress) return null;
      // For now, return null - UI can show current price as estimate
      return null;
    },
    [curveAddresses]
  );

  // Get sell quote (how much VSC for given token amount)
  // TODO: Implement with direct readContract call for real-time quotes
  const getSellQuote = useCallback(
    async (slot: GearSlot, _tokenAmount: string): Promise<{ vscOut: bigint; fee: bigint } | null> => {
      const curveAddress = curveAddresses[slot];
      if (!curveAddress) return null;
      // For now, return null - UI can show current price as estimate
      return null;
    },
    [curveAddresses]
  );

  // Approve VSC for bonding curve
  const approveVsc = useCallback(
    async (slot: GearSlot, amount: string) => {
      if (!vscTokenAddress) throw new Error("VSC token not configured");
      const curveAddress = curveAddresses[slot];
      if (!curveAddress) throw new Error("Bonding curve not configured");

      const parsedAmount = parseUnits(amount, DECIMALS);

      try {
        setLocalIsPending(true);
        const hash = await txService.writeContract({
          address: vscTokenAddress,
          abi: vscTokenAbi,
          functionName: "approve",
          args: [curveAddress, parsedAmount],
        });
        setTxHash(hash);
        refetch();
      } finally {
        setLocalIsPending(false);
      }
    },
    [vscTokenAddress, curveAddresses, txService, refetch]
  );

  // Approve gear token for bonding curve (needed for selling)
  const approveGear = useCallback(
    async (slot: GearSlot, amount: string) => {
      const gearTokenAddress = gearAddresses[slot];
      if (!gearTokenAddress) throw new Error("Gear token not configured");
      const curveAddress = curveAddresses[slot];
      if (!curveAddress) throw new Error("Bonding curve not configured");

      const parsedAmount = parseUnits(amount, DECIMALS);

      try {
        setLocalIsPending(true);
        const hash = await txService.writeContract({
          address: gearTokenAddress,
          abi: gearTokenAbi,
          functionName: "approve",
          args: [curveAddress, parsedAmount],
        });
        setTxHash(hash);
        refetch();
      } finally {
        setLocalIsPending(false);
      }
    },
    [gearAddresses, curveAddresses, txService, refetch]
  );

  // Buy gear tokens with VSC
  const buy = useCallback(
    async (slot: GearSlot, vscAmount: string, minTokensOut: string) => {
      const curveAddress = curveAddresses[slot];
      if (!curveAddress) throw new Error("Bonding curve not configured");

      const parsedVsc = parseUnits(vscAmount, DECIMALS);
      const parsedMinOut = parseUnits(minTokensOut, DECIMALS);

      try {
        setLocalIsPending(true);
        const hash = await txService.writeContract({
          address: curveAddress,
          abi: bondingCurveAbi,
          functionName: "buy",
          args: [parsedVsc, parsedMinOut],
        });
        setTxHash(hash);
        refetch();
      } finally {
        setLocalIsPending(false);
      }
    },
    [curveAddresses, txService, refetch]
  );

  // Sell gear tokens for VSC
  const sell = useCallback(
    async (slot: GearSlot, tokenAmount: string, minVscOut: string) => {
      const curveAddress = curveAddresses[slot];
      if (!curveAddress) throw new Error("Bonding curve not configured");

      const parsedTokens = parseUnits(tokenAmount, DECIMALS);
      const parsedMinOut = parseUnits(minVscOut, DECIMALS);

      try {
        setLocalIsPending(true);
        const hash = await txService.writeContract({
          address: curveAddress,
          abi: bondingCurveAbi,
          functionName: "sell",
          args: [parsedTokens, parsedMinOut],
        });
        setTxHash(hash);
        refetch();
      } finally {
        setLocalIsPending(false);
      }
    },
    [curveAddresses, txService, refetch]
  );

  return {
    curves,
    isLoading: pricesLoading,
    error: pricesError as Error | null,
    refetch,
    getBuyQuote,
    getSellQuote,
    vscAllowance,
    gearAllowance,
    approveVsc,
    approveGear,
    buy,
    sell,
    isPending,
    isConfirming,
    txHash,
  };
}
