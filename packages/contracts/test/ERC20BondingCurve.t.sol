// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { ERC20BondingCurve } from "../src/bonding/ERC20BondingCurve.sol";
import { VSCToken } from "../src/tokens/VSCToken.sol";
import { GearToken } from "../src/tokens/GearToken.sol";

contract ERC20BondingCurveTest is Test {
    ERC20BondingCurve public curve;
    VSCToken public vscToken;
    GearToken public gearToken;

    address public owner;
    address public treasury;
    address public burnAddress;
    address public buyer;
    address public seller;
    address public attacker;

    // Constants matching the contract
    uint256 constant BASE_PRICE = 1e18; // 1 VSC (18 decimals)
    uint256 constant SLOPE = 1e14; // Scaled for VSC
    uint256 constant BUY_FEE_BPS = 200; // 2%
    uint256 constant SELL_FEE_BPS = 300; // 3%
    uint256 constant TREASURY_SPLIT_BPS = 6000; // 60%
    uint256 constant BURN_SPLIT_BPS = 4000; // 40%
    uint256 constant BPS_DENOMINATOR = 10_000;

    event TokensBought(
        address indexed buyer, uint256 baseAmount, uint256 tokensReceived, uint256 fee
    );
    event TokensSold(
        address indexed seller, uint256 tokenAmount, uint256 baseReceived, uint256 fee
    );
    event FeeRecipientsUpdated(address indexed treasury, address indexed burnAddress);
    event FeeSplitUpdated(uint256 treasuryBps, uint256 burnBps);

    function setUp() public {
        owner = makeAddr("owner");
        treasury = makeAddr("treasury");
        burnAddress = makeAddr("burn");
        buyer = makeAddr("buyer");
        seller = makeAddr("seller");
        attacker = makeAddr("attacker");

        vm.startPrank(owner);

        // Deploy VSC token (base currency)
        vscToken = new VSCToken(owner);
        vscToken.addMinter(owner);

        // Deploy gear token (traded token)
        gearToken = new GearToken("Weapon Core", "WEAPON", owner);

        // Deploy ERC20 bonding curve
        curve = new ERC20BondingCurve(
            address(vscToken), address(gearToken), treasury, burnAddress, owner
        );

        // Set bonding curve as minter on gear token
        gearToken.setBondingCurve(address(curve));

        // Mint VSC to users for testing
        vscToken.mint(buyer, 1_000_000 ether);
        vscToken.mint(seller, 1_000_000 ether);
        vscToken.mint(attacker, 1_000_000 ether);

        vm.stopPrank();
    }

    // ============ Initial State Tests ============

    function test_InitialState() public view {
        assertEq(address(curve.baseToken()), address(vscToken));
        assertEq(address(curve.token()), address(gearToken));
        assertEq(curve.treasury(), treasury);
        assertEq(curve.burnAddress(), burnAddress);
        assertEq(curve.owner(), owner);
        assertEq(curve.buyFeeBps(), BUY_FEE_BPS);
        assertEq(curve.sellFeeBps(), SELL_FEE_BPS);
        assertEq(curve.treasurySplitBps(), TREASURY_SPLIT_BPS);
        assertEq(curve.burnSplitBps(), BURN_SPLIT_BPS);
    }

    function test_InitialPrice() public view {
        // At zero supply, price should be BASE_PRICE
        uint256 price = curve.getCurrentPrice();
        assertEq(price, BASE_PRICE);
    }

    // ============ Constructor Validation Tests ============

    function test_Constructor_RevertIfBaseTokenZero() public {
        vm.expectRevert(ERC20BondingCurve.ZeroAddress.selector);
        new ERC20BondingCurve(address(0), address(gearToken), treasury, burnAddress, owner);
    }

    function test_Constructor_RevertIfTokenZero() public {
        vm.expectRevert(ERC20BondingCurve.ZeroAddress.selector);
        new ERC20BondingCurve(address(vscToken), address(0), treasury, burnAddress, owner);
    }

    function test_Constructor_RevertIfTreasuryZero() public {
        vm.expectRevert(ERC20BondingCurve.ZeroAddress.selector);
        new ERC20BondingCurve(address(vscToken), address(gearToken), address(0), burnAddress, owner);
    }

    function test_Constructor_RevertIfBurnAddressZero() public {
        vm.expectRevert(ERC20BondingCurve.ZeroAddress.selector);
        new ERC20BondingCurve(address(vscToken), address(gearToken), treasury, address(0), owner);
    }

    // ============ Buy Tests ============

    function test_Buy_Success() public {
        uint256 vscAmount = 100 ether;

        vm.startPrank(buyer);
        vscToken.approve(address(curve), vscAmount);

        uint256 buyerVscBefore = vscToken.balanceOf(buyer);
        uint256 buyerGearBefore = gearToken.balanceOf(buyer);

        uint256 tokensReceived = curve.buy(vscAmount, 0);

        assertGt(tokensReceived, 0);
        assertEq(gearToken.balanceOf(buyer), buyerGearBefore + tokensReceived);
        assertEq(vscToken.balanceOf(buyer), buyerVscBefore - vscAmount);
        vm.stopPrank();
    }

    function test_Buy_EmitsEvent() public {
        uint256 vscAmount = 100 ether;

        vm.startPrank(buyer);
        vscToken.approve(address(curve), vscAmount);

        (uint256 expectedTokens, uint256 expectedFee) = curve.calculateBuyReturn(vscAmount);

        vm.expectEmit(true, false, false, true);
        emit TokensBought(buyer, vscAmount, expectedTokens, expectedFee);

        curve.buy(vscAmount, 0);
        vm.stopPrank();
    }

    function test_Buy_FeeDistribution() public {
        uint256 vscAmount = 100 ether;
        uint256 fee = (vscAmount * BUY_FEE_BPS) / BPS_DENOMINATOR;
        uint256 treasuryShare = (fee * TREASURY_SPLIT_BPS) / BPS_DENOMINATOR;
        uint256 burnShare = fee - treasuryShare;

        uint256 treasuryBefore = vscToken.balanceOf(treasury);
        uint256 burnBefore = vscToken.balanceOf(burnAddress);

        vm.startPrank(buyer);
        vscToken.approve(address(curve), vscAmount);
        curve.buy(vscAmount, 0);
        vm.stopPrank();

        assertEq(vscToken.balanceOf(treasury), treasuryBefore + treasuryShare);
        assertEq(vscToken.balanceOf(burnAddress), burnBefore + burnShare);
    }

    function test_Buy_RevertIfZeroAmount() public {
        vm.prank(buyer);
        vm.expectRevert(ERC20BondingCurve.ZeroAmount.selector);
        curve.buy(0, 0);
    }

    function test_Buy_RevertIfSlippageExceeded() public {
        uint256 vscAmount = 100 ether;
        uint256 unreasonableMin = 1_000_000 ether;

        vm.startPrank(buyer);
        vscToken.approve(address(curve), vscAmount);

        vm.expectRevert(ERC20BondingCurve.InsufficientOutput.selector);
        curve.buy(vscAmount, unreasonableMin);
        vm.stopPrank();
    }

    function test_Buy_RevertWhenPaused() public {
        vm.prank(owner);
        curve.pause();

        vm.startPrank(buyer);
        vscToken.approve(address(curve), 100 ether);

        vm.expectRevert();
        curve.buy(100 ether, 0);
        vm.stopPrank();
    }

    function test_Buy_RevertIfInsufficientAllowance() public {
        vm.prank(buyer);
        // No approval
        vm.expectRevert();
        curve.buy(100 ether, 0);
    }

    // ============ Sell Tests ============

    function test_Sell_Success() public {
        // First buy some tokens
        uint256 vscAmount = 100 ether;
        vm.startPrank(buyer);
        vscToken.approve(address(curve), vscAmount);
        uint256 tokensBought = curve.buy(vscAmount, 0);

        // Now sell half
        uint256 tokensToSell = tokensBought / 2;
        uint256 buyerVscBefore = vscToken.balanceOf(buyer);
        uint256 buyerGearBefore = gearToken.balanceOf(buyer);

        uint256 vscReceived = curve.sell(tokensToSell, 0);

        assertGt(vscReceived, 0);
        assertEq(gearToken.balanceOf(buyer), buyerGearBefore - tokensToSell);
        assertEq(vscToken.balanceOf(buyer), buyerVscBefore + vscReceived);
        vm.stopPrank();
    }

    function test_Sell_EmitsEvent() public {
        // First buy some tokens
        uint256 vscAmount = 100 ether;
        vm.startPrank(buyer);
        vscToken.approve(address(curve), vscAmount);
        uint256 tokensBought = curve.buy(vscAmount, 0);

        // Calculate expected sell return
        uint256 tokensToSell = tokensBought / 2;
        (uint256 expectedVsc, uint256 expectedFee) = curve.calculateSellReturn(tokensToSell);

        vm.expectEmit(true, false, false, true);
        emit TokensSold(buyer, tokensToSell, expectedVsc, expectedFee);

        curve.sell(tokensToSell, 0);
        vm.stopPrank();
    }

    function test_Sell_FeeDistribution() public {
        // First buy some tokens
        uint256 vscAmount = 100 ether;
        vm.startPrank(buyer);
        vscToken.approve(address(curve), vscAmount);
        uint256 tokensBought = curve.buy(vscAmount, 0);

        uint256 treasuryBefore = vscToken.balanceOf(treasury);
        uint256 burnBefore = vscToken.balanceOf(burnAddress);

        // Sell tokens
        (, uint256 fee) = curve.calculateSellReturn(tokensBought);
        uint256 treasuryShare = (fee * TREASURY_SPLIT_BPS) / BPS_DENOMINATOR;
        uint256 burnShare = fee - treasuryShare;

        curve.sell(tokensBought, 0);
        vm.stopPrank();

        assertEq(vscToken.balanceOf(treasury), treasuryBefore + treasuryShare);
        assertEq(vscToken.balanceOf(burnAddress), burnBefore + burnShare);
    }

    function test_Sell_RevertIfZeroAmount() public {
        vm.prank(buyer);
        vm.expectRevert(ERC20BondingCurve.ZeroAmount.selector);
        curve.sell(0, 0);
    }

    function test_Sell_RevertIfSlippageExceeded() public {
        // First buy some tokens
        uint256 vscAmount = 100 ether;
        vm.startPrank(buyer);
        vscToken.approve(address(curve), vscAmount);
        uint256 tokensBought = curve.buy(vscAmount, 0);

        // Try to sell with unreasonable min
        vm.expectRevert(ERC20BondingCurve.InsufficientOutput.selector);
        curve.sell(tokensBought, vscAmount * 10);
        vm.stopPrank();
    }

    function test_Sell_RevertIfExceedsSupply() public {
        vm.prank(buyer);
        vm.expectRevert(ERC20BondingCurve.InsufficientLiquidity.selector);
        curve.sell(1 ether, 0);
    }

    function test_Sell_RevertWhenPaused() public {
        // First buy some tokens
        uint256 vscAmount = 100 ether;
        vm.startPrank(buyer);
        vscToken.approve(address(curve), vscAmount);
        uint256 tokensBought = curve.buy(vscAmount, 0);
        vm.stopPrank();

        vm.prank(owner);
        curve.pause();

        vm.prank(buyer);
        vm.expectRevert();
        curve.sell(tokensBought, 0);
    }

    // ============ Price Curve Tests ============

    function test_PriceIncreasesWithSupply() public {
        uint256 price1 = curve.getCurrentPrice();

        // Buy some tokens to increase supply
        vm.startPrank(buyer);
        vscToken.approve(address(curve), 1000 ether);
        curve.buy(1000 ether, 0);
        vm.stopPrank();

        uint256 price2 = curve.getCurrentPrice();
        assertGt(price2, price1);
    }

    function test_SpotPriceFormula() public view {
        // Price = BasePrice + (Slope × Supply²)
        uint256 supply = 100 ether; // 100 tokens
        uint256 expectedPrice = BASE_PRICE + (SLOPE * supply * supply / 1e36);
        uint256 actualPrice = curve.getSpotPrice(supply);
        assertEq(actualPrice, expectedPrice);
    }

    // ============ Admin Functions Tests ============

    function test_SetFeeRecipients() public {
        address newTreasury = makeAddr("newTreasury");
        address newBurn = makeAddr("newBurn");

        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit FeeRecipientsUpdated(newTreasury, newBurn);
        curve.setFeeRecipients(newTreasury, newBurn);

        assertEq(curve.treasury(), newTreasury);
        assertEq(curve.burnAddress(), newBurn);
    }

    function test_SetFeeRecipients_RevertIfNotOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        curve.setFeeRecipients(attacker, attacker);
    }

    function test_SetFeeRecipients_RevertIfZeroTreasury() public {
        vm.prank(owner);
        vm.expectRevert(ERC20BondingCurve.ZeroAddress.selector);
        curve.setFeeRecipients(address(0), burnAddress);
    }

    function test_SetFeeSplit() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit FeeSplitUpdated(7000, 3000);
        curve.setFeeSplit(7000, 3000);

        assertEq(curve.treasurySplitBps(), 7000);
        assertEq(curve.burnSplitBps(), 3000);
    }

    function test_SetFeeSplit_RevertIfNotOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        curve.setFeeSplit(5000, 5000);
    }

    function test_SetFeeSplit_RevertIfInvalid() public {
        vm.prank(owner);
        vm.expectRevert(ERC20BondingCurve.InvalidFeeSplit.selector);
        curve.setFeeSplit(5000, 4000); // Doesn't sum to 10000
    }

    function test_Pause() public {
        vm.prank(owner);
        curve.pause();
        assertTrue(curve.paused());
    }

    function test_Unpause() public {
        vm.startPrank(owner);
        curve.pause();
        curve.unpause();
        vm.stopPrank();
        assertFalse(curve.paused());
    }

    // ============ View Function Tests ============

    function test_CalculateBuyReturn() public view {
        uint256 vscAmount = 100 ether;
        (uint256 tokensOut, uint256 fee) = curve.calculateBuyReturn(vscAmount);

        assertGt(tokensOut, 0);
        assertEq(fee, (vscAmount * BUY_FEE_BPS) / BPS_DENOMINATOR);
    }

    function test_CalculateSellReturn() public {
        // First buy some tokens
        uint256 vscAmount = 100 ether;
        vm.startPrank(buyer);
        vscToken.approve(address(curve), vscAmount);
        uint256 tokensBought = curve.buy(vscAmount, 0);
        vm.stopPrank();

        (uint256 baseOut, uint256 fee) = curve.calculateSellReturn(tokensBought);

        assertGt(baseOut, 0);
        assertGt(fee, 0);
    }

    // ============ Invariant Tests ============

    function test_NoArbitage_BuyThenSell() public {
        uint256 vscAmount = 100 ether;

        vm.startPrank(buyer);
        vscToken.approve(address(curve), vscAmount);

        uint256 vscBefore = vscToken.balanceOf(buyer);
        uint256 tokensBought = curve.buy(vscAmount, 0);
        curve.sell(tokensBought, 0);
        uint256 vscAfter = vscToken.balanceOf(buyer);

        // Due to fees, user should end up with less VSC
        assertLt(vscAfter, vscBefore);
        // The loss should be at least buy fee + sell fee
        uint256 minLoss = (vscAmount * BUY_FEE_BPS) / BPS_DENOMINATOR;
        assertGe(vscBefore - vscAfter, minLoss);
        vm.stopPrank();
    }

    function test_CurveRemainsCollateralized() public {
        // Buy some tokens
        uint256 vscAmount = 1000 ether;
        vm.startPrank(buyer);
        vscToken.approve(address(curve), vscAmount);
        uint256 tokensBought = curve.buy(vscAmount, 0);
        vm.stopPrank();

        // The curve should have enough VSC to cover all sells
        uint256 curveBalance = vscToken.balanceOf(address(curve));
        (uint256 maxSellReturn,) = curve.calculateSellReturn(tokensBought);

        assertGe(curveBalance, maxSellReturn);
    }

    // ============ Fuzz Tests ============

    function testFuzz_Buy(uint256 amount) public {
        // Bound to reasonable amounts
        amount = bound(amount, 1 ether, 100_000 ether);

        vm.startPrank(buyer);
        vscToken.approve(address(curve), amount);

        uint256 tokensBefore = gearToken.balanceOf(buyer);
        uint256 tokensReceived = curve.buy(amount, 0);

        assertGt(tokensReceived, 0);
        assertEq(gearToken.balanceOf(buyer), tokensBefore + tokensReceived);
        vm.stopPrank();
    }

    function testFuzz_BuyThenSell(uint256 amount) public {
        // Bound to reasonable amounts
        amount = bound(amount, 1 ether, 100_000 ether);

        vm.startPrank(buyer);
        vscToken.approve(address(curve), amount);

        uint256 tokensBought = curve.buy(amount, 0);

        // Sell all tokens back
        uint256 vscReceived = curve.sell(tokensBought, 0);

        // Should always lose money due to fees
        assertLt(vscReceived, amount);
        vm.stopPrank();
    }

    function testFuzz_SpotPrice(uint256 supply) public view {
        // Bound supply to prevent overflow
        supply = bound(supply, 0, 1_000_000_000 ether);

        uint256 price = curve.getSpotPrice(supply);

        // Price should always be at least BASE_PRICE
        assertGe(price, BASE_PRICE);
    }
}
