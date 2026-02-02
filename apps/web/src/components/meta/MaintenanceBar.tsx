import { useState } from "react";
import type { MaintenanceData } from "@/hooks/useMaintenancePool";

interface MaintenanceBarProps {
  data: MaintenanceData | null;
  onDeposit: (amount: string) => Promise<void>;
  onWithdraw: (amount: string) => Promise<void>;
  onApprove: (amount: string) => Promise<void>;
  isPending: boolean;
  disabled?: boolean;
}

export function MaintenanceBar({
  data,
  onDeposit,
  onWithdraw,
  onApprove,
  isPending,
  disabled = false,
}: MaintenanceBarProps) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔧</span>
            <span className="font-bold text-white">Maintenance Pool</span>
          </div>
          <span className="text-gray-400">Connect wallet to view</span>
        </div>
      </div>
    );
  }

  const parsedAmount = parseFloat(amount) || 0;
  const needsApproval =
    mode === "deposit" &&
    parsedAmount > 0 &&
    data.allowance < BigInt(Math.floor(parsedAmount * 1e18));

  const maxAmount =
    mode === "deposit"
      ? parseFloat(data.formattedWalletBalance)
      : parseFloat(data.formattedBalance);

  const handleAction = async () => {
    if (!amount || parsedAmount <= 0) return;

    try {
      if (needsApproval) {
        await onApprove(amount);
      } else if (mode === "deposit") {
        await onDeposit(amount);
        setAmount("");
      } else {
        await onWithdraw(amount);
        setAmount("");
      }
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  const handleMax = () => {
    setAmount(maxAmount.toString());
  };

  // Calculate progress bar width (capped at 100%)
  const progressWidth = Math.min(data.percentage, 100);
  const isHealthy = data.percentage >= 100;

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔧</span>
          <div className="text-left">
            <h3 className="font-bold text-white">Maintenance Pool</h3>
            <p className="text-xs text-gray-400">
              {isHealthy ? "+50% power bonus active" : "Deposit VSC for power bonus"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isHealthy ? "bg-green-500 animate-pulse" : "bg-yellow-500"
              }`}
            />
            <span className={`font-medium ${isHealthy ? "text-green-400" : "text-yellow-400"}`}>
              {data.percentage}%
            </span>
          </div>

          {/* Expand icon */}
          <span className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Progress bar */}
      <div className="px-4 pb-4">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isHealthy
                ? "bg-gradient-to-r from-green-500 to-green-400"
                : data.percentage >= 50
                  ? "bg-gradient-to-r from-yellow-500 to-yellow-400"
                  : "bg-gradient-to-r from-red-500 to-red-400"
            }`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>
            {Number(data.formattedBalance).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{" "}
            VSC
          </span>
          <span>
            {Number(data.formattedThreshold).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{" "}
            VSC required
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-700 pt-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-900 rounded p-3">
              <p className="text-xs text-gray-400">Deposited</p>
              <p className="font-bold text-white">
                {Number(data.formattedBalance).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="bg-gray-900 rounded p-3">
              <p className="text-xs text-gray-400">Threshold</p>
              <p className="font-bold text-cyan-400">
                {Number(data.formattedThreshold).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="bg-gray-900 rounded p-3">
              <p className="text-xs text-gray-400">Pending Decay</p>
              <p className="font-bold text-orange-400">
                -
                {Number(data.formattedPendingDecay).toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}
              </p>
            </div>
          </div>

          {/* Decay warning */}
          {parseFloat(data.formattedPendingDecay) > 0 && (
            <div className="bg-orange-900/30 border border-orange-600/50 rounded p-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-orange-400">⚠️</span>
                <span className="text-sm text-orange-200">
                  {Number(data.formattedPendingDecay).toFixed(4)} VSC will decay (1% per week)
                </span>
              </div>
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setMode("deposit")}
              className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                mode === "deposit"
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              Deposit
            </button>
            <button
              onClick={() => setMode("withdraw")}
              className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                mode === "withdraw"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              Withdraw
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
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 disabled:opacity-50"
              >
                MAX
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Available:{" "}
              {mode === "deposit"
                ? Number(data.formattedWalletBalance).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : Number(data.formattedBalance).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{" "}
              VSC
            </p>
          </div>

          {/* Action button */}
          <button
            onClick={handleAction}
            disabled={disabled || isPending || parsedAmount <= 0 || parsedAmount > maxAmount}
            className={`w-full py-2.5 rounded font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === "deposit"
                ? needsApproval
                  ? "bg-yellow-600 hover:bg-yellow-500 text-black"
                  : "bg-green-600 hover:bg-green-500 text-white"
                : "bg-orange-600 hover:bg-orange-500 text-white"
            }`}
          >
            {isPending
              ? "Processing..."
              : needsApproval
                ? "Approve VSC"
                : mode === "deposit"
                  ? "Deposit VSC"
                  : "Withdraw VSC"}
          </button>

          {/* Info text */}
          <p className="text-xs text-gray-500 mt-3 text-center">
            {isHealthy
              ? "Maintain 100%+ to keep your +50% power bonus active"
              : "Deposit more VSC to reach 100% and activate +50% power bonus"}
          </p>
        </div>
      )}
    </div>
  );
}
