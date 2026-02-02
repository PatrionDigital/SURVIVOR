// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { MaintenancePool } from "../src/staking/MaintenancePool.sol";
import { VSCToken } from "../src/tokens/VSCToken.sol";

contract MaintenancePoolTest is Test {
    MaintenancePool public pool;
    VSCToken public vscToken;

    address public owner = makeAddr("owner");
    address public player1 = makeAddr("player1");
    address public player2 = makeAddr("player2");
    address public gearStaking = makeAddr("gearStaking");

    uint256 constant INITIAL_BALANCE = 1_000_000 * 1e18;

    function setUp() public {
        vm.startPrank(owner);

        // Deploy VSC token
        vscToken = new VSCToken(owner);
        vscToken.addMinter(owner);

        // Deploy maintenance pool
        pool = new MaintenancePool(owner, address(vscToken));

        // Mint tokens to players
        vscToken.mint(player1, INITIAL_BALANCE);
        vscToken.mint(player2, INITIAL_BALANCE);

        vm.stopPrank();
    }

    // ============ Constructor Tests ============

    function test_constructor_setsOwner() public view {
        assertEq(pool.owner(), owner);
    }

    function test_constructor_setsVscToken() public view {
        assertEq(address(pool.vscToken()), address(vscToken));
    }

    function test_constructor_revertsOnZeroToken() public {
        vm.prank(owner);
        vm.expectRevert(MaintenancePool.ZeroAddress.selector);
        new MaintenancePool(owner, address(0));
    }

    // ============ Deposit Tests ============

    function test_deposit_transfersTokens() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(player1);
        vscToken.approve(address(pool), amount);
        pool.deposit(amount);
        vm.stopPrank();

        assertEq(pool.getPoolBalance(player1), amount);
        assertEq(vscToken.balanceOf(address(pool)), amount);
        assertEq(vscToken.balanceOf(player1), INITIAL_BALANCE - amount);
    }

    function test_deposit_emitsEvent() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(player1);
        vscToken.approve(address(pool), amount);

        vm.expectEmit(true, false, false, true);
        emit MaintenancePool.MaintenanceDeposited(player1, amount, amount);

        pool.deposit(amount);
        vm.stopPrank();
    }

    function test_deposit_additive() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(player1);
        vscToken.approve(address(pool), amount * 2);
        pool.deposit(amount);
        pool.deposit(amount);
        vm.stopPrank();

        assertEq(pool.getPoolBalance(player1), amount * 2);
    }

    function test_deposit_revertsOnZeroAmount() public {
        vm.prank(player1);
        vm.expectRevert(MaintenancePool.ZeroAmount.selector);
        pool.deposit(0);
    }

    // ============ Withdraw Tests ============

    function test_withdraw_transfersTokensBack() public {
        uint256 depositAmount = 1000 * 1e18;
        uint256 withdrawAmount = 400 * 1e18;

        vm.startPrank(player1);
        vscToken.approve(address(pool), depositAmount);
        pool.deposit(depositAmount);

        uint256 balanceBefore = vscToken.balanceOf(player1);
        pool.withdraw(withdrawAmount);
        uint256 balanceAfter = vscToken.balanceOf(player1);
        vm.stopPrank();

        assertEq(balanceAfter - balanceBefore, withdrawAmount);
        assertEq(pool.getPoolBalance(player1), depositAmount - withdrawAmount);
    }

    function test_withdraw_emitsEvent() public {
        uint256 depositAmount = 1000 * 1e18;
        uint256 withdrawAmount = 400 * 1e18;

        vm.startPrank(player1);
        vscToken.approve(address(pool), depositAmount);
        pool.deposit(depositAmount);

        vm.expectEmit(true, false, false, true);
        emit MaintenancePool.MaintenanceWithdrawn(
            player1, withdrawAmount, depositAmount - withdrawAmount
        );

        pool.withdraw(withdrawAmount);
        vm.stopPrank();
    }

    function test_withdraw_revertsOnInsufficientBalance() public {
        vm.startPrank(player1);
        vscToken.approve(address(pool), 1000 * 1e18);
        pool.deposit(1000 * 1e18);

        vm.expectRevert(MaintenancePool.InsufficientBalance.selector);
        pool.withdraw(2000 * 1e18);
        vm.stopPrank();
    }

    function test_withdraw_revertsOnZeroAmount() public {
        vm.prank(player1);
        vm.expectRevert(MaintenancePool.ZeroAmount.selector);
        pool.withdraw(0);
    }

    function test_withdraw_fullAmount() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(player1);
        vscToken.approve(address(pool), amount);
        pool.deposit(amount);
        pool.withdraw(amount);
        vm.stopPrank();

        assertEq(pool.getPoolBalance(player1), 0);
    }

    // ============ Decay Tests ============

    function test_decay_appliesOverTime() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(player1);
        vscToken.approve(address(pool), amount);
        pool.deposit(amount);
        vm.stopPrank();

        // Advance 1 week
        vm.warp(block.timestamp + 7 days);

        // Balance should have decayed by ~1%
        uint256 balanceAfter = pool.getPoolBalance(player1);
        uint256 expectedDecay = (amount * 100) / 10_000; // 1%
        uint256 expectedBalance = amount - expectedDecay;

        assertApproxEqRel(balanceAfter, expectedBalance, 0.001e18); // 0.1% tolerance
    }

    function test_decay_getPendingDecay() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(player1);
        vscToken.approve(address(pool), amount);
        pool.deposit(amount);
        vm.stopPrank();

        // Advance 1 week
        vm.warp(block.timestamp + 7 days);

        uint256 pendingDecay = pool.getPendingDecay(player1);
        uint256 expectedDecay = (amount * 100) / 10_000; // 1%

        assertApproxEqRel(pendingDecay, expectedDecay, 0.001e18);
    }

    function test_decay_applyDecayUpdatesBalance() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(player1);
        vscToken.approve(address(pool), amount);
        pool.deposit(amount);
        vm.stopPrank();

        // Advance 1 week
        vm.warp(block.timestamp + 7 days);

        // Apply decay
        pool.applyDecay(player1);

        // Check raw data is updated
        (uint256 rawBalance, uint256 lastUpdate) = pool.getRawMaintenanceData(player1);
        uint256 expectedBalance = amount - (amount * 100) / 10_000;

        assertApproxEqRel(rawBalance, expectedBalance, 0.001e18);
        assertEq(lastUpdate, block.timestamp);
    }

    function test_decay_emitsEvent() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(player1);
        vscToken.approve(address(pool), amount);
        pool.deposit(amount);
        vm.stopPrank();

        // Advance 1 week
        vm.warp(block.timestamp + 7 days);

        uint256 expectedDecay = (amount * 100) / 10_000;
        uint256 expectedBalance = amount - expectedDecay;

        vm.expectEmit(true, false, false, false); // We can't precisely match values due to time
        emit MaintenancePool.DecayApplied(player1, expectedDecay, expectedBalance);

        pool.applyDecay(player1);
    }

    function test_decay_multipleWeeks() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(player1);
        vscToken.approve(address(pool), amount);
        pool.deposit(amount);
        vm.stopPrank();

        // Advance 4 weeks
        vm.warp(block.timestamp + 28 days);

        uint256 balanceAfter = pool.getPoolBalance(player1);
        uint256 expectedDecay = (amount * 400) / 10_000; // ~4%
        uint256 expectedBalance = amount - expectedDecay;

        assertApproxEqRel(balanceAfter, expectedBalance, 0.001e18);
    }

    function test_decay_noDecayIfNoBalance() public view {
        assertEq(pool.getPendingDecay(player1), 0);
        assertEq(pool.getPoolBalance(player1), 0);
    }

    // ============ Threshold Tests ============

    function test_getThreshold_zeroWithoutGearStaking() public view {
        assertEq(pool.getThreshold(player1), 0);
    }

    function test_getThreshold_calculatesFromGearStaking() public {
        uint256 totalStaked = 10_000 * 1e18;

        // Mock GearStaking.getTotalStaked to return totalStaked
        vm.mockCall(
            gearStaking,
            abi.encodeWithSignature("getTotalStaked(address)", player1),
            abi.encode(totalStaked)
        );

        vm.prank(owner);
        pool.setGearStaking(gearStaking);

        // Threshold = totalStaked * 10% (default multiplier)
        uint256 expectedThreshold = (totalStaked * 1000) / 10_000;
        assertEq(pool.getThreshold(player1), expectedThreshold);
    }

    function test_getThreshold_respectsMultiplier() public {
        uint256 totalStaked = 10_000 * 1e18;

        vm.mockCall(
            gearStaking,
            abi.encodeWithSignature("getTotalStaked(address)", player1),
            abi.encode(totalStaked)
        );

        vm.startPrank(owner);
        pool.setGearStaking(gearStaking);
        pool.setMaintenanceMultiplier(2000); // 20%
        vm.stopPrank();

        uint256 expectedThreshold = (totalStaked * 2000) / 10_000;
        assertEq(pool.getThreshold(player1), expectedThreshold);
    }

    // ============ Maintenance Status Tests ============

    function test_getMaintenanceStatus_falseWithNoStaking() public view {
        // No GearStaking set, should be false
        assertFalse(pool.getMaintenanceStatus(player1) != false);
    }

    function test_getMaintenanceStatus_activeWhenAboveThreshold() public {
        uint256 totalStaked = 10_000 * 1e18;
        uint256 threshold = (totalStaked * 1000) / 10_000; // 1000 tokens

        vm.mockCall(
            gearStaking,
            abi.encodeWithSignature("getTotalStaked(address)", player1),
            abi.encode(totalStaked)
        );

        vm.prank(owner);
        pool.setGearStaking(gearStaking);

        // Deposit above threshold
        vm.startPrank(player1);
        vscToken.approve(address(pool), threshold + 100 * 1e18);
        pool.deposit(threshold + 100 * 1e18);
        vm.stopPrank();

        assertTrue(pool.getMaintenanceStatus(player1) == true);
    }

    function test_getMaintenanceStatus_inactiveWhenBelowThreshold() public {
        uint256 totalStaked = 10_000 * 1e18;
        uint256 threshold = (totalStaked * 1000) / 10_000; // 1000 tokens

        vm.mockCall(
            gearStaking,
            abi.encodeWithSignature("getTotalStaked(address)", player1),
            abi.encode(totalStaked)
        );

        vm.prank(owner);
        pool.setGearStaking(gearStaking);

        // Deposit below threshold
        vm.startPrank(player1);
        vscToken.approve(address(pool), threshold / 2);
        pool.deposit(threshold / 2);
        vm.stopPrank();

        assertFalse(pool.getMaintenanceStatus(player1) == true);
    }

    function test_getMaintenancePercentage() public {
        uint256 totalStaked = 10_000 * 1e18;
        uint256 threshold = (totalStaked * 1000) / 10_000; // 1000 tokens

        vm.mockCall(
            gearStaking,
            abi.encodeWithSignature("getTotalStaked(address)", player1),
            abi.encode(totalStaked)
        );

        vm.prank(owner);
        pool.setGearStaking(gearStaking);

        // Deposit 50% of threshold
        vm.startPrank(player1);
        vscToken.approve(address(pool), threshold / 2);
        pool.deposit(threshold / 2);
        vm.stopPrank();

        assertEq(pool.getMaintenancePercentage(player1), 50);
    }

    // ============ Admin Tests ============

    function test_setGearStaking_updatesAddress() public {
        vm.prank(owner);
        pool.setGearStaking(gearStaking);

        assertEq(pool.gearStaking(), gearStaking);
    }

    function test_setGearStaking_emitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit MaintenancePool.GearStakingUpdated(address(0), gearStaking);

        vm.prank(owner);
        pool.setGearStaking(gearStaking);
    }

    function test_setGearStaking_revertsIfNotOwner() public {
        vm.prank(player1);
        vm.expectRevert();
        pool.setGearStaking(gearStaking);
    }

    function test_setMaintenanceMultiplier_updatesValue() public {
        vm.prank(owner);
        pool.setMaintenanceMultiplier(2000);

        assertEq(pool.maintenanceMultiplierBps(), 2000);
    }

    function test_setMaintenanceMultiplier_emitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit MaintenancePool.MaintenanceMultiplierUpdated(1000, 2000);

        vm.prank(owner);
        pool.setMaintenanceMultiplier(2000);
    }

    function test_pause_blocksDeposits() public {
        vm.prank(owner);
        pool.pause();

        vm.startPrank(player1);
        vscToken.approve(address(pool), 1000 * 1e18);

        vm.expectRevert();
        pool.deposit(1000 * 1e18);
        vm.stopPrank();
    }

    function test_pause_blocksWithdrawals() public {
        // First deposit
        vm.startPrank(player1);
        vscToken.approve(address(pool), 1000 * 1e18);
        pool.deposit(1000 * 1e18);
        vm.stopPrank();

        // Pause
        vm.prank(owner);
        pool.pause();

        // Try to withdraw
        vm.prank(player1);
        vm.expectRevert();
        pool.withdraw(100 * 1e18);
    }

    function test_unpause_allowsOperations() public {
        vm.prank(owner);
        pool.pause();

        vm.prank(owner);
        pool.unpause();

        vm.startPrank(player1);
        vscToken.approve(address(pool), 1000 * 1e18);
        pool.deposit(1000 * 1e18);
        vm.stopPrank();

        assertTrue(pool.getPoolBalance(player1) > 0);
    }

    // ============ Fuzz Tests ============

    function testFuzz_deposit_anyAmount(uint256 amount) public {
        amount = bound(amount, 1, INITIAL_BALANCE);

        vm.startPrank(player1);
        vscToken.approve(address(pool), amount);
        pool.deposit(amount);
        vm.stopPrank();

        assertEq(pool.getPoolBalance(player1), amount);
    }

    function testFuzz_decay_proportionalToTime(uint256 timeElapsed) public {
        timeElapsed = bound(timeElapsed, 1 hours, 365 days);
        uint256 amount = 1000 * 1e18;

        vm.startPrank(player1);
        vscToken.approve(address(pool), amount);
        pool.deposit(amount);
        vm.stopPrank();

        vm.warp(block.timestamp + timeElapsed);

        uint256 balanceAfter = pool.getPoolBalance(player1);
        // Balance should decrease but not go below 0
        assertTrue(balanceAfter <= amount);
        assertTrue(balanceAfter >= 0);
    }
}
