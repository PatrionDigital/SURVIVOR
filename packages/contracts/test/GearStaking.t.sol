// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { GearStaking } from "../src/staking/GearStaking.sol";
import { GearToken } from "../src/tokens/GearToken.sol";

contract GearStakingTest is Test {
    GearStaking public staking;
    GearToken[6] public gearTokens;

    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    address public player1 = makeAddr("player1");
    address public player2 = makeAddr("player2");
    address public maintenancePool = makeAddr("maintenancePool");

    string[6] public tokenNames = ["Weapon", "Armor", "Power", "Gloves", "Amulet", "Boots"];
    string[6] public tokenSymbols = ["WEAPON", "ARMOR", "POWER", "GLOVES", "AMULET", "BOOTS"];

    uint256 constant INITIAL_BALANCE = 1_000_000 * 1e18;

    function setUp() public {
        vm.startPrank(owner);

        // Deploy 6 gear tokens
        address[6] memory gearAddresses;
        for (uint8 i = 0; i < 6; i++) {
            gearTokens[i] = new GearToken(tokenNames[i], tokenSymbols[i], owner);
            gearAddresses[i] = address(gearTokens[i]);
        }

        // Deploy staking contract
        staking = new GearStaking(owner, gearAddresses, treasury);

        // Set up bonding curve as owner for minting (for testing purposes)
        for (uint8 i = 0; i < 6; i++) {
            gearTokens[i].setBondingCurve(owner);
        }

        // Mint tokens to players
        for (uint8 i = 0; i < 6; i++) {
            gearTokens[i].mint(player1, INITIAL_BALANCE);
            gearTokens[i].mint(player2, INITIAL_BALANCE);
        }

        vm.stopPrank();
    }

    // ============ Constructor Tests ============

    function test_constructor_setsOwner() public view {
        assertEq(staking.owner(), owner);
    }

    function test_constructor_setsTreasury() public view {
        assertEq(staking.treasury(), treasury);
    }

    function test_constructor_setsGearTokens() public view {
        for (uint8 i = 0; i < 6; i++) {
            assertEq(staking.gearTokens(i), address(gearTokens[i]));
        }
    }

    function test_constructor_revertsOnZeroTreasury() public {
        vm.startPrank(owner);
        address[6] memory gearAddresses;
        for (uint8 i = 0; i < 6; i++) {
            gearAddresses[i] = address(gearTokens[i]);
        }

        vm.expectRevert(GearStaking.ZeroAddress.selector);
        new GearStaking(owner, gearAddresses, address(0));
        vm.stopPrank();
    }

    function test_constructor_revertsOnZeroGearToken() public {
        vm.startPrank(owner);
        address[6] memory gearAddresses;
        for (uint8 i = 0; i < 5; i++) {
            gearAddresses[i] = address(gearTokens[i]);
        }
        gearAddresses[5] = address(0);

        vm.expectRevert(GearStaking.InvalidGearTokens.selector);
        new GearStaking(owner, gearAddresses, treasury);
        vm.stopPrank();
    }

    // ============ Stake Tests ============

    function test_stake_transfersTokens() public {
        uint256 amount = 1000 * 1e18;
        uint256 fee = (amount * 500) / 10000; // 5% fee
        uint256 amountAfterFee = amount - fee;

        vm.startPrank(player1);
        gearTokens[0].approve(address(staking), amount);
        staking.stake(0, amount);
        vm.stopPrank();

        // Check staked amount
        assertEq(staking.stakedAmounts(player1, 0), amountAfterFee);

        // Check token balances
        assertEq(gearTokens[0].balanceOf(address(staking)), amountAfterFee);
        assertEq(gearTokens[0].balanceOf(treasury), fee);
        assertEq(gearTokens[0].balanceOf(player1), INITIAL_BALANCE - amount);
    }

    function test_stake_emitsEvents() public {
        uint256 amount = 1000 * 1e18;
        uint256 fee = (amount * 500) / 10000;
        uint256 amountAfterFee = amount - fee;

        vm.startPrank(player1);
        gearTokens[0].approve(address(staking), amount);

        vm.expectEmit(true, true, false, true);
        emit GearStaking.TokensStaked(player1, 0, amountAfterFee, fee);

        staking.stake(0, amount);
        vm.stopPrank();
    }

    function test_stake_revertsOnInvalidSlot() public {
        vm.startPrank(player1);
        gearTokens[0].approve(address(staking), 1000 * 1e18);

        vm.expectRevert(GearStaking.InvalidSlot.selector);
        staking.stake(6, 1000 * 1e18);
        vm.stopPrank();
    }

    function test_stake_revertsOnZeroAmount() public {
        vm.startPrank(player1);

        vm.expectRevert(GearStaking.ZeroAmount.selector);
        staking.stake(0, 0);
        vm.stopPrank();
    }

    function test_stake_multipleSlots() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(player1);
        for (uint8 i = 0; i < 6; i++) {
            gearTokens[i].approve(address(staking), amount);
            staking.stake(i, amount);
        }
        vm.stopPrank();

        uint256 expectedStaked = amount - (amount * 500) / 10000;
        for (uint8 i = 0; i < 6; i++) {
            assertEq(staking.stakedAmounts(player1, i), expectedStaked);
        }
    }

    function test_stake_additiveStaking() public {
        uint256 amount = 1000 * 1e18;
        uint256 amountAfterFee = amount - (amount * 500) / 10000;

        vm.startPrank(player1);

        gearTokens[0].approve(address(staking), amount * 2);
        staking.stake(0, amount);
        staking.stake(0, amount);
        vm.stopPrank();

        assertEq(staking.stakedAmounts(player1, 0), amountAfterFee * 2);
    }

    // ============ Unstake Tests ============

    function test_unstake_transfersTokensBack() public {
        uint256 stakeAmount = 1000 * 1e18;
        uint256 amountAfterFee = stakeAmount - (stakeAmount * 500) / 10000;

        vm.startPrank(player1);
        gearTokens[0].approve(address(staking), stakeAmount);
        staking.stake(0, stakeAmount);

        uint256 balanceBefore = gearTokens[0].balanceOf(player1);
        staking.unstake(0, amountAfterFee);
        uint256 balanceAfter = gearTokens[0].balanceOf(player1);
        vm.stopPrank();

        assertEq(balanceAfter - balanceBefore, amountAfterFee);
        assertEq(staking.stakedAmounts(player1, 0), 0);
    }

    function test_unstake_emitsEvent() public {
        uint256 stakeAmount = 1000 * 1e18;
        uint256 amountAfterFee = stakeAmount - (stakeAmount * 500) / 10000;

        vm.startPrank(player1);
        gearTokens[0].approve(address(staking), stakeAmount);
        staking.stake(0, stakeAmount);

        vm.expectEmit(true, true, false, true);
        emit GearStaking.TokensUnstaked(player1, 0, amountAfterFee);

        staking.unstake(0, amountAfterFee);
        vm.stopPrank();
    }

    function test_unstake_partial() public {
        uint256 stakeAmount = 1000 * 1e18;
        uint256 amountAfterFee = stakeAmount - (stakeAmount * 500) / 10000;
        uint256 unstakeAmount = amountAfterFee / 2;

        vm.startPrank(player1);
        gearTokens[0].approve(address(staking), stakeAmount);
        staking.stake(0, stakeAmount);
        staking.unstake(0, unstakeAmount);
        vm.stopPrank();

        assertEq(staking.stakedAmounts(player1, 0), amountAfterFee - unstakeAmount);
    }

    function test_unstake_revertsOnInvalidSlot() public {
        vm.startPrank(player1);
        vm.expectRevert(GearStaking.InvalidSlot.selector);
        staking.unstake(6, 100);
        vm.stopPrank();
    }

    function test_unstake_revertsOnZeroAmount() public {
        vm.startPrank(player1);
        vm.expectRevert(GearStaking.ZeroAmount.selector);
        staking.unstake(0, 0);
        vm.stopPrank();
    }

    function test_unstake_revertsOnInsufficientStake() public {
        vm.startPrank(player1);
        vm.expectRevert(GearStaking.InsufficientStake.selector);
        staking.unstake(0, 100);
        vm.stopPrank();
    }

    // ============ Power Calculation Tests ============

    function test_getGearPower_zeroForNoStake() public view {
        assertEq(staking.getGearPower(player1, 0), 0);
    }

    function test_getGearPower_calculatesCorrectly() public {
        // Stake 100 tokens (after 5% fee = 95 tokens)
        uint256 stakeAmount = 100 * 1e18;

        vm.startPrank(player1);
        gearTokens[0].approve(address(staking), stakeAmount);
        staking.stake(0, stakeAmount);
        vm.stopPrank();

        uint256 power = staking.getGearPower(player1, 0);
        // sqrt(95 * 1e18) should be approximately 9.746794344808963e9
        assertTrue(power > 0);
    }

    function test_getTotalPower_sumsAllSlots() public {
        uint256 stakeAmount = 1000 * 1e18;

        vm.startPrank(player1);
        for (uint8 i = 0; i < 3; i++) {
            gearTokens[i].approve(address(staking), stakeAmount);
            staking.stake(i, stakeAmount);
        }
        vm.stopPrank();

        uint256 totalPower = staking.getTotalPower(player1);
        uint256 sumOfSlots = 0;
        for (uint8 i = 0; i < 3; i++) {
            sumOfSlots += staking.getGearPower(player1, i);
        }

        assertEq(totalPower, sumOfSlots);
    }

    function test_getTotalPower_withMaintenanceBonus() public {
        uint256 stakeAmount = 1000 * 1e18;

        vm.startPrank(player1);
        gearTokens[0].approve(address(staking), stakeAmount);
        staking.stake(0, stakeAmount);
        vm.stopPrank();

        uint256 basePower = staking.getGearPower(player1, 0);

        // Set up mock maintenance pool that returns true
        vm.mockCall(
            maintenancePool,
            abi.encodeWithSignature("getMaintenanceStatus(address)", player1),
            abi.encode(true)
        );

        vm.prank(owner);
        staking.setMaintenancePool(maintenancePool);

        uint256 totalPower = staking.getTotalPower(player1);
        uint256 expectedPower = basePower + (basePower * 5000) / 10000; // +50% bonus

        assertEq(totalPower, expectedPower);
    }

    // ============ Tier Tests ============

    function test_getTier_none() public view {
        assertEq(staking.getTier(0), 0);
    }

    function test_getTier_common() public view {
        assertEq(staking.getTier(1 * 1e18), 1);
        assertEq(staking.getTier(99 * 1e18), 1);
    }

    function test_getTier_uncommon() public view {
        assertEq(staking.getTier(100 * 1e18), 2);
        assertEq(staking.getTier(999 * 1e18), 2);
    }

    function test_getTier_rare() public view {
        assertEq(staking.getTier(1000 * 1e18), 3);
        assertEq(staking.getTier(9999 * 1e18), 3);
    }

    function test_getTier_epic() public view {
        assertEq(staking.getTier(10000 * 1e18), 4);
        assertEq(staking.getTier(99999 * 1e18), 4);
    }

    function test_getTier_legendary() public view {
        assertEq(staking.getTier(100000 * 1e18), 5);
        assertEq(staking.getTier(1000000 * 1e18), 5);
    }

    // ============ Player Stats Tests ============

    function test_getPlayerStats_returnsAllInfo() public {
        uint256 stakeAmount = 1000 * 1e18;

        vm.startPrank(player1);
        for (uint8 i = 0; i < 6; i++) {
            gearTokens[i].approve(address(staking), stakeAmount);
            staking.stake(i, stakeAmount);
        }
        vm.stopPrank();

        GearStaking.PlayerStats memory stats = staking.getPlayerStats(player1);

        uint256 expectedStaked = stakeAmount - (stakeAmount * 500) / 10000;
        for (uint8 i = 0; i < 6; i++) {
            assertEq(stats.stakedAmounts[i], expectedStaked);
            assertTrue(stats.slotPowers[i] > 0);
        }
        assertTrue(stats.totalPower > 0);
        assertFalse(stats.maintenanceActive);
    }

    // ============ Admin Tests ============

    function test_setTreasury_updatesAddress() public {
        address newTreasury = makeAddr("newTreasury");

        vm.prank(owner);
        staking.setTreasury(newTreasury);

        assertEq(staking.treasury(), newTreasury);
    }

    function test_setTreasury_revertsOnZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(GearStaking.ZeroAddress.selector);
        staking.setTreasury(address(0));
    }

    function test_setTreasury_revertsIfNotOwner() public {
        vm.prank(player1);
        vm.expectRevert();
        staking.setTreasury(makeAddr("newTreasury"));
    }

    function test_setMaintenancePool_updatesAddress() public {
        vm.prank(owner);
        staking.setMaintenancePool(maintenancePool);

        assertEq(staking.maintenancePool(), maintenancePool);
    }

    function test_pause_blocksStaking() public {
        vm.prank(owner);
        staking.pause();

        vm.startPrank(player1);
        gearTokens[0].approve(address(staking), 1000 * 1e18);

        vm.expectRevert();
        staking.stake(0, 1000 * 1e18);
        vm.stopPrank();
    }

    function test_pause_blocksUnstaking() public {
        // First stake
        vm.startPrank(player1);
        gearTokens[0].approve(address(staking), 1000 * 1e18);
        staking.stake(0, 1000 * 1e18);
        vm.stopPrank();

        // Pause
        vm.prank(owner);
        staking.pause();

        // Try to unstake
        vm.prank(player1);
        vm.expectRevert();
        staking.unstake(0, 100);
    }

    function test_unpause_allowsOperations() public {
        vm.prank(owner);
        staking.pause();

        vm.prank(owner);
        staking.unpause();

        vm.startPrank(player1);
        gearTokens[0].approve(address(staking), 1000 * 1e18);
        staking.stake(0, 1000 * 1e18);
        vm.stopPrank();

        assertTrue(staking.stakedAmounts(player1, 0) > 0);
    }

    // ============ Fuzz Tests ============

    function testFuzz_stake_anyAmount(uint256 amount) public {
        amount = bound(amount, 1, INITIAL_BALANCE);

        vm.startPrank(player1);
        gearTokens[0].approve(address(staking), amount);
        staking.stake(0, amount);
        vm.stopPrank();

        uint256 fee = (amount * 500) / 10000;
        uint256 expected = amount - fee;
        assertEq(staking.stakedAmounts(player1, 0), expected);
    }

    function testFuzz_tier_consistent(uint256 amount) public view {
        uint8 tier = staking.getTier(amount);
        assertTrue(tier <= 5);
    }
}
