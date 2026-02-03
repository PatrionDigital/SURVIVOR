import { Link } from "react-router-dom";
import { useCallback } from "react";
import { useBondingCurve, useWallet, useVSCToken, useGearTokens } from "@/hooks";
import type { GearSlot } from "@/hooks/useBondingCurve";
import { MarketCard } from "@/components/meta";

export function MarketPage() {
  const { isConnected } = useWallet();

  // Bonding curve data and actions
  const {
    curves,
    isLoading: curvesLoading,
    buy,
    sell,
    approveVsc,
    approveGear,
    vscAllowance,
    gearAllowance,
    isPending: curvePending,
  } = useBondingCurve();

  // VSC token balance
  const { formattedBalance: vscBalance, refetch: refetchVsc } = useVSCToken();

  // Gear token balances
  const { balances: gearBalances, getBalance, refetch: refetchGear } = useGearTokens();

  // Wrap buy/sell to refetch balances after transaction
  const handleBuy = useCallback(
    async (slot: GearSlot, vscAmount: string, minTokensOut: string) => {
      await buy(slot, vscAmount, minTokensOut);
      // Refetch balances after successful buy
      refetchVsc();
      refetchGear();
    },
    [buy, refetchVsc, refetchGear]
  );

  const handleSell = useCallback(
    async (slot: GearSlot, tokenAmount: string, minVscOut: string) => {
      await sell(slot, tokenAmount, minVscOut);
      // Refetch balances after successful sell
      refetchVsc();
      refetchGear();
    },
    [sell, refetchVsc, refetchGear]
  );

  const isLoading = curvesLoading;

  // Get wallet balance for a slot
  const getWalletBalance = (slot: string): string => {
    const balance = getBalance(slot as GearSlot);
    return balance?.formattedBalance || "0";
  };

  // Market stats
  const totalMarketCap = curves.reduce((acc, curve) => {
    const supply = Number(curve.formattedSupply);
    const price = Number(curve.formattedPrice);
    return acc + supply * price;
  }, 0);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-400">Gear Markets</h1>
          <p className="text-gray-400 text-sm mt-1">
            Trade gear tokens on bonding curves. Price increases with supply.
          </p>
        </div>
        <Link to="/" className="text-gray-400 hover:text-white transition-colors">
          Back
        </Link>
      </div>

      {/* Connection check */}
      {!isConnected ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">🔌</div>
          <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Connect your wallet to trade gear tokens</p>
        </div>
      ) : isLoading ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4 animate-bounce">⏳</div>
          <p className="text-gray-400">Loading market data...</p>
        </div>
      ) : (
        <>
          {/* Market overview */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-800/50 rounded-lg p-6 mb-6 border border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">VSC Balance</p>
                <p className="text-2xl font-bold text-game-xp">
                  {Number(vscBalance).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Markets</p>
                <p className="text-2xl font-bold text-white">6</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Your Holdings</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {gearBalances.filter((b) => b.balance > 0n).length} tokens
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Market Value</p>
                <p className="text-2xl font-bold text-white">
                  {totalMarketCap.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}{" "}
                  VSC
                </p>
              </div>
            </div>
          </div>

          {/* Market cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {curves.map((curve) => (
              <MarketCard
                key={curve.slot}
                slot={curve.slot}
                symbol={curve.symbol}
                currentPrice={curve.currentPrice}
                formattedPrice={curve.formattedPrice}
                currentSupply={curve.totalSupply}
                walletBalance={getWalletBalance(curve.slot)}
                vscBalance={vscBalance}
                vscAllowance={vscAllowance(curve.slot)}
                gearAllowance={gearAllowance(curve.slot)}
                onBuy={handleBuy}
                onSell={handleSell}
                onApproveVsc={approveVsc}
                onApproveGear={approveGear}
                isPending={curvePending}
              />
            ))}
          </div>

          {/* Info section */}
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold text-white mb-4">How Bonding Curves Work</h2>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div>
                <h3 className="font-medium text-cyan-400 mb-2">Price Formula</h3>
                <p className="text-gray-400 mb-2">
                  Price = 1 + (Supply<sup>2</sup> / 10<sup>22</sup>)
                </p>
                <p className="text-gray-400">
                  Price starts at 1 VSC and grows quadratically with supply.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-cyan-400 mb-2">Buying</h3>
                <p className="text-gray-400">
                  When you buy, new tokens are minted and the price increases. Early buyers get
                  lower prices. 2% fee applies.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-cyan-400 mb-2">Selling</h3>
                <p className="text-gray-400">
                  When you sell, tokens are burned and the price decreases. Selling returns VSC from
                  the curve. 3% fee applies.
                </p>
              </div>
            </div>
          </div>

          {/* Price examples */}
          <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Price Examples</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
              <div>
                <p className="text-gray-500">0 Supply</p>
                <p className="text-white">1.00 VSC</p>
              </div>
              <div>
                <p className="text-gray-500">1K Supply</p>
                <p className="text-white">1.01 VSC</p>
              </div>
              <div>
                <p className="text-gray-500">10K Supply</p>
                <p className="text-white">2.00 VSC</p>
              </div>
              <div>
                <p className="text-gray-500">100K Supply</p>
                <p className="text-white">101 VSC</p>
              </div>
              <div>
                <p className="text-gray-500">1M Supply</p>
                <p className="text-white">10,001 VSC</p>
              </div>
            </div>
          </div>

          {/* Fee info */}
          <div className="mt-4 text-center text-xs text-gray-500">
            <p>Buy: 2% fee (60% treasury / 40% burn) | Sell: 3% fee (60% treasury / 40% burn)</p>
          </div>
        </>
      )}
    </div>
  );
}
