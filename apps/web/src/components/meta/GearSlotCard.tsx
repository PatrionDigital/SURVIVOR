import { useState } from "react";
import type { GearSlotData, GearSlotIndex } from "@/hooks/useGearStaking";
import type { GearSlot } from "@/hooks/useBondingCurve";

// Spinner component for loading states
function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

interface GearSlotCardProps {
  slotData: GearSlotData;
  // Staking actions
  onStake: (slot: GearSlotIndex, amount: string) => Promise<void>;
  onUnstake: (slot: GearSlotIndex, amount: string) => Promise<void>;
  onApprove: (slot: GearSlotIndex, amount: string) => Promise<void>;
  // Bonding curve actions
  onBuy?: (slot: GearSlot, vscAmount: string, minTokensOut: string) => Promise<void>;
  onSell?: (slot: GearSlot, tokenAmount: string, minVscOut: string) => Promise<void>;
  onApproveVsc?: (slot: GearSlot, amount: string) => Promise<void>;
  // Bonding curve data
  currentPrice?: string;
  vscBalance?: string;
  vscAllowance?: bigint;
  isPending: boolean;
  disabled?: boolean;
}

const STAT_COLORS: Record<string, string> = {
  weapon: "text-red-400",
  armor: "text-blue-400",
  power: "text-purple-400",
  gloves: "text-yellow-400",
  amulet: "text-green-400",
  boots: "text-cyan-400",
};

const SLOT_ICONS: Record<string, string> = {
  weapon: "⚔️",
  armor: "🛡️",
  power: "💎",
  gloves: "🥊",
  amulet: "📿",
  boots: "👢",
};

type Mode = "stake" | "unstake" | "buy" | "sell";

export function GearSlotCard({
  slotData,
  onStake,
  onUnstake,
  onApprove,
  onBuy,
  onSell,
  onApproveVsc,
  currentPrice,
  vscBalance,
  vscAllowance,
  isPending,
  disabled = false,
}: GearSlotCardProps) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<Mode>("stake");
  const [slippage, setSlippage] = useState(2); // Default 2% slippage
  const [showSlippageMenu, setShowSlippageMenu] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<"approve" | "action" | null>(null);

  const statColor = STAT_COLORS[slotData.slot];
  const icon = SLOT_ICONS[slotData.slot];

  const parsedAmount = parseFloat(amount) || 0;
  const parsedVscBalance = parseFloat(vscBalance || "0") || 0;
  const parsedCurrentPrice = parseFloat(currentPrice || "0") || 0;

  // For buy mode: calculate estimated VSC cost from token amount
  const estimatedVscCost = mode === "buy" ? parsedAmount * parsedCurrentPrice : 0;
  // VSC cost with slippage buffer
  const vscCostWithSlippage = estimatedVscCost * (1 + slippage / 100);

  // Determine if approval is needed based on mode
  const needsGearApproval =
    mode === "stake" &&
    parsedAmount > 0 &&
    slotData.allowance < BigInt(Math.floor(parsedAmount * 1e18));

  const needsVscApproval =
    mode === "buy" &&
    vscCostWithSlippage > 0 &&
    vscAllowance !== undefined &&
    vscAllowance < BigInt(Math.floor(vscCostWithSlippage * 1e18));

  // Check if user can afford the buy (with slippage)
  const canAffordBuy = mode === "buy" ? vscCostWithSlippage <= parsedVscBalance : true;

  // Max amount based on mode (for display and validation)
  // Use slightly higher tolerance to avoid precision issues
  const maxAmount = (() => {
    switch (mode) {
      case "stake":
      case "sell":
        // Add small buffer to account for float precision loss in validation
        return parseFloat(slotData.formattedWalletBalance) + 0.000001;
      case "unstake":
        return parseFloat(slotData.formattedStaked) + 0.000001;
      case "buy":
        // Max tokens that can be bought with available VSC
        if (parsedCurrentPrice > 0) {
          return parsedVscBalance / parsedCurrentPrice + 0.000001;
        }
        return 0;
      default:
        return 0;
    }
  })();

  const handleAction = async () => {
    if (!amount || parsedAmount <= 0) return;

    setIsProcessing(true);
    try {
      if (mode === "stake") {
        if (needsGearApproval) {
          setProcessingAction("approve");
          await onApprove(slotData.slotIndex, amount);
          // After approval succeeds, automatically proceed with the stake
          setProcessingAction("action");
          await onStake(slotData.slotIndex, amount);
          setAmount("");
        } else {
          setProcessingAction("action");
          await onStake(slotData.slotIndex, amount);
          setAmount("");
        }
      } else if (mode === "unstake") {
        setProcessingAction("action");
        await onUnstake(slotData.slotIndex, amount);
        setAmount("");
      } else if (mode === "buy" && onBuy && onApproveVsc) {
        // Apply slippage: spend more VSC (buffer), accept fewer tokens (tolerance)
        const slippageMultiplier = 1 + slippage / 100;
        const vscWithSlippage = estimatedVscCost * slippageMultiplier;
        const minTokensWithSlippage = parsedAmount * (1 - slippage / 100);

        // Limit decimal places to avoid parseUnits overflow (max 18 decimals)
        const vscAmountStr = vscWithSlippage.toFixed(18);
        const minTokensStr = minTokensWithSlippage.toFixed(18);

        if (needsVscApproval) {
          // Approve the VSC cost with slippage buffer
          setProcessingAction("approve");
          await onApproveVsc(slotData.slot as GearSlot, vscAmountStr);
          // After approval succeeds, automatically proceed with the buy
          setProcessingAction("action");
          await onBuy(slotData.slot as GearSlot, vscAmountStr, minTokensStr);
          setAmount("");
        } else {
          // Buy tokens: spend VSC with buffer, set minimum acceptable tokens
          setProcessingAction("action");
          await onBuy(slotData.slot as GearSlot, vscAmountStr, minTokensStr);
          setAmount("");
        }
      } else if (mode === "sell" && onSell) {
        // Calculate expected VSC and apply slippage tolerance
        const expectedVsc = parsedAmount * parsedCurrentPrice;
        const minVscWithSlippage = expectedVsc * (1 - slippage / 100);
        // Limit decimal places to avoid parseUnits overflow
        const minVscStr = minVscWithSlippage.toFixed(18);
        setProcessingAction("action");
        await onSell(slotData.slot as GearSlot, amount, minVscStr);
        setAmount("");
      }
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleMax = () => {
    // Use exact formatted string to avoid precision loss from parseFloat
    switch (mode) {
      case "stake":
      case "sell":
        setAmount(slotData.formattedWalletBalance);
        break;
      case "unstake":
        setAmount(slotData.formattedStaked);
        break;
      case "buy":
        // Calculate max tokens purchasable with available VSC
        if (parsedCurrentPrice > 0) {
          const maxTokens = parsedVscBalance / parsedCurrentPrice;
          setAmount(maxTokens.toFixed(6));
        } else {
          setAmount("0");
        }
        break;
      default:
        setAmount(maxAmount.toString());
    }
  };

  // Show trading mode only if bonding curve functions are provided
  const hasTradingMode = onBuy && onSell;

  const getButtonText = () => {
    if (isProcessing) {
      if (processingAction === "approve") return "Approving...";
      if (processingAction === "action") {
        switch (mode) {
          case "stake":
            return "Staking...";
          case "unstake":
            return "Unstaking...";
          case "buy":
            return "Buying...";
          case "sell":
            return "Selling...";
          default:
            return "Processing...";
        }
      }
      return "Processing...";
    }

    if (isPending) return "Processing...";

    switch (mode) {
      case "stake":
        return needsGearApproval ? `Approve & Stake ${slotData.symbol}` : `Stake ${slotData.symbol}`;
      case "unstake":
        return `Unstake ${slotData.symbol}`;
      case "buy":
        return needsVscApproval ? `Approve & Buy ${slotData.symbol}` : `Buy ${slotData.symbol}`;
      case "sell":
        return `Sell ${slotData.symbol}`;
      default:
        return "Action";
    }
  };

  const getButtonColor = () => {
    switch (mode) {
      case "stake":
        return needsGearApproval
          ? "bg-yellow-600 hover:bg-yellow-500 text-black"
          : "bg-green-600 hover:bg-green-500 text-white";
      case "unstake":
        return "bg-orange-600 hover:bg-orange-500 text-white";
      case "buy":
        return needsVscApproval
          ? "bg-yellow-600 hover:bg-yellow-500 text-black"
          : "bg-blue-600 hover:bg-blue-500 text-white";
      case "sell":
        return "bg-red-600 hover:bg-red-500 text-white";
      default:
        return "bg-gray-600 hover:bg-gray-500 text-white";
    }
  };

  const getAvailableLabel = () => {
    switch (mode) {
      case "stake":
      case "sell":
        return `Available: ${Number(slotData.formattedWalletBalance).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })} ${slotData.symbol}`;
      case "unstake":
        return `Staked: ${Number(slotData.formattedStaked).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })} ${slotData.symbol}`;
      case "buy":
        // Show max purchasable tokens
        const maxPurchasable = parsedCurrentPrice > 0 ? parsedVscBalance / parsedCurrentPrice : 0;
        return `Max: ~${maxPurchasable.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })} ${slotData.symbol}`;
      default:
        return "";
    }
  };

  return (
    <div
      className={`bg-gray-800 rounded-lg p-4 border-2 transition-colors ${
        slotData.tier > 0
          ? `border-opacity-50 ${slotData.tierColor.replace("text-", "border-")}`
          : "border-gray-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="font-bold text-white capitalize">{slotData.slot}</h3>
            <span className="text-xs text-gray-400">{slotData.symbol}</span>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-xs font-medium ${slotData.tierColor}`}>{slotData.tierName}</span>
          {currentPrice && (
            <p className="text-xs text-gray-400">{Number(currentPrice).toFixed(4)} VSC</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-gray-900 rounded p-2">
          <p className="text-xs text-gray-400">Staked</p>
          <p className="font-bold text-white truncate" title={slotData.formattedStaked}>
            {Number(slotData.formattedStaked).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="bg-gray-900 rounded p-2">
          <p className="text-xs text-gray-400">Power</p>
          <p className={`font-bold ${statColor}`}>
            +
            {Number(slotData.formattedPower).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setMode("stake")}
          className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
            mode === "stake"
              ? "bg-green-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          }`}
        >
          Stake
        </button>
        <button
          onClick={() => setMode("unstake")}
          className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
            mode === "unstake"
              ? "bg-orange-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          }`}
        >
          Unstake
        </button>
        {hasTradingMode && (
          <>
            <button
              onClick={() => setMode("buy")}
              className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                mode === "buy"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setMode("sell")}
              className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                mode === "sell"
                  ? "bg-red-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              Sell
            </button>
          </>
        )}
      </div>

      {/* Amount input */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Token Amount"
            disabled={disabled || isPending || isProcessing}
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 disabled:opacity-50"
          />
          <button
            onClick={handleMax}
            disabled={disabled || isPending || isProcessing}
            className="px-2 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 disabled:opacity-50"
          >
            MAX
          </button>
          {/* Slippage gear button for buy/sell modes */}
          {(mode === "buy" || mode === "sell") && (
            <div className="relative">
              <button
                onClick={() => setShowSlippageMenu(!showSlippageMenu)}
                className="px-2 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
                title={`Slippage: ${slippage}%`}
              >
                <span className="text-sm">&#9881;</span>
              </button>
              {/* Slippage dropdown overlay */}
              {showSlippageMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div className="fixed inset-0 z-10" onClick={() => setShowSlippageMenu(false)} />
                  {/* Dropdown menu */}
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
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">{getAvailableLabel()}</p>
        {/* VSC cost display for buy mode */}
        {mode === "buy" && parsedAmount > 0 && (
          <p className={`text-xs mt-1 ${canAffordBuy ? "text-cyan-400" : "text-red-400"}`}>
            Cost: ~{vscCostWithSlippage.toLocaleString(undefined, { maximumFractionDigits: 2 })} /{" "}
            {parsedVscBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} VSC
            {!canAffordBuy && " (insufficient)"}
          </p>
        )}
      </div>

      {/* Action button */}
      <button
        onClick={handleAction}
        disabled={
          disabled || isPending || isProcessing || parsedAmount <= 0 || parsedAmount > maxAmount || !canAffordBuy
        }
        className={`w-full py-2 rounded font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${getButtonColor()}`}
      >
        {isProcessing && <Spinner />}
        {getButtonText()}
      </button>

      {/* Fee warnings */}
      {mode === "stake" && (
        <p className="text-xs text-gray-500 mt-2 text-center">5% staking fee applies</p>
      )}
      {mode === "buy" && (
        <p className="text-xs text-gray-500 mt-2 text-center">2% buy fee applies</p>
      )}
      {mode === "sell" && (
        <p className="text-xs text-gray-500 mt-2 text-center">3% sell fee applies</p>
      )}
    </div>
  );
}
