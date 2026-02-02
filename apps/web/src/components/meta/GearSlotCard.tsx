import { useState } from "react";
import type { GearSlotData, GearSlotIndex } from "@/hooks/useGearStaking";

interface GearSlotCardProps {
  slotData: GearSlotData;
  onStake: (slot: GearSlotIndex, amount: string) => Promise<void>;
  onUnstake: (slot: GearSlotIndex, amount: string) => Promise<void>;
  onApprove: (slot: GearSlotIndex, amount: string) => Promise<void>;
  isPending: boolean;
  disabled?: boolean;
}

const STAT_NAMES: Record<string, string> = {
  weapon: "Damage",
  armor: "Defense",
  power: "AoE",
  gloves: "Attack Speed",
  amulet: "XP Gain",
  boots: "Move Speed",
};

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

export function GearSlotCard({
  slotData,
  onStake,
  onUnstake,
  onApprove,
  isPending,
  disabled = false,
}: GearSlotCardProps) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"stake" | "unstake">("stake");

  const statName = STAT_NAMES[slotData.slot];
  const statColor = STAT_COLORS[slotData.slot];
  const icon = SLOT_ICONS[slotData.slot];

  const parsedAmount = parseFloat(amount) || 0;
  const needsApproval =
    mode === "stake" &&
    parsedAmount > 0 &&
    slotData.allowance < BigInt(Math.floor(parsedAmount * 1e18));

  const maxAmount =
    mode === "stake"
      ? parseFloat(slotData.formattedWalletBalance)
      : parseFloat(slotData.formattedStaked);

  const handleAction = async () => {
    if (!amount || parsedAmount <= 0) return;

    try {
      if (needsApproval) {
        await onApprove(slotData.slotIndex, amount);
      } else if (mode === "stake") {
        await onStake(slotData.slotIndex, amount);
        setAmount("");
      } else {
        await onUnstake(slotData.slotIndex, amount);
        setAmount("");
      }
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  const handleMax = () => {
    setAmount(maxAmount.toString());
  };

  return (
    <div
      className={`bg-gray-800 rounded-lg p-4 border-2 transition-colors ${
        slotData.tier > 0 ? `border-opacity-50 ${slotData.tierColor.replace("text-", "border-")}` : "border-gray-700"
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
          <span className={`text-xs font-medium ${slotData.tierColor}`}>
            {slotData.tierName}
          </span>
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
            +{Number(slotData.formattedPower).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Bonus display */}
      <div className="mb-4 text-center">
        <span className={`text-sm ${statColor}`}>
          {statName} Bonus: +{Number(slotData.formattedPower).toFixed(2)}
        </span>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setMode("stake")}
          className={`flex-1 py-1 rounded text-sm font-medium transition-colors ${
            mode === "stake"
              ? "bg-green-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          }`}
        >
          Stake
        </button>
        <button
          onClick={() => setMode("unstake")}
          className={`flex-1 py-1 rounded text-sm font-medium transition-colors ${
            mode === "unstake"
              ? "bg-orange-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          }`}
        >
          Unstake
        </button>
      </div>

      {/* Amount input */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
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
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Available:{" "}
          {mode === "stake"
            ? Number(slotData.formattedWalletBalance).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
            : Number(slotData.formattedStaked).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
        </p>
      </div>

      {/* Action button */}
      <button
        onClick={handleAction}
        disabled={disabled || isPending || parsedAmount <= 0 || parsedAmount > maxAmount}
        className={`w-full py-2 rounded font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          mode === "stake"
            ? needsApproval
              ? "bg-yellow-600 hover:bg-yellow-500 text-black"
              : "bg-green-600 hover:bg-green-500 text-white"
            : "bg-orange-600 hover:bg-orange-500 text-white"
        }`}
      >
        {isPending
          ? "Processing..."
          : needsApproval
          ? `Approve ${slotData.symbol}`
          : mode === "stake"
          ? `Stake ${slotData.symbol}`
          : `Unstake ${slotData.symbol}`}
      </button>

      {/* Fee warning */}
      {mode === "stake" && (
        <p className="text-xs text-gray-500 mt-2 text-center">5% staking fee applies</p>
      )}
    </div>
  );
}
