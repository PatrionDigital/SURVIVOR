// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { RewardDistributor } from "../src/rewards/RewardDistributor.sol";

/**
 * @title DeployRewards
 * @notice Deployment script for RewardDistributor contract
 * @dev Run after Deploy.s.sol — requires VSCToken address in env
 *
 * Usage:
 *   forge script script/DeployRewards.s.sol --rpc-url <RPC_URL> --broadcast
 */
contract DeployRewards is Script {
    function setUp() public { }

    function run() public {
        address vscToken = vm.envAddress("VITE_VSC_TOKEN_ADDRESS");
        address rewardSigner = vm.envAddress("REWARD_SIGNER_ADDRESS");
        address deployer = msg.sender;

        console.log("=== Deploying RewardDistributor ===");
        console.log("Deployer:", deployer);
        console.log("VSCToken:", vscToken);
        console.log("Reward Signer:", rewardSigner);

        vm.startBroadcast();

        RewardDistributor rewardDistributor = new RewardDistributor(deployer, vscToken, rewardSigner);
        console.log("RewardDistributor deployed at:", address(rewardDistributor));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Rewards Deployment Complete ===");
        console.log("RewardDistributor:", address(rewardDistributor));
    }
}
