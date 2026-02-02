/**
 * Contract address utilities for different environments
 * Automatically selects anvil addresses in local dev, testnet otherwise
 */
import { CONTRACT_ADDRESSES } from "@survivor/sdk";
import { isLocalDev } from "./wagmi";

/**
 * Get the current network's contract addresses
 * - In local dev with Anvil: returns anvil addresses
 * - Otherwise: returns testnet addresses
 */
export function getNetworkAddresses() {
  return isLocalDev ? CONTRACT_ADDRESSES.anvil : CONTRACT_ADDRESSES.testnet;
}

/**
 * Get a specific contract address for the current network
 */
export function getContractAddress<K extends keyof (typeof CONTRACT_ADDRESSES)["testnet"]>(
  contract: K
): (typeof CONTRACT_ADDRESSES)["testnet"][K] {
  const addresses = getNetworkAddresses();
  return addresses[contract];
}
