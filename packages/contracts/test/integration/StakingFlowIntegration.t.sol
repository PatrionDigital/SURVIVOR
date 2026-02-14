// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { VSCToken } from "../../src/tokens/VSCToken.sol";
import { GearToken } from "../../src/tokens/GearToken.sol";
import { ERC20BondingCurve } from "../../src/bonding/ERC20BondingCurve.sol";
import { GearStaking } from "../../src/staking/GearStaking.sol";
import { MaintenancePool } from "../../src/staking/MaintenancePool.sol";

/**
 * @title StakingFlowIntegration
 * @notice Integration tests for gear trading, staking, and maintenance system
 * @dev Tests the complete flow: buy gear → stake → maintenance → unstake → sell
 */
contract StakingFlowIntegration is Test {
    VSCToken public vscToken;
    GearToken[6] public gearTokens;
    ERC20BondingCurve[6] public bondingCurves;
    GearStaking public gearStaking;
    MaintenancePool public maintenancePool;

    // Test accounts
    address public owner;
    address public treasury;
    address public player1;
    address public player2;

    // Token names and symbols
    string[6] public tokenNames = ["Weapon", "Armor", "Power", "Gloves", "Amulet", "Boots"];
    string[6] public tokenSymbols = ["WEAPON", "ARMOR", "POWER", "GLOVES", "AMULET", "BOOTS"];

    // Test constants
    uint256 constant INITIAL_VSC = 10_000_000 ether; // 10M VSC for testing
    uint256 constant INITIAL_LIQUIDITY_VSC = 1_000_000 ether; // 1M VSC liquidity per curve
    uint256 constant INITIAL_LIQUIDITY_GEAR = 10_000 ether; // 10K GEAR tokens per curve

    function setUp() public {
        // Create test accounts
        owner = makeAddr("owner");
        treasury = makeAddr("treasury");
        player1 = makeAddr("player1");
        player2 = makeAddr("player2");

        vm.startPrank(owner);

        // Deploy VSC token
        vscToken = new VSCToken(owner);

        // Deploy 6 gear tokens
        address[6] memory gearAddresses;
        for (uint8 i = 0; i < 6; i++) {
            gearTokens[i] = new GearToken(tokenNames[i], tokenSymbols[i], owner);
            gearAddresses[i] = address(gearTokens[i]);
        }

        // Deploy gear staking
        gearStaking = new GearStaking(owner, gearAddresses, treasury);

        // Deploy maintenance pool
        maintenancePool = new MaintenancePool(owner, address(vscToken));

        // Link maintenance pool to staking
        gearStaking.setMaintenancePool(address(maintenancePool));
        maintenancePool.setGearStaking(address(gearStaking));

        // Deploy bonding curves for each gear type
        // Constructor signature: (baseToken, token, treasury, owner)
        for (uint8 i = 0; i < 6; i++) {
            bondingCurves[i] = new ERC20BondingCurve(
                address(vscToken),
                address(gearTokens[i]),
                treasury,
                owner
            );

            // Set bonding curve as authorized minter for gear tokens
            gearTokens[i].setBondingCurve(address(bondingCurves[i]));
        }

        // Mint VSC tokens to players
        vscToken.addMinter(owner);
        vscToken.mint(player1, INITIAL_VSC);
        vscToken.mint(player2, INITIAL_VSC);

        vm.stopPrank();
    }

    // ============ Test 1: Buy gear → stake → power calculation verified ============

    function test_BuyStakeAndVerifyPower() public {
        uint256 vscAmount = 100 ether;

        vm.startPrank(player1);

        // Player1 approves VSC for bonding curve
        vscToken.approve(address(bondingCurves[0]), vscAmount);

        // Buy WEAPON tokens
        uint256 tokensReceived = bondingCurves[0].buy(vscAmount, 0); // 0 min out for testing

        // Verify gear tokens received
        uint256 gearBalance = gearTokens[0].balanceOf(player1);
        assertGt(gearBalance, 0, "Should receive WEAPON tokens");
        assertEq(gearBalance, tokensReceived, "Balance should match tokens received");

        // Approve staking contract
        gearTokens[0].approve(address(gearStaking), gearBalance);

        // Stake WEAPON tokens (slot 0)
        gearStaking.stake(0, gearBalance);

        // Verify staked amount
        uint256 stakedAmount = gearStaking.getStakedAmount(player1, 0);
        assertEq(stakedAmount, gearBalance - (gearBalance * 500) / 10_000, "Should stake correct amount after fee");

        // Calculate power
        uint256 power = gearStaking.getTotalPower(player1);
        assertGt(power, 0, "Power should be greater than 0");

        // Power calculation: uses cube root of token amount
        // The exact formula is in the staking contract
        console.log("Player1 staked amount:", stakedAmount);
        console.log("Player1 total power:", power);

        vm.stopPrank();
    }

    // ============ Test 2: Stake → maintenance deposit → bonus active ============

    function test_StakeDepositMaintenanceAndVerifyBonus() public {
        // First, player1 buys and stakes gear
        vm.startPrank(player1);

        uint256 vscAmount = 100 ether;
        vscToken.approve(address(bondingCurves[0]), vscAmount);
        bondingCurves[0].buy(vscAmount, 0);

        uint256 gearBalance = gearTokens[0].balanceOf(player1);
        gearTokens[0].approve(address(gearStaking), gearBalance);
        gearStaking.stake(0, gearBalance);

        // Calculate base power before maintenance deposit
        uint256 basePower = gearStaking.getTotalPower(player1);

        // Deposit maintenance (1 week worth)
        // Calculate required deposit: 10% of staked value (maintenanceMultiplierBps)
        uint256 stakedAmount = gearStaking.getStakedAmount(player1, 0);
        uint256 depositAmount = (stakedAmount * maintenancePool.maintenanceMultiplierBps()) / 10_000;

        vscToken.approve(address(maintenancePool), depositAmount);
        maintenancePool.deposit(depositAmount);

        // Verify deposit
        (uint256 balance, uint256 lastUpdateTime) = maintenancePool.maintenanceData(player1);
        assertEq(balance, depositAmount, "Should deposit correct amount");
        assertEq(lastUpdateTime, block.timestamp, "Last update should be current time");

        // Calculate power with bonus
        uint256 powerWithBonus = gearStaking.getTotalPower(player1);

        // Power should be higher with maintenance bonus (50% bonus)
        uint256 expectedPowerWithBonus = (basePower * 150) / 100;
        assertEq(powerWithBonus, expectedPowerWithBonus, "Power should include 50% maintenance bonus");

        console.log("Base power:", basePower);
        console.log("Power with bonus:", powerWithBonus);

        vm.stopPrank();
    }

    // ============ Test 3: Multiple slots → cumulative power correct ============

    function test_MultipleSlotsCumulativePower() public {
        vm.startPrank(player1);

        uint256 vscAmountPerSlot = 50 ether;
        uint256 totalPower = 0;

        // Buy and stake in 3 different slots (WEAPON, ARMOR, POWER)
        for (uint8 i = 0; i < 3; i++) {
            // Buy gear
            vscToken.approve(address(bondingCurves[i]), vscAmountPerSlot);
            bondingCurves[i].buy(vscAmountPerSlot, 0);

            // Stake gear
            uint256 gearBalance = gearTokens[i].balanceOf(player1);
            gearTokens[i].approve(address(gearStaking), gearBalance);
            gearStaking.stake(i, gearBalance);

            // Calculate power for this slot
            uint256 slotPower = gearStaking.getGearPower(player1, i);
            totalPower += slotPower;

            console.log("Slot", i, "power:", slotPower);
        }

        // Verify cumulative power
        uint256 actualTotalPower = gearStaking.getTotalPower(player1);
        assertEq(actualTotalPower, totalPower, "Total power should equal sum of individual slot powers");

        console.log("Expected total power:", totalPower);
        console.log("Actual total power:", actualTotalPower);

        vm.stopPrank();
    }

    // ============ Test 4: Unstake → sell gear → VSC recovery ============

    function test_UnstakeAndSellGear() public {
        vm.startPrank(player1);

        uint256 initialVscBalance = vscToken.balanceOf(player1);
        uint256 vscSpent = 100 ether;

        // Buy WEAPON tokens
        vscToken.approve(address(bondingCurves[0]), vscSpent);
        bondingCurves[0].buy(vscSpent, 0);

        uint256 gearBalance = gearTokens[0].balanceOf(player1);

        // Stake
        gearTokens[0].approve(address(gearStaking), gearBalance);
        gearStaking.stake(0, gearBalance);

        uint256 stakedAmount = gearStaking.getStakedAmount(player1, 0);

        // Unstake
        gearStaking.unstake(0, stakedAmount);

        // Verify gear tokens returned
        uint256 gearAfterUnstake = gearTokens[0].balanceOf(player1);
        assertEq(gearAfterUnstake, stakedAmount, "Should receive staked amount back");

        // Sell gear back to bonding curve
        gearTokens[0].approve(address(bondingCurves[0]), gearAfterUnstake);
        uint256 vscReceived = bondingCurves[0].sell(gearAfterUnstake, 0);

        // Verify VSC recovered (will be less than spent due to fees and slippage)
        uint256 finalVscBalance = vscToken.balanceOf(player1);
        uint256 vscRecovered = finalVscBalance - (initialVscBalance - vscSpent);

        assertGt(vscRecovered, 0, "Should recover some VSC");
        assertLt(vscRecovered, vscSpent, "VSC recovered should be less than spent due to fees");
        assertEq(vscRecovered, vscReceived, "VSC recovered should match tokens received from sell");

        console.log("VSC spent:", vscSpent);
        console.log("VSC recovered:", vscRecovered);
        console.log("Loss from fees:", vscSpent - vscRecovered);

        vm.stopPrank();
    }

    // ============ Additional Test: Multiple players concurrent operations ============

    function test_MultiplePlayersConcurrentOperations() public {
        // Player1 operations
        vm.startPrank(player1);
        uint256 vscAmount1 = 80 ether;
        vscToken.approve(address(bondingCurves[0]), vscAmount1);
        bondingCurves[0].buy(vscAmount1, 0);
        uint256 gearBalance1 = gearTokens[0].balanceOf(player1);
        gearTokens[0].approve(address(gearStaking), gearBalance1);
        gearStaking.stake(0, gearBalance1);
        vm.stopPrank();

        // Player2 operations (different gear type)
        vm.startPrank(player2);
        uint256 vscAmount2 = 80 ether;
        vscToken.approve(address(bondingCurves[1]), vscAmount2);
        bondingCurves[1].buy(vscAmount2, 0);
        uint256 gearBalance2 = gearTokens[1].balanceOf(player2);
        gearTokens[1].approve(address(gearStaking), gearBalance2);
        gearStaking.stake(1, gearBalance2);
        vm.stopPrank();

        // Verify both players have staked amounts
        uint256 staked1 = gearStaking.getStakedAmount(player1, 0);
        uint256 staked2 = gearStaking.getStakedAmount(player2, 1);

        assertGt(staked1, 0, "Player1 should have staked WEAPON");
        assertGt(staked2, 0, "Player2 should have staked ARMOR");

        // Verify independent power calculations
        uint256 power1 = gearStaking.getTotalPower(player1);
        uint256 power2 = gearStaking.getTotalPower(player2);

        assertGt(power1, 0, "Player1 should have power");
        assertGt(power2, 0, "Player2 should have power");

        console.log("Player1 power:", power1);
        console.log("Player2 power:", power2);
    }
}
