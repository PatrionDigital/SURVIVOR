import { useState } from "react";
import type { GearSlot } from "@/hooks/useBondingCurve";
import { BondingCurveChart } from "./BondingCurveChart";

// Spinner component for loading states
function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

interface MarketCardProps {
  slot: GearSlot;
  symbol: string;
  currentPrice: bigint;
  formattedPrice: string;
  currentSupply: bigint;
  walletBalance: string;
  vscBalance: string;
  vscAllowance: bigint;
  // Actions
  onBuy: (slot: GearSlot, vscAmount: string, minTokensOut: string) => Promise<void>;
  onSell: (slot: GearSlot, tokenAmount: string, minVscOut: string) => Promise<void>;
  onApproveVsc: (slot: GearSlot, amount: string) => Promise<void>;
  onApproveGear: (slot: GearSlot, amount: string) => Promise<void>;
  gearAllowance: bigint;
  isPending: boolean;
  disabled?: boolean;
}

const SLOT_COLORS: Record<string, string> = {
  weapon: "#EF4444", // red
  armor: "#3B82F6", // blue
  power: "#A855F7", // purple
  gloves: "#EAB308", // yellow
  amulet: "#22C55E", // green
  boots: "#06B6D4", // cyan
};

const SLOT_ICONS: Record<string, string> = {
  weapon: "⚔️",
  armor: "🛡️",
  power: "💎",
  gloves: "🥊",
  amulet: "📿",
  boots: "👢",
};

type Mode = "buy" | "sell";

export function MarketCard({
  slot,
  symbol,
  currentPrice,
  formattedPrice,
  currentSupply,
  walletBalance,
  vscBalance,
  vscAllowance,
  onBuy,
  onSell,
  onApproveVsc,
  onApproveGear,
  gearAllowance,
  isPending,
  disabled = false,
}: MarketCardProps) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<Mode>("buy");
  const [slippage, setSlippage] = useState(2); // Default 2%
  const [showSlippageMenu, setShowSlippageMenu] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<"approve" | "trade" | null>(null);

  const color = SLOT_COLORS[slot];
  const icon = SLOT_ICONS[slot];

  const parsedAmount = parseFloat(amount) || 0;
  const parsedVscBalance = parseFloat(vscBalance || "0") || 0;
  const parsedWalletBalance = parseFloat(walletBalance || "0") || 0;
  const parsedCurrentPrice = parseFloat(formattedPrice || "0") || 0;

  // For buy mode: calculate estimated VSC cost from token amount
  const estimatedVscCost = mode === "buy" ? parsedAmount * parsedCurrentPrice : 0;
  const vscCostWithSlippage = estimatedVscCost * (1 + slippage / 100);

  // For sell mode: calculate estimated VSC return
  const estimatedVscReturn = mode === "sell" ? parsedAmount * parsedCurrentPrice : 0;
  const vscReturnWithSlippage = estimatedVscReturn * (1 - slippage / 100);

  // Determine if approval is needed
  const needsVscApproval =
    mode === "buy" &&
    vscCostWithSlippage > 0 &&
    vscAllowance < BigInt(Math.floor(vscCostWithSlippage * 1e18));

  const needsGearApproval =
    mode === "sell" && parsedAmount > 0 && gearAllowance < BigInt(Math.floor(parsedAmount * 1e18));

  // Check if user can afford
  const canAffordBuy = mode === "buy" ? vscCostWithSlippage <= parsedVscBalance : true;
  const canAffordSell = mode === "sell" ? parsedAmount <= parsedWalletBalance : true;

  // Max amount based on mode
  const maxAmount = (() => {
    if (mode === "buy" && parsedCurrentPrice > 0) {
      return parsedVscBalance / parsedCurrentPrice;
    }
    if (mode === "sell") {
      return parsedWalletBalance;
    }
    return 0;
  })();

  const handleAction = async () => {
    if (!amount || parsedAmount <= 0) {
      return;
    }

    setIsProcessing(true);
    try {
      if (mode === "buy") {
        // Use more aggressive slippage for bonding curves since price changes during purchase
        // The curve uses integral pricing, so actual cost may be higher than spot price estimate
        const slippageMultiplier = 1 + slippage / 100;
        const vscWithSlippage = estimatedVscCost * slippageMultiplier;
        // Use a much lower minTokensOut to account for integral pricing
        // TODO: Use contract's calculateBuyReturn for accurate quoting
        const minTokensWithSlippage = parsedAmount * (1 - slippage / 100) * 0.95; // Extra 5% buffer

        const vscAmountStr = vscWithSlippage.toFixed(18);
        const minTokensStr = minTokensWithSlippage.toFixed(18);

        if (needsVscApproval) {
          setProcessingAction("approve");
          await onApproveVsc(slot, vscAmountStr);
          // After approval succeeds, automatically proceed with the buy
          setProcessingAction("trade");
          await onBuy(slot, vscAmountStr, minTokensStr);
          setAmount("");
        } else {
          setProcessingAction("trade");
          await onBuy(slot, vscAmountStr, minTokensStr);
          setAmount("");
        }
      } else if (mode === "sell") {
        // For selling, also add buffer for integral pricing
        // TODO: Use contract's calculateSellReturn for accurate quoting
        const minVscWithSlippage = estimatedVscReturn * (1 - slippage / 100) * 0.95; // Extra 5% buffer
        const minVscStr = minVscWithSlippage.toFixed(18);

        if (needsGearApproval) {
          setProcessingAction("approve");
          await onApproveGear(slot, amount);
          // After approval succeeds, automatically proceed with the sell
          setProcessingAction("trade");
          await onSell(slot, amount, minVscStr);
          setAmount("");
        } else {
          setProcessingAction("trade");
          await onSell(slot, amount, minVscStr);
          setAmount("");
        }
      }
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleMax = () => {
    if (mode === "buy" && parsedCurrentPrice > 0) {
      const maxTokens = parsedVscBalance / parsedCurrentPrice;
      setAmount(maxTokens.toFixed(6));
    } else if (mode === "sell") {
      setAmount(walletBalance);
    }
  };

  const getButtonText = () => {
    if (isProcessing) {
      if (processingAction === "approve") return "Approving...";
      if (processingAction === "trade") return mode === "buy" ? "Buying..." : "Selling...";
      return "Processing...";
    }

    if (mode === "buy") {
      return needsVscApproval ? `Approve & Buy ${symbol}` : `Buy ${symbol}`;
    }
    return needsGearApproval ? `Approve & Sell ${symbol}` : `Sell ${symbol}`;
  };

  const getButtonColor = () => {
    if (mode === "buy") {
      return needsVscApproval
        ? "bg-yellow-600 hover:bg-yellow-500 text-black"
        : "bg-blue-600 hover:bg-blue-500 text-white";
    }
    return needsGearApproval
      ? "bg-yellow-600 hover:bg-yellow-500 text-black"
      : "bg-red-600 hover:bg-red-500 text-white";
  };

  const isButtonDisabled =
    disabled ||
    isPending ||
    isProcessing ||
    parsedAmount <= 0 ||
    parsedAmount > maxAmount + 0.000001 ||
    (mode === "buy" && !canAffordBuy) ||
    (mode === "sell" && !canAffordSell);

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="font-bold text-white capitalize">{slot}</h3>
            <span className="text-xs text-gray-400">{symbol}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-cyan-400">{parsedCurrentPrice.toFixed(4)} VSC</p>
          <p className="text-xs text-gray-400">Current Price</p>
        </div>
      </div>

      {/* Bonding curve chart */}
      <BondingCurveChart
        symbol={symbol}
        currentSupply={currentSupply}
        currentPrice={currentPrice}
        color={color}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 mt-4 mb-4">
        <div className="bg-gray-900 rounded p-2">
          <p className="text-xs text-gray-400">Your Balance</p>
          <p className="font-bold text-white truncate">
            {Number(walletBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} {symbol}
          </p>
        </div>
        <div className="bg-gray-900 rounded p-2">
          <p className="text-xs text-gray-400">VSC Balance</p>
          <p className="font-bold text-game-xp truncate">
            {parsedVscBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} VSC
          </p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode("buy")}
          className={`flex-1 py-2 rounded font-medium transition-colors ${
            mode === "buy"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setMode("sell")}
          className={`flex-1 py-2 rounded font-medium transition-colors ${
            mode === "sell"
              ? "bg-red-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          }`}
        >
          Sell
        </button>
      </div>

      {/* Amount input */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`${symbol} Amount`}
            disabled={disabled || isPending}
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 disabled:opacity-50"
          />
          <button
            onClick={handleMax}
            disabled={disabled || isPending}
            className="px-2 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 disabled:opacity-50"
          >
            MAX
          </button>
          {/* Slippage gear button */}
          <div className="relative">
            <button
              onClick={() => setShowSlippageMenu(!showSlippageMenu)}
              className="px-2 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
              title={`Slippage: ${slippage}%`}
            >
              <span className="text-sm">&#9881;</span>
            </button>
            {showSlippageMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSlippageMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg min-w-[140px]">
                  <p className="text-xs text-gray-400 mb-2">Slippage Tolerance</p>
                  <div className="flex flex-wrap gap-1">
                    {[0.5, 1, 2, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSlippage(s);
                          setShowSlippageMenu(false);
                        }}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          slippage === s
                            ? "bg-primary-600 text-white"
                            : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                        }`}
                      >
                        {s}%
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Available/Max display */}
        <p className="text-xs text-gray-400 mt-1">
          {mode === "buy"
            ? `Max: ~${maxAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol}`
            : `Available: ${Number(walletBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol}`}
        </p>

        {/* Cost/Return display */}
        {mode === "buy" && parsedAmount > 0 && (
          <p className={`text-xs mt-1 ${canAffordBuy ? "text-cyan-400" : "text-red-400"}`}>
            Cost: ~{vscCostWithSlippage.toLocaleString(undefined, { maximumFractionDigits: 2 })} /{" "}
            {parsedVscBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} VSC
            {!canAffordBuy && " (insufficient)"}
          </p>
        )}
        {mode === "sell" && parsedAmount > 0 && (
          <p className={`text-xs mt-1 ${canAffordSell ? "text-green-400" : "text-red-400"}`}>
            Return: ~{vscReturnWithSlippage.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
            VSC (min after slippage)
            {!canAffordSell && " (insufficient tokens)"}
          </p>
        )}
      </div>

      {/* Action button */}
      <button
        onClick={handleAction}
        disabled={isButtonDisabled}
        className={`w-full py-2 rounded font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${getButtonColor()}`}
      >
        {isProcessing && <Spinner />}
        {getButtonText()}
      </button>

      {/* Fee info */}
      <p className="text-xs text-gray-500 mt-2 text-center">
        {mode === "buy" ? "2% buy fee" : "3% sell fee"} | {slippage}% slippage tolerance
      </p>
    </div>
  );
}
