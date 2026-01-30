// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IMintableBurnable {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function totalSupply() external view returns (uint256);
}

/**
 * @title ERC20BondingCurve
 * @notice Polynomial bonding curve AMM for ERC20 token trading (VSC <-> Gear)
 * @dev Formula: Price = BasePrice + (Slope × Supply²)
 *      Supports ERC20 (VSC) <-> Token (Gear) trading with fee distribution
 */
contract ERC20BondingCurve is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    uint256 public constant BASE_PRICE = 1e18; // 1 VSC per token at zero supply
    uint256 public constant SLOPE = 1e14; // Scaled for VSC decimals
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ============ Immutables ============
    IERC20 public immutable baseToken; // VSC token
    IMintableBurnable public immutable token; // Gear token

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

    // ============ Constructor ============
    /**
     * @notice Initialize ERC20 bonding curve
     * @param _baseToken Address of the base token (VSC)
     * @param _token Address of the token to trade (Gear)
     * @param _treasury Address to receive treasury fees
     * @param _burnAddress Address to receive burn fees
     * @param _owner Initial owner address
     */
    constructor(
        address _baseToken,
        address _token,
        address _treasury,
        address _burnAddress,
        address _owner
    ) Ownable(_owner) {
        if (_baseToken == address(0)) revert ZeroAddress();
        if (_token == address(0)) revert ZeroAddress();
        if (_treasury == address(0)) revert ZeroAddress();
        if (_burnAddress == address(0)) revert ZeroAddress();

        baseToken = IERC20(_baseToken);
        token = IMintableBurnable(_token);
        treasury = _treasury;
        burnAddress = _burnAddress;
    }

    // ============ External Functions ============

    /**
     * @notice Buy gear tokens with VSC
     * @param baseAmount Amount of VSC to spend
     * @param minTokensOut Minimum tokens to receive (slippage protection)
     * @return tokensReceived Amount of gear tokens received
     */
    function buy(uint256 baseAmount, uint256 minTokensOut)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 tokensReceived)
    {
        if (baseAmount == 0) revert ZeroAmount();

        // Transfer VSC from buyer to this contract
        baseToken.safeTransferFrom(msg.sender, address(this), baseAmount);

        // Calculate fee
        uint256 fee = (baseAmount * buyFeeBps) / BPS_DENOMINATOR;
        uint256 netAmount = baseAmount - fee;

        // Calculate tokens to mint
        uint256 currentSupply = token.totalSupply();
        tokensReceived = _calculateTokensForBase(netAmount, currentSupply);

        if (tokensReceived < minTokensOut) revert InsufficientOutput();

        // Distribute fee
        _distributeFee(fee);

        // Mint tokens to buyer
        token.mint(msg.sender, tokensReceived);

        emit TokensBought(msg.sender, baseAmount, tokensReceived, fee);
    }

    /**
     * @notice Sell gear tokens for VSC
     * @param tokenAmount Amount of gear tokens to sell
     * @param minBaseOut Minimum VSC to receive (slippage protection)
     * @return baseReceived Amount of VSC received
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

        // Calculate gross VSC value
        uint256 grossBase = _calculateBaseForTokens(tokenAmount, currentSupply);
        if (grossBase > baseToken.balanceOf(address(this))) revert InsufficientLiquidity();

        // Calculate fee from gross
        uint256 fee = (grossBase * sellFeeBps) / BPS_DENOMINATOR;
        baseReceived = grossBase - fee;

        if (baseReceived < minBaseOut) revert InsufficientOutput();

        // Burn tokens from seller
        token.burn(msg.sender, tokenAmount);

        // Distribute fee
        _distributeFee(fee);

        // Send VSC to seller
        baseToken.safeTransfer(msg.sender, baseReceived);

        emit TokensSold(msg.sender, tokenAmount, baseReceived, fee);
    }

    // ============ View Functions ============

    /**
     * @notice Calculate tokens received for a given VSC amount
     * @param baseAmount VSC amount to spend
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
        tokensOut = _calculateTokensForBase(netAmount, token.totalSupply());
    }

    /**
     * @notice Calculate VSC received for selling tokens
     * @param tokenAmount Tokens to sell
     * @return baseOut VSC that would be received
     * @return fee Fee that would be charged
     */
    function calculateSellReturn(uint256 tokenAmount)
        external
        view
        returns (uint256 baseOut, uint256 fee)
    {
        uint256 currentSupply = token.totalSupply();
        uint256 grossBase = _calculateBaseForTokens(tokenAmount, currentSupply);
        fee = (grossBase * sellFeeBps) / BPS_DENOMINATOR;
        baseOut = grossBase - fee;
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
     * @return price Price at the given supply level (in VSC per token)
     */
    function getSpotPrice(uint256 supply) public pure returns (uint256 price) {
        // Price = BasePrice + (Slope × Supply²)
        // Supply is in 18 decimals, need to scale appropriately
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
     * @notice Calculate tokens purchasable with given VSC
     * @dev Uses integral of price curve with binary search
     */
    function _calculateTokensForBase(uint256 baseAmount, uint256 currentSupply)
        internal
        pure
        returns (uint256)
    {
        // For polynomial curve, we need to solve:
        // baseAmount = integral from currentSupply to newSupply of (BASE_PRICE + SLOPE * s²) ds

        // This is a cubic equation. For simplicity, we use binary search.
        uint256 low = 0;
        // Upper bound: at minimum price (BASE_PRICE), how many tokens could we get?
        uint256 high = (baseAmount / BASE_PRICE) * 1e18;
        if (high == 0) high = 1e18; // At least try 1 token

        // Binary search for the correct token amount
        for (uint256 i = 0; i < 256; i++) {
            if (high <= low + 1) break;
            uint256 mid = (low + high) / 2;
            uint256 cost = _calculateCost(currentSupply, currentSupply + mid);
            if (cost <= baseAmount) low = mid;
            else high = mid;
        }

        return low;
    }

    /**
     * @notice Calculate VSC value of selling tokens
     */
    function _calculateBaseForTokens(uint256 tokenAmount, uint256 currentSupply)
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
        uint256 toNorm = supplyTo / 1e18;
        uint256 fromNorm = supplyFrom / 1e18;

        // (to³ - from³) in whole tokens
        uint256 toCubed = toNorm * toNorm * toNorm;
        uint256 fromCubed = fromNorm * fromNorm * fromNorm;

        // SLOPE * (toCubed - fromCubed) / 3, result in base token units
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

        if (treasuryShare > 0) baseToken.safeTransfer(treasury, treasuryShare);

        if (burnShare > 0) baseToken.safeTransfer(burnAddress, burnShare);
    }
}
