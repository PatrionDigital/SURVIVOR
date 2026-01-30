// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMintableBurnable {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function totalSupply() external view returns (uint256);
}

/**
 * @title BondingCurve
 * @notice Polynomial bonding curve AMM for token trading
 * @dev Formula: Price = BasePrice + (Slope × Supply²)
 *      Supports ETH <-> Token trading with fee distribution
 */
contract BondingCurve is Ownable2Step, Pausable, ReentrancyGuard {
    // ============ Constants ============
    uint256 public constant BASE_PRICE = 1e14; // 0.0001 ETH
    uint256 public constant SLOPE = 1e12; // 0.000001
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ============ Immutables ============
    IMintableBurnable public immutable token;

    // ============ State ============
    uint256 public buyFeeBps = 200; // 2%
    uint256 public sellFeeBps = 300; // 3%
    uint256 public treasurySplitBps = 6000; // 60%
    uint256 public burnSplitBps = 4000; // 40%

    address public treasury;
    address public burnAddress;

    // ============ Events ============
    event TokensBought(
        address indexed buyer, uint256 baseAmount, uint256 tokensReceived, uint256 fee
    );
    event TokensSold(
        address indexed seller, uint256 tokenAmount, uint256 baseReceived, uint256 fee
    );
    event FeeRecipientsUpdated(address indexed treasury, address indexed burnAddress);
    event FeeSplitUpdated(uint256 treasuryBps, uint256 burnBps);

    // ============ Errors ============
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientOutput();
    error InsufficientLiquidity();
    error InvalidFeeSplit();
    error TransferFailed();

    // ============ Constructor ============
    /**
     * @notice Initialize bonding curve
     * @param _token Address of the token to trade
     * @param _treasury Address to receive treasury fees
     * @param _burnAddress Address to receive burn fees (or actual burn)
     * @param _owner Initial owner address
     */
    constructor(address _token, address _treasury, address _burnAddress, address _owner)
        Ownable(_owner)
    {
        if (_token == address(0)) revert ZeroAddress();
        if (_treasury == address(0)) revert ZeroAddress();
        if (_burnAddress == address(0)) revert ZeroAddress();

        token = IMintableBurnable(_token);
        treasury = _treasury;
        burnAddress = _burnAddress;
    }

    // ============ External Functions ============

    /**
     * @notice Buy tokens with ETH
     * @param minTokensOut Minimum tokens to receive (slippage protection)
     * @return tokensReceived Amount of tokens received
     */
    function buy(uint256 minTokensOut)
        external
        payable
        nonReentrant
        whenNotPaused
        returns (uint256 tokensReceived)
    {
        if (msg.value == 0) revert ZeroAmount();

        // Calculate fee
        uint256 fee = (msg.value * buyFeeBps) / BPS_DENOMINATOR;
        uint256 netAmount = msg.value - fee;

        // Calculate tokens to mint
        uint256 currentSupply = token.totalSupply();
        tokensReceived = _calculateTokensForEth(netAmount, currentSupply);

        if (tokensReceived < minTokensOut) revert InsufficientOutput();

        // Distribute fee
        _distributeFee(fee);

        // Mint tokens to buyer
        token.mint(msg.sender, tokensReceived);

        emit TokensBought(msg.sender, msg.value, tokensReceived, fee);
    }

    /**
     * @notice Sell tokens for ETH
     * @param tokenAmount Amount of tokens to sell
     * @param minBaseOut Minimum ETH to receive (slippage protection)
     * @return baseReceived Amount of ETH received
     */
    function sell(uint256 tokenAmount, uint256 minBaseOut)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 baseReceived)
    {
        if (tokenAmount == 0) revert ZeroAmount();

        uint256 currentSupply = token.totalSupply();
        if (tokenAmount > currentSupply) revert InsufficientLiquidity();

        // Calculate gross ETH value
        uint256 grossEth = _calculateEthForTokens(tokenAmount, currentSupply);
        if (grossEth > address(this).balance) revert InsufficientLiquidity();

        // Calculate fee from gross
        uint256 fee = (grossEth * sellFeeBps) / BPS_DENOMINATOR;
        baseReceived = grossEth - fee;

        if (baseReceived < minBaseOut) revert InsufficientOutput();

        // Burn tokens from seller
        token.burn(msg.sender, tokenAmount);

        // Distribute fee
        _distributeFee(fee);

        // Send ETH to seller
        (bool success,) = payable(msg.sender).call{ value: baseReceived }("");
        if (!success) revert TransferFailed();

        emit TokensSold(msg.sender, tokenAmount, baseReceived, fee);
    }

    // ============ View Functions ============

    /**
     * @notice Calculate tokens received for a given ETH amount
     * @param baseAmount ETH amount to spend
     * @return tokensOut Tokens that would be received
     * @return fee Fee that would be charged
     */
    function calculateBuyReturn(uint256 baseAmount)
        external
        view
        returns (uint256 tokensOut, uint256 fee)
    {
        fee = (baseAmount * buyFeeBps) / BPS_DENOMINATOR;
        uint256 netAmount = baseAmount - fee;
        tokensOut = _calculateTokensForEth(netAmount, token.totalSupply());
    }

    /**
     * @notice Calculate ETH received for selling tokens
     * @param tokenAmount Tokens to sell
     * @return baseOut ETH that would be received
     * @return fee Fee that would be charged
     */
    function calculateSellReturn(uint256 tokenAmount)
        external
        view
        returns (uint256 baseOut, uint256 fee)
    {
        uint256 currentSupply = token.totalSupply();
        uint256 grossEth = _calculateEthForTokens(tokenAmount, currentSupply);
        fee = (grossEth * sellFeeBps) / BPS_DENOMINATOR;
        baseOut = grossEth - fee;
    }

    /**
     * @notice Get current spot price
     * @return Current price based on supply
     */
    function getCurrentPrice() external view returns (uint256) {
        return getSpotPrice(token.totalSupply());
    }

    /**
     * @notice Get spot price at a given supply
     * @param supply Token supply to calculate price for
     * @return price Price at the given supply level
     */
    function getSpotPrice(uint256 supply) public pure returns (uint256 price) {
        // Price = BasePrice + (Slope × Supply²)
        // We need to scale supply since it's in 18 decimals
        // supply² / 1e36 gives us the supply in "whole tokens" squared
        price = BASE_PRICE + (SLOPE * supply * supply / 1e36);
    }

    // ============ Admin Functions ============

    /**
     * @notice Set fee recipient addresses
     * @param _treasury New treasury address
     * @param _burnAddress New burn address
     */
    function setFeeRecipients(address _treasury, address _burnAddress) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        if (_burnAddress == address(0)) revert ZeroAddress();

        treasury = _treasury;
        burnAddress = _burnAddress;

        emit FeeRecipientsUpdated(_treasury, _burnAddress);
    }

    /**
     * @notice Set fee split between treasury and burn
     * @param _treasurySplitBps Treasury share in basis points
     * @param _burnSplitBps Burn share in basis points
     */
    function setFeeSplit(uint256 _treasurySplitBps, uint256 _burnSplitBps) external onlyOwner {
        if (_treasurySplitBps + _burnSplitBps != BPS_DENOMINATOR) revert InvalidFeeSplit();

        treasurySplitBps = _treasurySplitBps;
        burnSplitBps = _burnSplitBps;

        emit FeeSplitUpdated(_treasurySplitBps, _burnSplitBps);
    }

    /**
     * @notice Pause trading
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause trading
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Internal Functions ============

    /**
     * @notice Calculate tokens purchasable with given ETH
     * @dev Uses integral of price curve: Cost = B*(S1-S0) + Slope*(S1³-S0³)/3
     *      Solving for S1 given cost and S0 requires numerical methods
     *      We use a simplified approximation for reasonable amounts
     */
    function _calculateTokensForEth(uint256 ethAmount, uint256 currentSupply)
        internal
        pure
        returns (uint256)
    {
        // For polynomial curve, we need to solve:
        // ethAmount = integral from currentSupply to newSupply of (BASE_PRICE + SLOPE * s²) ds
        // ethAmount = BASE_PRICE * (newSupply - currentSupply) + SLOPE * (newSupply³ -
        // currentSupply³) / 3

        // This is a cubic equation. For simplicity, we use binary search.
        uint256 low = 0;
        // Upper bound: at minimum price (BASE_PRICE), how many tokens could we get?
        // tokens = ethAmount * 1e18 / BASE_PRICE, but avoid overflow
        uint256 high = (ethAmount / BASE_PRICE) * 1e18;
        if (high == 0) high = 1e18; // At least try 1 token

        // Binary search for the correct token amount
        for (uint256 i = 0; i < 256; i++) {
            if (high <= low + 1) break;
            uint256 mid = (low + high) / 2;
            uint256 cost = _calculateCost(currentSupply, currentSupply + mid);
            if (cost <= ethAmount) low = mid;
            else high = mid;
        }

        return low;
    }

    /**
     * @notice Calculate ETH value of selling tokens
     * @dev Uses integral: Value = B*(S0-S1) + Slope*(S0³-S1³)/3
     */
    function _calculateEthForTokens(uint256 tokenAmount, uint256 currentSupply)
        internal
        pure
        returns (uint256)
    {
        if (tokenAmount > currentSupply) return 0;
        uint256 newSupply = currentSupply - tokenAmount;
        return _calculateCost(newSupply, currentSupply);
    }

    /**
     * @notice Calculate cost to move from supplyFrom to supplyTo
     * @dev Integral of Price = B + S*supply² from supplyFrom to supplyTo
     *      = B*(supplyTo - supplyFrom) + S*(supplyTo³ - supplyFrom³)/3
     */
    function _calculateCost(uint256 supplyFrom, uint256 supplyTo) internal pure returns (uint256) {
        if (supplyTo <= supplyFrom) return 0;

        uint256 supplyDiff = supplyTo - supplyFrom;

        // Base price component: BASE_PRICE * (supplyTo - supplyFrom)
        // Need to divide by 1e18 since supply is in 18 decimals
        uint256 baseCost = (BASE_PRICE * supplyDiff) / 1e18;

        // Slope component: SLOPE * (supplyTo³ - supplyFrom³) / 3
        // To avoid overflow, we normalize supply to "whole tokens" (divide by 1e18)
        // then calculate cube, then scale result
        uint256 toNorm = supplyTo / 1e18;
        uint256 fromNorm = supplyFrom / 1e18;

        // (to³ - from³) in whole tokens, result needs to scale back
        uint256 toCubed = toNorm * toNorm * toNorm;
        uint256 fromCubed = fromNorm * fromNorm * fromNorm;

        // SLOPE * (toCubed - fromCubed) / 3, result in wei
        uint256 slopeCost = (SLOPE * (toCubed - fromCubed)) / 3;

        return baseCost + slopeCost;
    }

    /**
     * @notice Distribute fee to treasury and burn address
     */
    function _distributeFee(uint256 fee) internal {
        if (fee == 0) return;

        uint256 treasuryShare = (fee * treasurySplitBps) / BPS_DENOMINATOR;
        uint256 burnShare = fee - treasuryShare;

        if (treasuryShare > 0) {
            (bool success,) = payable(treasury).call{ value: treasuryShare }("");
            if (!success) revert TransferFailed();
        }

        if (burnShare > 0) {
            (bool success,) = payable(burnAddress).call{ value: burnShare }("");
            if (!success) revert TransferFailed();
        }
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable { }
}
