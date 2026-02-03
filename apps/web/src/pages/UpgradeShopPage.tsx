import { Link } from "react-router-dom";
import { useState } from "react";
import { useGlobalUpgrades, useWallet } from "@/hooks";
import type { UpgradeData } from "@/hooks";

// Upgrade card component
function UpgradeCard({
  upgrade,
  onPurchase,
  isPending,
}: {
  upgrade: UpgradeData;
  onPurchase: (upgradeType: number) => Promise<void>;
  isPending: boolean;
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async () => {
    try {
      setIsProcessing(true);
      await onPurchase(upgrade.type.id);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-primary-500/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-primary-400">{upgrade.type.name}</h3>
          <p className="text-sm text-gray-400 mt-1">{upgrade.type.description}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Owned</div>
          <div className="text-lg font-bold text-white">
            {upgrade.owned}/{upgrade.maxOwned}
          </div>
        </div>
      </div>

      {/* Benefit */}
      <div className="bg-gray-800/50 rounded px-3 py-2 mb-4">
        <div className="text-xs text-gray-400">Benefit</div>
        <div className="text-sm font-semibold text-green-400">{upgrade.type.benefit}</div>
      </div>

      {/* Cost and Purchase */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">Next Cost</div>
          <div className="text-lg font-bold text-game-xp">
            {upgrade.isMaxed ? "MAX" : `${Number(upgrade.formattedNextCost).toLocaleString()} $VSC`}
          </div>
        </div>
        <button
          onClick={handlePurchase}
          disabled={!upgrade.canAfford || upgrade.isMaxed || isPending || isProcessing}
          className={`px-6 py-2 rounded font-semibold transition-all ${
            upgrade.isMaxed
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : !upgrade.canAfford
                ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                : isPending || isProcessing
                  ? "bg-primary-600 text-white cursor-wait"
                  : "bg-primary-600 hover:bg-primary-500 text-white"
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
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
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing
            </span>
          ) : upgrade.isMaxed ? (
            "Maxed"
          ) : !upgrade.canAfford ? (
            "Insufficient $VSC"
          ) : (
            "Purchase"
          )}
        </button>
      </div>
    </div>
  );
}

export function UpgradeShopPage() {
  const { isConnected } = useWallet();
  const {
    upgrades,
    formattedVscBalance,
    needsApproval,
    isLoading,
    error,
    mint,
    approve,
    isPending,
    refetch,
  } = useGlobalUpgrades();

  const handlePurchase = async (upgradeType: number) => {
    // Check if approval needed
    const upgrade = upgrades?.find((u) => u.type.id === upgradeType);
    if (!upgrade) return;

    if (needsApproval) {
      // Approve a large amount to avoid repeated approvals
      await approve("1000000"); // 1M VSC
      // Wait for approval to be reflected
      await new Promise((resolve) => setTimeout(resolve, 2000));
      refetch();
    }

    await mint(upgradeType);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary-400">Upgrade Shop</h1>
          <p className="text-gray-400 mt-1">Purchase permanent stat upgrades with $VSC</p>
        </div>
        <Link to="/" className="text-gray-400 hover:text-white transition-colors font-semibold">
          Back
        </Link>
      </div>

      {/* Not connected state */}
      {!isConnected && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">Connect your wallet to view and purchase upgrades</p>
        </div>
      )}

      {/* Loading state */}
      {isConnected && isLoading && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">Loading upgrades...</p>
        </div>
      )}

      {/* Error state */}
      {isConnected && error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 mb-6">
          <p className="text-red-400">{error.message}</p>
          <button
            onClick={refetch}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main content */}
      {isConnected && upgrades && (
        <>
          {/* VSC Balance */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400">Your $VSC Balance</div>
                <div className="text-2xl font-bold text-game-xp">
                  {Number(formattedVscBalance).toLocaleString()} $VSC
                </div>
              </div>
              {needsApproval && (
                <div className="text-sm text-yellow-400">Approval needed to purchase upgrades</div>
              )}
            </div>
          </div>

          {/* Upgrade Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upgrades.map((upgrade) => (
              <UpgradeCard
                key={upgrade.type.id}
                upgrade={upgrade}
                onPurchase={handlePurchase}
                isPending={isPending}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
