/**
 * GameOverScreen - Shows results when player dies
 *
 * Displays:
 * - Survival time
 * - Enemies killed
 * - Level reached
 * - Total XP earned
 * - VSC Reward (if earned)
 * - Play Again, Claim Reward, Share, and Quit buttons
 */
import { useState, useCallback } from "react";
import { formatUnits } from "viem";
import { useRewardDistributor, RewardType, RewardClaimData } from "@/hooks";

const DECIMALS = 18;

export interface RewardData {
  amount: string; // VSC reward amount in wei as string
  signature: `0x${string}`;
  nonce: string; // hex string
  deadline: number; // unix timestamp
}

export interface GameOverScreenProps {
  isOpen: boolean;
  survivalTime: number;
  enemiesKilled: number;
  levelReached: number;
  totalXP: number;
  rewardData?: RewardData | null;
  onPlayAgain: () => void;
  onShare: () => void;
  onQuit: () => void;
  onRewardClaimed?: () => void;
}

/**
 * Format seconds as mm:ss
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format VSC amount for display
 */
function formatVSC(weiAmount: string): string {
  try {
    const formatted = formatUnits(BigInt(weiAmount), DECIMALS);
    // Round to 2 decimal places for display
    const num = parseFloat(formatted);
    if (num >= 1000) {
      return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return "0";
  }
}

export function GameOverScreen({
  isOpen,
  survivalTime,
  enemiesKilled,
  levelReached,
  totalXP,
  rewardData,
  onPlayAgain,
  onShare,
  onQuit,
  onRewardClaimed,
}: GameOverScreenProps) {
  const [claimStatus, setClaimStatus] = useState<"idle" | "claiming" | "success" | "error">("idle");
  const [claimErrorMsg, setClaimErrorMsg] = useState<string | null>(null);

  const { claim, isPending, isConfirming, canClaim, cooldownRemaining, remainingAllowance } =
    useRewardDistributor();

  const hasReward = rewardData && BigInt(rewardData.amount) > 0n;
  const isClaimButtonDisabled =
    !hasReward ||
    claimStatus === "claiming" ||
    claimStatus === "success" ||
    isPending ||
    isConfirming;

  // Check if signature is a placeholder (all zeros)
  const isPlaceholderSignature =
    rewardData?.signature === (("0x" + "0".repeat(130)) as `0x${string}`);

  const handleClaim = useCallback(async () => {
    if (!rewardData || !hasReward) return;

    // Check if it's a placeholder signature
    if (isPlaceholderSignature) {
      setClaimStatus("error");
      setClaimErrorMsg("Reward signing not yet implemented on backend");
      return;
    }

    // Check contract-level eligibility
    if (!canClaim) {
      if (cooldownRemaining > 0) {
        setClaimStatus("error");
        setClaimErrorMsg(`Please wait ${cooldownRemaining}s before claiming again`);
        return;
      }
      if (remainingAllowance === 0n) {
        setClaimStatus("error");
        setClaimErrorMsg("Daily claim limit reached");
        return;
      }
      setClaimStatus("error");
      setClaimErrorMsg("Cannot claim at this time");
      return;
    }

    setClaimStatus("claiming");
    setClaimErrorMsg(null);

    try {
      const claimData: RewardClaimData = {
        amount: BigInt(rewardData.amount),
        rewardType: RewardType.GAMEPLAY,
        nonce: BigInt(rewardData.nonce),
        expiry: rewardData.deadline,
        signature: rewardData.signature,
      };

      await claim(claimData);
      setClaimStatus("success");
      onRewardClaimed?.();
    } catch (err) {
      setClaimStatus("error");
      setClaimErrorMsg(err instanceof Error ? err.message : "Failed to claim reward");
    }
  }, [
    rewardData,
    hasReward,
    isPlaceholderSignature,
    canClaim,
    cooldownRemaining,
    remainingAllowance,
    claim,
    onRewardClaimed,
  ]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game Over"
      className="absolute inset-0 flex items-center justify-center bg-black/90 z-50"
    >
      <div className="bg-gray-900/95 rounded-2xl border border-gray-700 p-8 min-w-[350px] max-w-[450px] shadow-2xl">
        {/* Title */}
        <h2 className="text-4xl font-bold text-red-500 text-center mb-8">Game Over</h2>

        {/* Stats */}
        <div className="space-y-4 mb-6">
          {/* Survival Time */}
          <div className="flex justify-between items-center bg-gray-800/50 rounded-lg p-3">
            <span className="text-gray-400 flex items-center gap-2">
              <span>⏱️</span> Survival Time
            </span>
            <span className="text-white font-mono text-xl">{formatTime(survivalTime)}</span>
          </div>

          {/* Enemies Killed */}
          <div className="flex justify-between items-center bg-gray-800/50 rounded-lg p-3">
            <span className="text-gray-400 flex items-center gap-2">
              <span>⚔️</span> Enemies Killed
            </span>
            <span className="text-yellow-400 font-mono text-xl">{enemiesKilled}</span>
          </div>

          {/* Level Reached */}
          <div className="flex justify-between items-center bg-gray-800/50 rounded-lg p-3">
            <span className="text-gray-400 flex items-center gap-2">
              <span>⭐</span> Level Reached
            </span>
            <span className="text-green-400 font-mono text-xl">{levelReached}</span>
          </div>

          {/* Total XP */}
          <div className="flex justify-between items-center bg-gray-800/50 rounded-lg p-3">
            <span className="text-gray-400 flex items-center gap-2">
              <span>✨</span> Total XP
            </span>
            <span className="text-cyan-400 font-mono text-xl">{formatNumber(totalXP)}</span>
          </div>
        </div>

        {/* VSC Reward Section */}
        {hasReward && (
          <div className="mb-6">
            <div className="flex justify-between items-center bg-gradient-to-r from-amber-900/50 to-yellow-900/50 rounded-lg p-4 border border-amber-600/30">
              <span className="text-amber-300 flex items-center gap-2 font-semibold">
                <span>💰</span> VSC Earned
              </span>
              <span className="text-amber-400 font-mono text-2xl font-bold">
                {formatVSC(rewardData!.amount)}
              </span>
            </div>

            {/* Claim Status */}
            {claimStatus === "success" && (
              <div className="mt-2 text-green-400 text-sm text-center">
                Reward claimed successfully!
              </div>
            )}
            {claimStatus === "error" && claimErrorMsg && (
              <div className="mt-2 text-red-400 text-sm text-center">{claimErrorMsg}</div>
            )}
            {(isPending || isConfirming) && (
              <div className="mt-2 text-blue-400 text-sm text-center">
                {isPending ? "Waiting for signature..." : "Confirming transaction..."}
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          {/* Claim Reward Button (only if there's a reward and not yet claimed) */}
          {hasReward && claimStatus !== "success" && (
            <button
              onClick={handleClaim}
              disabled={isClaimButtonDisabled}
              className={`w-full py-3 px-6 font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 ${
                isClaimButtonDisabled
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-amber-600 hover:bg-amber-500 text-white focus:ring-amber-400"
              }`}
            >
              {isPending || isConfirming
                ? "Claiming..."
                : `Claim ${formatVSC(rewardData!.amount)} VSC`}
            </button>
          )}

          <button
            onClick={onPlayAgain}
            className="w-full py-3 px-6 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            Play Again
          </button>
          <button
            onClick={onShare}
            className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            Share to Farcaster
          </button>
          <button
            onClick={onQuit}
            className="w-full py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Quit
          </button>
        </div>
      </div>
    </div>
  );
}
