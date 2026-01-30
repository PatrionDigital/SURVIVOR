// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";

/**
 * @title DeployNFTs
 * @notice Deployment script for NFT contracts
 * @dev Deploys GlobalUpgradeNFT (ERC-1155) and EarlyAdopterNFT (ERC-721)
 *
 * GlobalUpgradeNFT (ERC-1155):
 * - Permanent upgrades purchasable with VSC
 * - Multiple tiers with increasing costs
 * - Affects all game sessions
 * - Examples: +5% base damage, +10% XP gain
 *
 * EarlyAdopterNFT (ERC-721):
 * - Limited edition badges for early players
 * - Airdropped to qualifying wallets
 * - Cosmetic + minor stat bonuses
 * - Non-transferable (soulbound)
 *
 * Usage:
 *   forge script script/DeployNFTs.s.sol --rpc-url <RPC_URL> --broadcast --verify
 */
contract DeployNFTs is Script {
    // Contract addresses
    address public globalUpgradeNFT;
    address public earlyAdopterNFT;

    function setUp() public { }

    function run() public {
        // Load configuration
        address vscToken = vm.envAddress("VITE_VSC_TOKEN_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");

        console.log("Deploying NFT contracts...");
        console.log("VSCToken:", vscToken);
        console.log("Treasury:", treasury);

        vm.startBroadcast();

        // TODO: Deploy GlobalUpgradeNFT when implemented
        // globalUpgradeNFT = address(new GlobalUpgradeNFT(
        //     vscToken,
        //     treasury,
        //     "https://api.survivors.game/metadata/upgrades/"
        // ));

        // TODO: Deploy EarlyAdopterNFT when implemented
        // earlyAdopterNFT = address(new EarlyAdopterNFT(
        //     "Farcaster Survivors Early Adopter",
        //     "SURVIVOR-EA",
        //     "https://api.survivors.game/metadata/early-adopter/"
        // ));

        vm.stopBroadcast();

        console.log("\n=== Deployed NFT Contracts ===");
        console.log("GlobalUpgradeNFT:", globalUpgradeNFT);
        console.log("EarlyAdopterNFT:", earlyAdopterNFT);
    }
}
