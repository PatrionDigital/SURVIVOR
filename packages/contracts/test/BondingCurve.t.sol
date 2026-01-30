// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { BondingCurve } from "../src/bonding/BondingCurve.sol";
import { GearToken } from "../src/tokens/GearToken.sol";

contract BondingCurveTest is Test {
    BondingCurve public curve;
    GearToken public token;
    address public owner;
    address public treasury;
    address public burnAddress;
    address public buyer;
    address public seller;
    address public attacker;

    // Constants matching the contract
    uint256 constant BASE_PRICE = 1e14; // 0.0001 ETH
    uint256 constant SLOPE = 1e12; // 0.000001
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

        // Give buyers some ETH
        vm.deal(buyer, 100 ether);
        vm.deal(seller, 100 ether);
        vm.deal(attacker, 100 ether);

        // Deploy token
        vm.startPrank(owner);
        token = new GearToken("Weapon Core", "WEAPON", owner);

        // Deploy bonding curve
        curve = new BondingCurve(address(token), treasury, burnAddress, owner);

        // Set bonding curve as minter on token
        token.setBondingCurve(address(curve));
        vm.stopPrank();
    }

    // ============ Initial State Tests ============

    function test_InitialState() public view {
        assertEq(address(curve.token()), address(token));
        assertEq(curve.treasury(), treasury);
        assertEq(curve.burnAddress(), burnAddress);
        assertEq(curve.owner(), owner);
        assertEq(curve.buyFeeBps(), BUY_FEE_BPS);
        assertEq(curve.sellFeeBps(), SELL_FEE_BPS);
        assertEq(curve.treasurySplitBps(), TREASURY_SPLIT_BPS);
        assertEq(curve.burnSplitBps(), BURN_SPLIT_BPS);
        assertEq(curve.getCurrentPrice(), BASE_PRICE);
        assertFalse(curve.paused());
    }

    function test_Constructor_RevertIfZeroTokenAddress() public {
        vm.prank(owner);
        vm.expectRevert(BondingCurve.ZeroAddress.selector);
        new BondingCurve(address(0), treasury, burnAddress, owner);
    }

    function test_Constructor_RevertIfZeroTreasuryAddress() public {
        vm.prank(owner);
        vm.expectRevert(BondingCurve.ZeroAddress.selector);
        new BondingCurve(address(token), address(0), burnAddress, owner);
    }

    function test_Constructor_RevertIfZeroBurnAddress() public {
        vm.prank(owner);
        vm.expectRevert(BondingCurve.ZeroAddress.selector);
        new BondingCurve(address(token), treasury, address(0), owner);
    }

    // ============ Price Calculation Tests ============

    function test_GetSpotPrice_AtZeroSupply() public view {
        // Price = BasePrice + (Slope × Supply²)
        // At supply 0: Price = 1e14 + (1e12 × 0) = 1e14
        assertEq(curve.getSpotPrice(0), BASE_PRICE);
    }

    function test_GetSpotPrice_AtSupply() public view {
        // At supply 1e18 (1 token):
        // Price = 1e14 + (1e12 × (1e18)²) = 1e14 + 1e12 × 1e36 = 1e14 + 1e48
        // This would overflow, so let's use smaller supply
        // At supply 1000 (1e21 with decimals = 1000 tokens):
        // Price = 1e14 + (1e12 × (1e21)²/1e36) = 1e14 + 1e12 × 1e6 = 1e14 + 1e18
        uint256 supply = 1000 * 1e18; // 1000 tokens
        uint256 expectedPrice = BASE_PRICE + (SLOPE * supply * supply / 1e36);
        assertEq(curve.getSpotPrice(supply), expectedPrice);
    }

    function test_GetCurrentPrice_ReflectsSupply() public {
        // Initial price at 0 supply
        assertEq(curve.getCurrentPrice(), BASE_PRICE);

        // Buy some tokens
        vm.prank(buyer);
        curve.buy{ value: 1 ether }(0);

        // Price should increase
        assertGt(curve.getCurrentPrice(), BASE_PRICE);
    }

    // ============ Buy Tests ============

    function test_Buy_Success() public {
        uint256 ethAmount = 1 ether;
        uint256 initialBuyerBalance = buyer.balance;

        vm.prank(buyer);
        uint256 tokensReceived = curve.buy{ value: ethAmount }(0);

        assertGt(tokensReceived, 0);
        assertEq(token.balanceOf(buyer), tokensReceived);
        assertEq(buyer.balance, initialBuyerBalance - ethAmount);
    }

    function test_Buy_EmitsEvent() public {
        uint256 ethAmount = 1 ether;

        (uint256 expectedTokens, uint256 expectedFee) = curve.calculateBuyReturn(ethAmount);

        vm.prank(buyer);
        vm.expectEmit(true, false, false, true);
        emit TokensBought(buyer, ethAmount, expectedTokens, expectedFee);
        curve.buy{ value: ethAmount }(0);
    }

    function test_Buy_FeeCalculation() public {
        uint256 ethAmount = 1 ether;

        (uint256 tokensOut, uint256 fee) = curve.calculateBuyReturn(ethAmount);

        // Fee should be 2% of input
        uint256 expectedFee = (ethAmount * BUY_FEE_BPS) / BPS_DENOMINATOR;
        assertEq(fee, expectedFee);

        // Tokens should be based on remaining amount after fee
        assertGt(tokensOut, 0);
    }

    function test_Buy_FeeDistribution() public {
        uint256 ethAmount = 1 ether;
        uint256 initialTreasuryBalance = treasury.balance;
        uint256 initialBurnBalance = burnAddress.balance;

        vm.prank(buyer);
        curve.buy{ value: ethAmount }(0);

        uint256 fee = (ethAmount * BUY_FEE_BPS) / BPS_DENOMINATOR;
        uint256 treasuryShare = (fee * TREASURY_SPLIT_BPS) / BPS_DENOMINATOR;
        uint256 burnShare = fee - treasuryShare;

        assertEq(treasury.balance, initialTreasuryBalance + treasuryShare);
        assertEq(burnAddress.balance, initialBurnBalance + burnShare);
    }

    function test_Buy_RevertIfZeroAmount() public {
        vm.prank(buyer);
        vm.expectRevert(BondingCurve.ZeroAmount.selector);
        curve.buy{ value: 0 }(0);
    }

    function test_Buy_RevertIfSlippageExceeded() public {
        uint256 ethAmount = 1 ether;

        (uint256 expectedTokens,) = curve.calculateBuyReturn(ethAmount);

        // Request more tokens than possible
        vm.prank(buyer);
        vm.expectRevert(BondingCurve.InsufficientOutput.selector);
        curve.buy{ value: ethAmount }(expectedTokens + 1);
    }

    function test_Buy_RevertIfPaused() public {
        vm.prank(owner);
        curve.pause();

        vm.prank(buyer);
        vm.expectRevert();
        curve.buy{ value: 1 ether }(0);
    }

    // ============ Sell Tests ============

    function test_Sell_Success() public {
        // First buy some tokens
        vm.prank(buyer);
        uint256 tokensBought = curve.buy{ value: 1 ether }(0);

        uint256 initialBuyerEthBalance = buyer.balance;
        uint256 initialBuyerTokenBalance = token.balanceOf(buyer);

        // Approve and sell
        vm.startPrank(buyer);
        token.approve(address(curve), tokensBought);
        uint256 ethReceived = curve.sell(tokensBought, 0);
        vm.stopPrank();

        assertGt(ethReceived, 0);
        assertEq(token.balanceOf(buyer), initialBuyerTokenBalance - tokensBought);
        assertEq(buyer.balance, initialBuyerEthBalance + ethReceived);
    }

    function test_Sell_EmitsEvent() public {
        // First buy some tokens
        vm.prank(buyer);
        uint256 tokensBought = curve.buy{ value: 1 ether }(0);

        (uint256 expectedEth, uint256 expectedFee) = curve.calculateSellReturn(tokensBought);

        vm.startPrank(buyer);
        token.approve(address(curve), tokensBought);
        vm.expectEmit(true, false, false, true);
        emit TokensSold(buyer, tokensBought, expectedEth, expectedFee);
        curve.sell(tokensBought, 0);
        vm.stopPrank();
    }

    function test_Sell_FeeCalculation() public {
        // First buy some tokens
        vm.prank(buyer);
        uint256 tokensBought = curve.buy{ value: 1 ether }(0);

        (uint256 ethOut, uint256 fee) = curve.calculateSellReturn(tokensBought);

        // Fee should be 3% of gross output
        // The calculation is: grossOut - fee = ethOut
        // fee = grossOut * 3% => grossOut = ethOut + fee
        uint256 grossOut = ethOut + fee;
        uint256 expectedFee = (grossOut * SELL_FEE_BPS) / BPS_DENOMINATOR;

        // Allow for small rounding differences
        assertApproxEqAbs(fee, expectedFee, 1);
        assertGt(ethOut, 0);
    }

    function test_Sell_FeeDistribution() public {
        // First buy some tokens
        vm.prank(buyer);
        uint256 tokensBought = curve.buy{ value: 1 ether }(0);

        uint256 initialTreasuryBalance = treasury.balance;
        uint256 initialBurnBalance = burnAddress.balance;

        vm.startPrank(buyer);
        token.approve(address(curve), tokensBought);
        curve.sell(tokensBought, 0);
        vm.stopPrank();

        // Treasury and burn should have received fee shares
        assertGt(treasury.balance, initialTreasuryBalance);
        assertGt(burnAddress.balance, initialBurnBalance);
    }

    function test_Sell_RevertIfZeroAmount() public {
        vm.prank(buyer);
        vm.expectRevert(BondingCurve.ZeroAmount.selector);
        curve.sell(0, 0);
    }

    function test_Sell_RevertIfSlippageExceeded() public {
        // First buy some tokens
        vm.prank(buyer);
        uint256 tokensBought = curve.buy{ value: 1 ether }(0);

        (uint256 expectedEth,) = curve.calculateSellReturn(tokensBought);

        vm.startPrank(buyer);
        token.approve(address(curve), tokensBought);
        vm.expectRevert(BondingCurve.InsufficientOutput.selector);
        curve.sell(tokensBought, expectedEth + 1);
        vm.stopPrank();
    }

    function test_Sell_RevertIfInsufficientLiquidity() public {
        // Try to sell without any liquidity in curve
        vm.prank(buyer);
        vm.expectRevert(BondingCurve.InsufficientLiquidity.selector);
        curve.sell(1000, 0);
    }

    function test_Sell_RevertIfPaused() public {
        // First buy some tokens
        vm.prank(buyer);
        uint256 tokensBought = curve.buy{ value: 1 ether }(0);

        vm.prank(owner);
        curve.pause();

        vm.startPrank(buyer);
        token.approve(address(curve), tokensBought);
        vm.expectRevert();
        curve.sell(tokensBought, 0);
        vm.stopPrank();
    }

    // ============ No Profit Invariant ============

    function test_NoProfit_BuyThenSell() public {
        uint256 ethAmount = 1 ether;

        uint256 initialBalance = buyer.balance;

        // Buy tokens
        vm.prank(buyer);
        uint256 tokensBought = curve.buy{ value: ethAmount }(0);

        // Immediately sell all tokens
        vm.startPrank(buyer);
        token.approve(address(curve), tokensBought);
        curve.sell(tokensBought, 0);
        vm.stopPrank();

        // Should have less ETH than started (due to fees)
        assertLt(buyer.balance, initialBalance);
    }

    // ============ Admin Function Tests ============

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
        vm.expectRevert(BondingCurve.ZeroAddress.selector);
        curve.setFeeRecipients(address(0), burnAddress);
    }

    function test_SetFeeRecipients_RevertIfZeroBurn() public {
        vm.prank(owner);
        vm.expectRevert(BondingCurve.ZeroAddress.selector);
        curve.setFeeRecipients(treasury, address(0));
    }

    function test_SetFeeSplit() public {
        uint256 newTreasurySplit = 7000; // 70%
        uint256 newBurnSplit = 3000; // 30%

        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit FeeSplitUpdated(newTreasurySplit, newBurnSplit);
        curve.setFeeSplit(newTreasurySplit, newBurnSplit);

        assertEq(curve.treasurySplitBps(), newTreasurySplit);
        assertEq(curve.burnSplitBps(), newBurnSplit);
    }

    function test_SetFeeSplit_RevertIfNotOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        curve.setFeeSplit(5000, 5000);
    }

    function test_SetFeeSplit_RevertIfInvalidSplit() public {
        // Split must equal 100%
        vm.prank(owner);
        vm.expectRevert(BondingCurve.InvalidFeeSplit.selector);
        curve.setFeeSplit(5000, 4000); // Only 90%
    }

    // ============ Pause Tests ============

    function test_Pause() public {
        vm.prank(owner);
        curve.pause();

        assertTrue(curve.paused());
    }

    function test_Pause_RevertIfNotOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        curve.pause();
    }

    function test_Unpause() public {
        vm.startPrank(owner);
        curve.pause();
        curve.unpause();
        vm.stopPrank();

        assertFalse(curve.paused());
    }

    function test_Unpause_RevertIfNotOwner() public {
        vm.prank(owner);
        curve.pause();

        vm.prank(attacker);
        vm.expectRevert();
        curve.unpause();
    }

    // ============ View Function Tests ============

    function test_CalculateBuyReturn_ConsistentWithActualBuy() public {
        uint256 ethAmount = 1 ether;

        (uint256 expectedTokens, uint256 expectedFee) = curve.calculateBuyReturn(ethAmount);

        vm.prank(buyer);
        uint256 actualTokens = curve.buy{ value: ethAmount }(0);

        assertEq(actualTokens, expectedTokens);
        // Fee is verified through treasury/burn balance changes
    }

    function test_CalculateSellReturn_ConsistentWithActualSell() public {
        // First buy some tokens
        vm.prank(buyer);
        uint256 tokensBought = curve.buy{ value: 1 ether }(0);

        (uint256 expectedEth,) = curve.calculateSellReturn(tokensBought);

        vm.startPrank(buyer);
        token.approve(address(curve), tokensBought);
        uint256 actualEth = curve.sell(tokensBought, 0);
        vm.stopPrank();

        assertEq(actualEth, expectedEth);
    }

    // ============ Fuzz Tests ============

    function testFuzz_Buy(uint256 ethAmount) public {
        // Bound to reasonable amounts (0.001 ETH to 10 ETH)
        ethAmount = bound(ethAmount, 0.001 ether, 10 ether);

        vm.prank(buyer);
        uint256 tokensReceived = curve.buy{ value: ethAmount }(0);

        assertGt(tokensReceived, 0);
        assertEq(token.balanceOf(buyer), tokensReceived);
    }

    function testFuzz_Sell(uint256 ethAmount) public {
        // Bound to reasonable amounts
        ethAmount = bound(ethAmount, 0.001 ether, 10 ether);

        // Buy first
        vm.prank(buyer);
        uint256 tokensBought = curve.buy{ value: ethAmount }(0);

        uint256 balanceBefore = buyer.balance;

        // Sell all
        vm.startPrank(buyer);
        token.approve(address(curve), tokensBought);
        uint256 ethReceived = curve.sell(tokensBought, 0);
        vm.stopPrank();

        assertGt(ethReceived, 0);
        assertEq(buyer.balance, balanceBefore + ethReceived);
        assertEq(token.balanceOf(buyer), 0);
    }

    function testFuzz_NoProfit(uint256 ethAmount) public {
        ethAmount = bound(ethAmount, 0.001 ether, 10 ether);

        uint256 initialBalance = buyer.balance;

        // Buy
        vm.prank(buyer);
        uint256 tokensBought = curve.buy{ value: ethAmount }(0);

        // Sell immediately
        vm.startPrank(buyer);
        token.approve(address(curve), tokensBought);
        curve.sell(tokensBought, 0);
        vm.stopPrank();

        // Should always lose money due to fees
        assertLt(buyer.balance, initialBalance);
    }

    // ============ Collateralization Invariant ============

    function test_AlwaysCollateralized() public {
        // Do multiple buys and sells
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(buyer);
            curve.buy{ value: 0.5 ether }(0);
        }

        uint256 totalSupply = token.totalSupply();
        uint256 curveBalance = address(curve).balance;

        // Calculate value needed to buy back all tokens
        // Curve should always have enough to cover sells
        if (totalSupply > 0) {
            (uint256 sellValue,) = curve.calculateSellReturn(totalSupply);
            assertGe(curveBalance, sellValue, "Curve not fully collateralized");
        }
    }

    // ============ Edge Cases ============

    function test_MultipleBuysAndSells() public {
        // Buy
        vm.prank(buyer);
        uint256 tokens1 = curve.buy{ value: 1 ether }(0);

        // Another buy
        vm.prank(seller);
        uint256 tokens2 = curve.buy{ value: 0.5 ether }(0);

        // Partial sell
        vm.startPrank(buyer);
        token.approve(address(curve), tokens1 / 2);
        curve.sell(tokens1 / 2, 0);
        vm.stopPrank();

        // Verify balances
        assertEq(token.balanceOf(buyer), tokens1 - tokens1 / 2);
        assertEq(token.balanceOf(seller), tokens2);
        assertEq(token.totalSupply(), tokens1 - tokens1 / 2 + tokens2);
    }

    function test_SmallAmounts() public {
        uint256 smallAmount = 0.0001 ether;

        vm.prank(buyer);
        uint256 tokensReceived = curve.buy{ value: smallAmount }(0);

        assertGt(tokensReceived, 0);
    }

    function test_LargeAmounts() public {
        uint256 largeAmount = 50 ether;

        vm.prank(buyer);
        uint256 tokensReceived = curve.buy{ value: largeAmount }(0);

        assertGt(tokensReceived, 0);
        assertEq(token.balanceOf(buyer), tokensReceived);
    }
}
