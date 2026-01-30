// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { GearToken } from "../src/tokens/GearToken.sol";

contract GearTokenTest is Test {
    GearToken public token;
    address public owner;
    address public bondingCurve;
    address public user;
    address public attacker;

    event BondingCurveSet(address indexed oldBondingCurve, address indexed newBondingCurve);

    function setUp() public {
        owner = makeAddr("owner");
        bondingCurve = makeAddr("bondingCurve");
        user = makeAddr("user");
        attacker = makeAddr("attacker");

        vm.prank(owner);
        token = new GearToken("Weapon", "WEAPON", owner);
    }

    // ============ Initial State Tests ============

    function test_InitialState() public view {
        assertEq(token.name(), "Weapon");
        assertEq(token.symbol(), "WEAPON");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 0);
        assertEq(token.owner(), owner);
        assertEq(token.bondingCurve(), address(0));
    }

    function test_Constructor_RevertIfZeroAddress() public {
        // Ownable throws OwnableInvalidOwner before our check runs
        vm.expectRevert(abi.encodeWithSignature("OwnableInvalidOwner(address)", address(0)));
        new GearToken("Test", "TST", address(0));
    }

    // ============ setBondingCurve Tests ============

    function test_SetBondingCurve() public {
        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit BondingCurveSet(address(0), bondingCurve);
        token.setBondingCurve(bondingCurve);

        assertEq(token.bondingCurve(), bondingCurve);
    }

    function test_SetBondingCurve_RevertIfNotOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        token.setBondingCurve(bondingCurve);
    }

    function test_SetBondingCurve_RevertIfZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(GearToken.ZeroAddress.selector);
        token.setBondingCurve(address(0));
    }

    function test_SetBondingCurve_CanChangeAfterSet() public {
        address newBondingCurve = makeAddr("newBondingCurve");

        vm.startPrank(owner);
        token.setBondingCurve(bondingCurve);
        token.setBondingCurve(newBondingCurve);
        vm.stopPrank();

        assertEq(token.bondingCurve(), newBondingCurve);
    }

    // ============ Mint Tests ============

    function test_Mint() public {
        vm.prank(owner);
        token.setBondingCurve(bondingCurve);

        uint256 amount = 1000 * 10 ** 18;
        vm.prank(bondingCurve);
        token.mint(user, amount);

        assertEq(token.balanceOf(user), amount);
        assertEq(token.totalSupply(), amount);
    }

    function test_Mint_RevertIfNotBondingCurve() public {
        vm.prank(owner);
        token.setBondingCurve(bondingCurve);

        vm.prank(attacker);
        vm.expectRevert(GearToken.NotBondingCurve.selector);
        token.mint(user, 1000);
    }

    function test_Mint_RevertIfBondingCurveNotSet() public {
        // bondingCurve is address(0), so any call should fail
        vm.prank(user);
        vm.expectRevert(GearToken.NotBondingCurve.selector);
        token.mint(user, 1000);
    }

    function test_Mint_RevertIfPaused() public {
        vm.prank(owner);
        token.setBondingCurve(bondingCurve);

        vm.prank(owner);
        token.pause();

        vm.prank(bondingCurve);
        vm.expectRevert();
        token.mint(user, 1000);
    }

    // ============ Burn Tests ============

    function test_Burn() public {
        vm.prank(owner);
        token.setBondingCurve(bondingCurve);

        uint256 mintAmount = 1000 * 10 ** 18;
        uint256 burnAmount = 400 * 10 ** 18;

        vm.prank(bondingCurve);
        token.mint(user, mintAmount);

        vm.prank(bondingCurve);
        token.burn(user, burnAmount);

        assertEq(token.balanceOf(user), mintAmount - burnAmount);
        assertEq(token.totalSupply(), mintAmount - burnAmount);
    }

    function test_Burn_RevertIfNotBondingCurve() public {
        vm.prank(owner);
        token.setBondingCurve(bondingCurve);

        vm.prank(bondingCurve);
        token.mint(user, 1000);

        vm.prank(attacker);
        vm.expectRevert(GearToken.NotBondingCurve.selector);
        token.burn(user, 500);
    }

    function test_Burn_RevertIfInsufficientBalance() public {
        vm.prank(owner);
        token.setBondingCurve(bondingCurve);

        vm.prank(bondingCurve);
        token.mint(user, 1000);

        vm.prank(bondingCurve);
        vm.expectRevert();
        token.burn(user, 2000);
    }

    function test_Burn_RevertIfPaused() public {
        vm.prank(owner);
        token.setBondingCurve(bondingCurve);

        vm.prank(bondingCurve);
        token.mint(user, 1000);

        vm.prank(owner);
        token.pause();

        vm.prank(bondingCurve);
        vm.expectRevert();
        token.burn(user, 500);
    }

    // ============ Pause Tests ============

    function test_Pause() public {
        vm.prank(owner);
        token.setBondingCurve(bondingCurve);

        vm.prank(bondingCurve);
        token.mint(user, 1000);

        vm.prank(owner);
        token.pause();

        assertTrue(token.paused());

        // Transfer should fail when paused
        vm.prank(user);
        vm.expectRevert();
        token.transfer(attacker, 100);
    }

    function test_Pause_RevertIfNotOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        token.pause();
    }

    function test_Unpause() public {
        vm.prank(owner);
        token.setBondingCurve(bondingCurve);

        vm.prank(bondingCurve);
        token.mint(user, 1000);

        vm.startPrank(owner);
        token.pause();
        token.unpause();
        vm.stopPrank();

        assertFalse(token.paused());

        // Transfer should work after unpause
        vm.prank(user);
        token.transfer(attacker, 100);
        assertEq(token.balanceOf(attacker), 100);
    }

    function test_Unpause_RevertIfNotOwner() public {
        vm.prank(owner);
        token.pause();

        vm.prank(attacker);
        vm.expectRevert();
        token.unpause();
    }

    // ============ Transfer Tests ============

    function test_Transfer() public {
        vm.prank(owner);
        token.setBondingCurve(bondingCurve);

        vm.prank(bondingCurve);
        token.mint(user, 1000);

        vm.prank(user);
        token.transfer(attacker, 400);

        assertEq(token.balanceOf(user), 600);
        assertEq(token.balanceOf(attacker), 400);
    }

    // ============ Fuzz Tests ============

    function testFuzz_Mint(uint256 amount) public {
        vm.assume(amount > 0 && amount < type(uint256).max / 2);

        vm.prank(owner);
        token.setBondingCurve(bondingCurve);

        vm.prank(bondingCurve);
        token.mint(user, amount);

        assertEq(token.balanceOf(user), amount);
        assertEq(token.totalSupply(), amount);
    }

    function testFuzz_Burn(uint256 mintAmount, uint256 burnAmount) public {
        vm.assume(mintAmount > 0 && mintAmount < type(uint256).max / 2);
        vm.assume(burnAmount > 0 && burnAmount <= mintAmount);

        vm.prank(owner);
        token.setBondingCurve(bondingCurve);

        vm.prank(bondingCurve);
        token.mint(user, mintAmount);

        vm.prank(bondingCurve);
        token.burn(user, burnAmount);

        assertEq(token.balanceOf(user), mintAmount - burnAmount);
    }
}
