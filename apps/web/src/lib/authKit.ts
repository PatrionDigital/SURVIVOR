/**
 * AuthKit configuration for Sign In With Farcaster (SIWF)
 * Used for browser-based authentication when not running as a Mini App
 */
export const authKitConfig = {
  rpcUrl: import.meta.env.VITE_OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
  domain: import.meta.env.VITE_APP_DOMAIN || (typeof window !== "undefined" ? window.location.host : "localhost"),
  siweUri: import.meta.env.VITE_SIWF_URI || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173"),
};
