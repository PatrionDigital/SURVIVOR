/**
 * Transaction Service Interface and Implementations
 *
 * Provides a unified interface for contract interactions that works with:
 * - Local Anvil development (direct signing with test private key)
 * - Production (wagmi's writeContractAsync)
 *
 * Usage in hooks:
 *   const txService = useTransactionService(writeContractAsync);
 *   const hash = await txService.writeContract({ address, abi, functionName, args });
 *
 * TODO: Remove AnvilTransactionService when moving to beta (Sepolia testing)
 */
import { createWalletClient, createPublicClient, http, type Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvilChain, isLocalDev } from "./wagmi";

/**
 * Parameters for writing to a contract
 */
export interface WriteContractParams {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
}

/**
 * Interface for transaction services
 * Implement this for different environments (Anvil, wagmi, etc.)
 */
export interface ITransactionService {
  /**
   * Write to a contract and return the transaction hash
   */
  writeContract(params: WriteContractParams): Promise<`0x${string}`>;

  /**
   * Check if this service can execute transactions
   */
  readonly canSign: boolean;
}

/**
 * Anvil Transaction Service - for local development
 * Signs transactions directly using the test private key
 */
class AnvilTransactionService implements ITransactionService {
  private walletClient;
  private publicClient;
  private account;

  // Anvil's second default wallet (test user with minted tokens)
  // Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  private static readonly ANVIL_PRIVATE_KEY =
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;

  constructor() {
    this.account = privateKeyToAccount(AnvilTransactionService.ANVIL_PRIVATE_KEY);
    this.walletClient = createWalletClient({
      account: this.account,
      chain: anvilChain,
      transport: http("http://localhost:8545"),
    });
    this.publicClient = createPublicClient({
      chain: anvilChain,
      transport: http("http://localhost:8545"),
    });
  }

  get canSign(): boolean {
    return true;
  }

  get address(): `0x${string}` {
    return this.account.address;
  }

  async writeContract(params: WriteContractParams): Promise<`0x${string}`> {
    const { address, abi, functionName, args = [] } = params;

    // Simulate first to check for errors
    const { request } = await this.publicClient.simulateContract({
      account: this.account,
      address,
      abi,
      functionName,
      args,
    });

    // Execute the transaction
    const hash = await this.walletClient.writeContract(request);

    // Wait for confirmation
    await this.publicClient.waitForTransactionReceipt({ hash });

    return hash;
  }
}

/**
 * Wagmi Transaction Service - for production
 * Wraps wagmi's writeContractAsync function
 */
class WagmiTransactionService implements ITransactionService {
  private writeContractAsync: (params: WriteContractParams) => Promise<`0x${string}`>;

  constructor(writeContractAsync: (params: WriteContractParams) => Promise<`0x${string}`>) {
    this.writeContractAsync = writeContractAsync;
  }

  get canSign(): boolean {
    return true;
  }

  async writeContract(params: WriteContractParams): Promise<`0x${string}`> {
    return this.writeContractAsync(params);
  }
}

// Singleton Anvil service instance (only created in local dev)
let anvilServiceInstance: AnvilTransactionService | null = null;

/**
 * Get the Anvil transaction service (local dev only)
 */
function getAnvilTransactionService(): AnvilTransactionService | null {
  if (!isLocalDev) return null;

  if (!anvilServiceInstance) {
    anvilServiceInstance = new AnvilTransactionService();
  }
  return anvilServiceInstance;
}

/**
 * React hook to create a transaction service
 *
 * Uses Anvil direct signing in local dev, wagmi's writeContractAsync in production.
 * This allows hooks to use the same code path regardless of environment.
 *
 * @param wagmiWriteContract - wagmi's writeContractAsync function (required in production)
 * @returns ITransactionService instance
 *
 * @example
 * const { writeContractAsync } = useWriteContract();
 * const txService = useTransactionService(writeContractAsync);
 *
 * const stake = async () => {
 *   const hash = await txService.writeContract({
 *     address: stakingAddress,
 *     abi: stakingAbi,
 *     functionName: 'stake',
 *     args: [slot, amount],
 *   });
 * };
 */
export function useTransactionService(
  wagmiWriteContract?: (params: WriteContractParams) => Promise<`0x${string}`>
): ITransactionService {
  // In local dev, always use Anvil direct signing
  if (isLocalDev) {
    const anvilService = getAnvilTransactionService();
    if (anvilService) {
      return anvilService;
    }
  }

  // In production, use wagmi
  if (!wagmiWriteContract) {
    throw new Error("wagmiWriteContract is required in production mode");
  }

  return new WagmiTransactionService(wagmiWriteContract);
}

export { isLocalDev };
