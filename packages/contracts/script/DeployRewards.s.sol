// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";

/**
 * @title DeployRewards
 * @notice Deployment script for RewardDistributor contract
 * @dev Deploys the reward claiming system for game sessions
 *
 * RewardDistributor features:
 * - Backend-signed reward claims
 * - EIP-712 typed signatures for security
 * - Nonce-based replay protection
 * - Daily reward caps per player
 * - Deadline-based claim expiration
 *
 * Claim flow:
 * 1. Player completes game session
 * 2. Backend calculates reward and signs claim
 * 3. Player submits signature to claim VSC
 * 4. Contract verifies signature and transfers tokens
 *
 * Usage:
 *   forge script script/DeployRewards.s.sol --rpc-url <RPC_URL> --broadcast --verify
 */
contract DeployRewards is Script {
    // Contract addresses
    address public rewardDistributor;

    function setUp() public { }

    function run() public {
        // Load configuration
        address vscToken = vm.envAddress("VITE_VSC_TOKEN_ADDRESS");
        address rewardSigner = vm.envAddress("REWARD_SIGNER_ADDRESS");

        console.log("Deploying RewardDistributor...");
        console.log("VSCToken:", vscToken);
        console.log("Reward Signer:", rewardSigner);

        vm.startBroadcast();

        // TODO: Deploy RewardDistributor when implemented
        // rewardDistributor = address(new RewardDistributor(
        //     vscToken,
        //     rewardSigner,
        //     1_000_000 ether  // dailyCapPerPlayer (1M VSC)
        // ));

        vm.stopBroadcast();

        console.log("\n=== Deployed Rewards Contracts ===");
        console.log("RewardDistributor:", rewardDistributor);
    }
}
