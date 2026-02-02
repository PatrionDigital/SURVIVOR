import { http, createConfig } from "wagmi";
import type { Chain } from "viem";
import { base, baseSepolia } from "wagmi/chains";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { mock } from "wagmi/connectors";
import { privateKeyToAccount } from "viem/accounts";

// Detect local development environment
const isLocalDev = import.meta.env.DEV && import.meta.env.VITE_USE_ANVIL === "true";

// Anvil local chain definition
const anvilChain: Chain = {
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["http://localhost:8545"] },
  },
  testnet: true,
};

// Anvil's second default wallet (for testing)
// Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
const ANVIL_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const anvilAccount = privateKeyToAccount(ANVIL_PRIVATE_KEY);

// Create config based on environment
const chains = isLocalDev ? [anvilChain, baseSepolia, base] : [base, baseSepolia];

const transports = isLocalDev
  ? {
      [anvilChain.id]: http("http://localhost:8545"),
      [base.id]: http(),
      [baseSepolia.id]: http(),
    }
  : {
      [base.id]: http(),
      [baseSepolia.id]: http(),
    };

// Connectors based on environment
const connectors = isLocalDev
  ? [
      mock({
        accounts: [anvilAccount.address],
      }),
    ]
  : [farcasterMiniApp()];

export const config = createConfig({
  chains: chains as [Chain, ...Chain[]],
  transports,
  connectors,
});

// Export for use in hooks
export { isLocalDev, anvilAccount, anvilChain };

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
