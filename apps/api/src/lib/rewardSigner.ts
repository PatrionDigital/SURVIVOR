/**
 * Reward Signer - Signs reward claims for the RewardDistributor contract
 *
 * For local Anvil development, uses the deployer private key.
 * For production, should use a secure HSM or KMS-based signer.
 */
import { createWalletClient, http, encodePacked, keccak256, type Hex, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil, baseSepolia, base } from "viem/chains";

// Anvil deployer private key (first default account)
// This is a well-known test key - safe to use in dev only
const ANVIL_DEPLOYER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;

// Contract addresses per network
const REWARD_DISTRIBUTOR_ADDRESSES: Record<number, Address> = {
  31337: "0x59b670e9fA9D0A427751Af201D676719a970857b", // Anvil
  84532: "" as Address, // Base Sepolia - to be configured
  8453: "" as Address, // Base Mainnet - to be configured
};

// Reward types matching contract
export const RewardType = {
  GAMEPLAY: 0,
  DAILY_LOGIN: 1,
  ACHIEVEMENT: 2,
  SOCIAL: 3,
} as const;

export type RewardTypeValue = (typeof RewardType)[keyof typeof RewardType];

export interface SignRewardParams {
  player: Address;
  amount: bigint;
  rewardType: RewardTypeValue;
  nonce: bigint;
  expiry: number;
}

export interface SignedReward {
  amount: string;
  rewardType: number;
  nonce: string;
  expiry: number;
  signature: Hex;
}

/**
 * Determines if we're in local development mode
 */
function isLocalDev(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    (process.env.CHAIN_ID === "31337" || !process.env.CHAIN_ID)
  );
}

/**
 * Get the chain ID for the current environment
 */
function getChainId(): number {
  if (process.env.CHAIN_ID) {
    return parseInt(process.env.CHAIN_ID, 10);
  }
  // Default to Anvil in development
  return isLocalDev() ? 31337 : 84532;
}

/**
 * Get the chain configuration
 */
function getChain() {
  const chainId = getChainId();
  switch (chainId) {
    case 31337:
      return anvil;
    case 84532:
      return baseSepolia;
    case 8453:
      return base;
    default:
      return anvil;
  }
}

/**
 * Get the RewardDistributor contract address for the current chain
 */
function getRewardDistributorAddress(): Address {
  const chainId = getChainId();
  const address = REWARD_DISTRIBUTOR_ADDRESSES[chainId];
  if (!address) {
    throw new Error(`RewardDistributor address not configured for chain ${chainId}`);
  }
  return address;
}

/**
 * Get the signer private key
 * In production, this should come from a secure source (KMS, HSM, etc.)
 */
function getSignerPrivateKey(): Hex {
  // For local Anvil, use the deployer key
  if (isLocalDev()) {
    return ANVIL_DEPLOYER_PRIVATE_KEY;
  }

  // For production/testnet, require environment variable
  const privateKey = process.env.REWARD_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      "REWARD_SIGNER_PRIVATE_KEY environment variable required for non-local environments"
    );
  }
  return privateKey as Hex;
}

/**
 * Sign a reward claim for the RewardDistributor contract
 *
 * The signature covers:
 * - player address
 * - amount
 * - rewardType
 * - nonce
 * - expiry
 * - chainId
 * - contract address
 */
export async function signRewardClaim(params: SignRewardParams): Promise<SignedReward> {
  const { player, amount, rewardType, nonce, expiry } = params;

  const chainId = getChainId();
  const contractAddress = getRewardDistributorAddress();
  const privateKey = getSignerPrivateKey();

  // Create wallet client from private key
  const account = privateKeyToAccount(privateKey);
  const chain = getChain();

  const client = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  // Create the message hash matching the contract's encoding
  // keccak256(abi.encodePacked(player, amount, rewardType, nonce, expiry, chainId, contractAddress))
  const messageHash = keccak256(
    encodePacked(
      ["address", "uint256", "uint8", "uint256", "uint256", "uint256", "address"],
      [player, amount, rewardType, nonce, BigInt(expiry), BigInt(chainId), contractAddress]
    )
  );

  // Sign using eth_sign (produces EIP-191 signed message)
  const signature = await client.signMessage({
    message: { raw: messageHash },
  });

  return {
    amount: amount.toString(),
    rewardType,
    nonce: "0x" + nonce.toString(16),
    expiry,
    signature,
  };
}

/**
 * Generate a unique nonce for a reward claim
 * Combines timestamp and random bytes for uniqueness
 */
export function generateNonce(): bigint {
  const timestamp = BigInt(Date.now());
  const random = BigInt(Math.floor(Math.random() * 1_000_000));
  return (timestamp << 20n) | random;
}

/**
 * Calculate reward expiry (default: 1 hour from now)
 */
export function calculateExpiry(hoursFromNow: number = 1): number {
  return Math.floor(Date.now() / 1000) + hoursFromNow * 3600;
}
