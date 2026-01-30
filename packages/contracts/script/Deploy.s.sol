// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { VSCToken } from "../src/tokens/VSCToken.sol";
import { GearToken } from "../src/tokens/GearToken.sol";
import { ERC20BondingCurve } from "../src/bonding/ERC20BondingCurve.sol";

/**
 * @title Deploy
 * @notice Main deployment script for Farcaster Survivors contracts
 * @dev Orchestrates deployment of all contracts in the correct order
 *
 * Deployment order:
 * 1. VSCToken (primary currency)
 * 2. Mint initial VSC allocations (100B total supply)
 * 3. GearTokens (6 gear types: WEAPON, ARMOR, POWER, GLOVES, AMULET, BOOTS)
 * 4. Gear-VSC BondingCurves (6 trading AMMs for each gear type)
 * 5. Configure permissions
 *
 * Note: VSC is traded on external DEXs (Uniswap/Aerodrome), not a custom bonding curve.
 * Gear tokens use ERC20BondingCurve for mint/burn trading against VSC.
 *
 * Usage:
 *   forge script script/Deploy.s.sol --rpc-url <RPC_URL> --broadcast --verify
 *
 * Environment variables required:
 *   TREASURY_ADDRESS - Address to receive treasury fees and 24% allocation
 *   EMISSIONS_ADDRESS - Address for gameplay emissions (42% - RewardDistributor)
 *   TEAM_ADDRESS - Address for team allocation (24% - vesting contract)
 *   LIQUIDITY_ADDRESS - Address for DEX liquidity (6%)
 *   AIRDROP_ADDRESS - Address for airdrop distribution (4% - Merkle distributor)
 *
 * Note: Burn address is hardcoded as 0x...dEaD constant in bonding curves
 */
contract Deploy is Script {
    // ============ Constants ============
    uint256 public constant VSC_MAX_SUPPLY = 100_000_000_000 * 10 ** 18; // 100B tokens

    // Allocation percentages (in basis points for precision)
    uint256 public constant EMISSIONS_BPS = 4200; // 42%
    uint256 public constant TEAM_BPS = 2400; // 24%
    uint256 public constant TREASURY_BPS = 2400; // 24%
    uint256 public constant LIQUIDITY_BPS = 600; // 6%
    uint256 public constant AIRDROP_BPS = 400; // 4%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // Deployed contract instances
    VSCToken public vscToken;

    // Gear token instances
    GearToken public weaponToken;
    GearToken public armorToken;
    GearToken public powerToken;
    GearToken public glovesToken;
    GearToken public amuletToken;
    GearToken public bootsToken;

    // Gear token array for iteration
    GearToken[6] public gearTokens;

    // Gear-VSC bonding curves
    ERC20BondingCurve[6] public gearBondingCurves;

    // Gear token metadata
    string[6] public gearNames =
        ["Weapon Core", "Armor Plate", "Power Belt", "Combat Gloves", "Amulet", "Swift Boots"];
    string[6] public gearSymbols = ["WEAPON", "ARMOR", "POWER", "GLOVES", "AMULET", "BOOTS"];

    // Allocation addresses (loaded from env)
    address public emissionsAddress;
    address public teamAddress;
    address public treasuryAddress;
    address public liquidityAddress;
    address public airdropAddress;

    function setUp() public { }

    function run() public {
        // Load configuration from environment
        treasuryAddress = vm.envAddress("TREASURY_ADDRESS");
        emissionsAddress = vm.envAddress("EMISSIONS_ADDRESS");
        teamAddress = vm.envAddress("TEAM_ADDRESS");
        liquidityAddress = vm.envAddress("LIQUIDITY_ADDRESS");
        airdropAddress = vm.envAddress("AIRDROP_ADDRESS");
        address deployer = msg.sender;

        console.log("=== Farcaster Survivors Deployment ===");
        console.log("Deployer:", deployer);
        console.log("");
        console.log("Allocation Addresses:");
        console.log("  Emissions (42%):", emissionsAddress);
        console.log("  Team (24%):", teamAddress);
        console.log("  Treasury (24%):", treasuryAddress);
        console.log("  Liquidity (6%):", liquidityAddress);
        console.log("  Airdrop (4%):", airdropAddress);
        console.log("");

        vm.startBroadcast();

        // 1. Deploy VSCToken
        console.log("1. Deploying VSCToken...");
        vscToken = new VSCToken(deployer);
        console.log("   VSCToken deployed at:", address(vscToken));

        // 2. Mint initial VSC allocations
        console.log("2. Minting VSC allocations (100B total)...");
        _mintAllocations();

        // 3. Deploy GearTokens
        console.log("3. Deploying GearTokens...");
        for (uint256 i = 0; i < 6; i++) {
            gearTokens[i] = new GearToken(gearNames[i], gearSymbols[i], deployer);
            console.log("   ", gearSymbols[i], "deployed at:", address(gearTokens[i]));
        }

        // Assign to named variables for clarity
        weaponToken = gearTokens[0];
        armorToken = gearTokens[1];
        powerToken = gearTokens[2];
        glovesToken = gearTokens[3];
        amuletToken = gearTokens[4];
        bootsToken = gearTokens[5];

        // 4. Deploy Gear-VSC BondingCurves
        console.log("4. Deploying Gear-VSC BondingCurves...");
        for (uint256 i = 0; i < 6; i++) {
            gearBondingCurves[i] = new ERC20BondingCurve(
                address(vscToken), address(gearTokens[i]), treasuryAddress, deployer
            );
            console.log("   ", gearSymbols[i], "-VSC curve at:", address(gearBondingCurves[i]));
        }

        // 5. Configure permissions
        console.log("5. Configuring permissions...");

        // Set bonding curve for each GearToken
        for (uint256 i = 0; i < 6; i++) {
            gearTokens[i].setBondingCurve(address(gearBondingCurves[i]));
            console.log("   Set bonding curve for", gearSymbols[i]);
        }

        // Remove deployer as minter (was only needed for initial allocation)
        vscToken.removeMinter(deployer);
        console.log("   Removed deployer as VSCToken minter");

        vm.stopBroadcast();

        // Log summary
        _logDeploymentSummary();
    }

    /**
     * @notice Mint initial VSC token allocations
     * @dev Mints to all allocation addresses based on whitepaper percentages
     */
    function _mintAllocations() internal {
        // Add deployer as minter temporarily
        vscToken.addMinter(msg.sender);

        // Calculate allocations
        uint256 emissionsAllocation = (VSC_MAX_SUPPLY * EMISSIONS_BPS) / BPS_DENOMINATOR; // 42B
        uint256 teamAllocation = (VSC_MAX_SUPPLY * TEAM_BPS) / BPS_DENOMINATOR; // 24B
        uint256 treasuryAllocation = (VSC_MAX_SUPPLY * TREASURY_BPS) / BPS_DENOMINATOR; // 24B
        uint256 liquidityAllocation = (VSC_MAX_SUPPLY * LIQUIDITY_BPS) / BPS_DENOMINATOR; // 6B
        uint256 airdropAllocation = (VSC_MAX_SUPPLY * AIRDROP_BPS) / BPS_DENOMINATOR; // 4B

        // Mint to each allocation address
        vscToken.mint(emissionsAddress, emissionsAllocation);
        console.log("   Minted 42B VSC to Emissions");

        vscToken.mint(teamAddress, teamAllocation);
        console.log("   Minted 24B VSC to Team");

        vscToken.mint(treasuryAddress, treasuryAllocation);
        console.log("   Minted 24B VSC to Treasury");

        vscToken.mint(liquidityAddress, liquidityAllocation);
        console.log("   Minted 6B VSC to Liquidity");

        vscToken.mint(airdropAddress, airdropAllocation);
        console.log("   Minted 4B VSC to Airdrop");
    }

    function _logDeploymentSummary() internal view {
        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("");
        console.log("Tokens:");
        console.log("  VSCToken:", address(vscToken));
        console.log("  WEAPON:", address(weaponToken));
        console.log("  ARMOR:", address(armorToken));
        console.log("  POWER:", address(powerToken));
        console.log("  GLOVES:", address(glovesToken));
        console.log("  AMULET:", address(amuletToken));
        console.log("  BOOTS:", address(bootsToken));
        console.log("");
        console.log("VSC Allocations (100B total):");
        console.log("  Emissions (42B):", emissionsAddress);
        console.log("  Team (24B):", teamAddress);
        console.log("  Treasury (24B):", treasuryAddress);
        console.log("  Liquidity (6B):", liquidityAddress);
        console.log("  Airdrop (4B):", airdropAddress);
        console.log("");
        console.log("Gear-VSC Trading (bonding curves):");
        console.log("  WEAPON-VSC Curve:", address(gearBondingCurves[0]));
        console.log("  ARMOR-VSC Curve:", address(gearBondingCurves[1]));
        console.log("  POWER-VSC Curve:", address(gearBondingCurves[2]));
        console.log("  GLOVES-VSC Curve:", address(gearBondingCurves[3]));
        console.log("  AMULET-VSC Curve:", address(gearBondingCurves[4]));
        console.log("  BOOTS-VSC Curve:", address(gearBondingCurves[5]));
        console.log("");
        console.log("Note: VSC is traded on external DEXs (Uniswap/Aerodrome)");
        console.log("Burn Address: 0x000000000000000000000000000000000000dEaD (constant)");
        console.log("");
        console.log("=== Deployment Complete ===");
    }
}
