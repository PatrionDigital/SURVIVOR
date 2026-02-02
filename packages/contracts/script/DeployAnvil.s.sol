// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { VSCToken } from "../src/tokens/VSCToken.sol";
import { GearToken } from "../src/tokens/GearToken.sol";
import { GearStaking } from "../src/staking/GearStaking.sol";
import { MaintenancePool } from "../src/staking/MaintenancePool.sol";
import { RewardDistributor } from "../src/rewards/RewardDistributor.sol";
import { ERC20BondingCurve } from "../src/bonding/ERC20BondingCurve.sol";

/**
 * @title DeployAnvil
 * @notice Deployment script for local Anvil testing
 * @dev Deploys all contracts needed for local development with test allocations
 *
 * Usage:
 *   forge script script/DeployAnvil.s.sol --rpc-url http://localhost:8545 --broadcast
 *
 * Uses Anvil's default accounts:
 * - Account 0 (deployer): 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
 * - Account 1 (test user): 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
 */
contract DeployAnvil is Script {
    // Anvil default accounts
    address constant DEPLOYER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address constant TEST_USER = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    // Deployed contracts
    VSCToken public vscToken;
    GearToken[6] public gearTokens;
    ERC20BondingCurve[6] public bondingCurves;
    GearStaking public gearStaking;
    MaintenancePool public maintenancePool;
    RewardDistributor public rewardDistributor;

    // Gear metadata
    string[6] public gearNames =
        ["Weapon Core", "Armor Plate", "Power Belt", "Combat Gloves", "Amulet", "Swift Boots"];
    string[6] public gearSymbols = ["WEAPON", "ARMOR", "POWER", "GLOVES", "AMULET", "BOOTS"];

    function run() public {
        // Use Anvil's first default private key
        uint256 deployerPrivateKey =
            0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        console.log("=== Anvil Local Deployment ===");
        console.log("Deployer:", DEPLOYER);
        console.log("Test User:", TEST_USER);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy VSCToken
        console.log("1. Deploying VSCToken...");
        vscToken = new VSCToken(DEPLOYER);
        console.log("   VSCToken:", address(vscToken));

        // 2. Deploy GearTokens
        console.log("2. Deploying GearTokens...");
        address[6] memory gearTokenAddresses;
        for (uint256 i = 0; i < 6; i++) {
            gearTokens[i] = new GearToken(gearNames[i], gearSymbols[i], DEPLOYER);
            gearTokenAddresses[i] = address(gearTokens[i]);
            console.log("  ", gearSymbols[i], ":", address(gearTokens[i]));
        }

        // 3. Deploy Bonding Curves (one per gear token)
        console.log("3. Deploying BondingCurves...");
        for (uint256 i = 0; i < 6; i++) {
            bondingCurves[i] = new ERC20BondingCurve(
                address(vscToken), // base token (VSC)
                gearTokenAddresses[i], // gear token
                DEPLOYER, // treasury (deployer for testing)
                DEPLOYER // owner
            );
            console.log("  ", gearSymbols[i], "Curve:", address(bondingCurves[i]));
        }

        // 4. Set bonding curves as minters for gear tokens
        console.log("4. Setting bonding curves as minters...");
        for (uint256 i = 0; i < 6; i++) {
            gearTokens[i].setBondingCurve(address(bondingCurves[i]));
        }
        console.log("   Bonding curves set as minters");

        // 5. Deploy GearStaking
        console.log("5. Deploying GearStaking...");
        gearStaking = new GearStaking(DEPLOYER, gearTokenAddresses, DEPLOYER);
        console.log("   GearStaking:", address(gearStaking));

        // 6. Deploy MaintenancePool
        console.log("6. Deploying MaintenancePool...");
        maintenancePool = new MaintenancePool(DEPLOYER, address(vscToken));
        console.log("   MaintenancePool:", address(maintenancePool));

        // 7. Deploy RewardDistributor
        console.log("7. Deploying RewardDistributor...");
        rewardDistributor = new RewardDistributor(DEPLOYER, address(vscToken), DEPLOYER);
        console.log("   RewardDistributor:", address(rewardDistributor));

        // 8. Configure GearStaking with MaintenancePool
        console.log("8. Configuring contracts...");
        gearStaking.setMaintenancePool(address(maintenancePool));
        maintenancePool.setGearStaking(address(gearStaking));
        console.log("   Linked GearStaking <-> MaintenancePool");

        // 9. Mint tokens according to tokenomics allocation
        console.log("9. Minting tokens (tokenomics allocation)...");

        vscToken.addMinter(DEPLOYER);

        // Gameplay Emissions: 42% = 42B VSC to RewardDistributor
        // This is the source of all gameplay rewards players can claim
        vscToken.mint(address(rewardDistributor), 42_000_000_000 * 1e18);
        console.log("   Minted 42B VSC to RewardDistributor (42% gameplay emissions)");

        // Fund bonding curves with VSC liquidity for sell operations
        // Each curve gets 100M VSC to allow users to sell tokens back
        for (uint256 i = 0; i < 6; i++) {
            vscToken.mint(address(bondingCurves[i]), 100_000_000 * 1e18);
        }
        console.log("   Funded each bonding curve with 100M VSC liquidity");

        // NOTE: No VSC is minted to test user at TGE
        // Players earn VSC through gameplay rewards only
        console.log("   Players earn VSC through gameplay (no TGE allocation)");

        // NOTE: Gear tokens are NOT pre-minted - users buy from bonding curve at low prices
        // Initial price starts at 1 VSC per token and grows quadratically with supply
        console.log("   Gear tokens available via bonding curve (starting price: 1 VSC)");

        vm.stopBroadcast();

        // Output summary for frontend config
        console.log("");
        console.log("=== Contract Addresses (for .env.local) ===");
        console.log("");
        console.log("VITE_VSC_TOKEN_ADDRESS=", address(vscToken));
        console.log("VITE_GEAR_STAKING_ADDRESS=", address(gearStaking));
        console.log("VITE_MAINTENANCE_POOL_ADDRESS=", address(maintenancePool));
        console.log("VITE_REWARD_DISTRIBUTOR_ADDRESS=", address(rewardDistributor));
        console.log("");
        console.log("# Gear Token Addresses");
        console.log("VITE_WEAPON_TOKEN_ADDRESS=", address(gearTokens[0]));
        console.log("VITE_ARMOR_TOKEN_ADDRESS=", address(gearTokens[1]));
        console.log("VITE_POWER_TOKEN_ADDRESS=", address(gearTokens[2]));
        console.log("VITE_GLOVES_TOKEN_ADDRESS=", address(gearTokens[3]));
        console.log("VITE_AMULET_TOKEN_ADDRESS=", address(gearTokens[4]));
        console.log("VITE_BOOTS_TOKEN_ADDRESS=", address(gearTokens[5]));
        console.log("");
        console.log("# Bonding Curve Addresses");
        console.log("WEAPON_CURVE=", address(bondingCurves[0]));
        console.log("ARMOR_CURVE=", address(bondingCurves[1]));
        console.log("POWER_CURVE=", address(bondingCurves[2]));
        console.log("GLOVES_CURVE=", address(bondingCurves[3]));
        console.log("AMULET_CURVE=", address(bondingCurves[4]));
        console.log("BOOTS_CURVE=", address(bondingCurves[5]));
        console.log("");
        console.log("=== Deployment Complete ===");
    }
}
