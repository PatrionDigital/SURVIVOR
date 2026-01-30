// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { VSCToken } from "../src/tokens/VSCToken.sol";

contract VSCTokenTest is Test {
    VSCToken public token;
    address public owner;
    address public minter;
    address public user;

    function setUp() public {
        owner = makeAddr("owner");
        minter = makeAddr("minter");
        user = makeAddr("user");

        vm.prank(owner);
        token = new VSCToken(owner);
    }

    function test_InitialState() public view {
        assertEq(token.name(), "Survivor Coin");
        assertEq(token.symbol(), "VSC");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 0);
        assertEq(token.MAX_SUPPLY(), 100_000_000_000 * 10 ** 18);
        assertEq(token.owner(), owner);
    }

    function test_AddMinter() public {
        vm.prank(owner);
        token.addMinter(minter);
        assertTrue(token.minters(minter));
    }

    function test_AddMinter_RevertIfNotOwner() public {
        vm.prank(user);
        vm.expectRevert();
        token.addMinter(minter);
    }

    function test_AddMinter_RevertIfZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(VSCToken.ZeroAddress.selector);
        token.addMinter(address(0));
    }

    function test_RemoveMinter() public {
        vm.startPrank(owner);
        token.addMinter(minter);
        token.removeMinter(minter);
        vm.stopPrank();
        assertFalse(token.minters(minter));
    }

    function test_Mint() public {
        vm.prank(owner);
        token.addMinter(minter);

        uint256 amount = 1000 * 10 ** 18;
        vm.prank(minter);
        token.mint(user, amount);

        assertEq(token.balanceOf(user), amount);
        assertEq(token.totalSupply(), amount);
    }

    function test_Mint_RevertIfNotMinter() public {
        vm.prank(user);
        vm.expectRevert(VSCToken.NotMinter.selector);
        token.mint(user, 1000);
    }

    function test_Mint_RevertIfExceedsMaxSupply() public {
        vm.prank(owner);
        token.addMinter(minter);

        uint256 maxSupply = token.MAX_SUPPLY();
        vm.prank(minter);
        vm.expectRevert(VSCToken.ExceedsMaxSupply.selector);
        token.mint(user, maxSupply + 1);
    }

    function test_Pause() public {
        vm.prank(owner);
        token.addMinter(minter);

        vm.prank(minter);
        token.mint(user, 1000);

        vm.prank(owner);
        token.pause();

        vm.prank(user);
        vm.expectRevert();
        token.transfer(minter, 100);
    }

    function test_Unpause() public {
        vm.prank(owner);
        token.addMinter(minter);

        vm.prank(minter);
        token.mint(user, 1000);

        vm.startPrank(owner);
        token.pause();
        token.unpause();
        vm.stopPrank();

        vm.prank(user);
        token.transfer(minter, 100);
        assertEq(token.balanceOf(minter), 100);
    }

    function test_Burn() public {
        vm.prank(owner);
        token.addMinter(minter);

        uint256 amount = 1000 * 10 ** 18;
        vm.prank(minter);
        token.mint(user, amount);

        vm.prank(user);
        token.burn(500 * 10 ** 18);

        assertEq(token.balanceOf(user), 500 * 10 ** 18);
        assertEq(token.totalSupply(), 500 * 10 ** 18);
    }

    function testFuzz_Mint(uint256 amount) public {
        vm.assume(amount <= token.MAX_SUPPLY());

        vm.prank(owner);
        token.addMinter(minter);

        vm.prank(minter);
        token.mint(user, amount);

        assertEq(token.balanceOf(user), amount);
    }
}
