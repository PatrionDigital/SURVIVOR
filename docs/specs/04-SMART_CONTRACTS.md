# 04 - Smart Contract Specifications

## Contract Architecture

All contracts MUST implement `Pausable` from OpenZeppelin for emergency response.

```mermaid
┌─────────────────────────────────────────────────────────────────┐
│                     CONTRACT HIERARCHY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  VSCToken   │    │ GearToken   │    │ EarlyAdopter│        │
│  │  (ERC-20)   │    │  (ERC-20)   │    │    NFT      │        │
│  │  Pausable   │    │  Pausable   │    │  (ERC-721)  │        │
│  └──────┬──────┘    └──────┬──────┘    │  Pausable   │        │
│         │                  │           └─────────────┘         │
│         │                  │                                    │
│         ▼                  ▼                                    │
│  ┌─────────────────────────────────────┐                       │
│  │         BondingCurve                 │                       │
│  │  - $VSC <-> ETH curve               │                       │
│  │  - $GEAR <-> $VSC curves (x6)       │                       │
│  │  Pausable                           │                       │
│  └──────────────────┬──────────────────┘                       │
│                     │                                           │
│                     ▼                                           │
│  ┌─────────────────────────────────────┐                       │
│  │         GearStaking                  │                       │
│  │  - Stake gear tokens to slots       │                       │
│  │  - Calculate gear power             │                       │
│  │  Pausable                           │                       │
│  └──────────────────┬──────────────────┘                       │
│                     │                                           │
│                     ▼                                           │
│  ┌─────────────────────────────────────┐                       │
│  │       MaintenancePool                │                       │
│  │  - Track $VSC maintenance deposits  │                       │
│  │  - Apply weekly decay               │                       │
│  │  Pausable                           │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
│  ┌─────────────────────────────────────┐                       │
│  │      RewardDistributor               │                       │
│  │  - Mint $VSC for gameplay rewards   │                       │
│  │  - Backend-authorized claims        │                       │
│  │  Pausable                           │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
│  ┌─────────────────────────────────────┐                       │
│  │      GlobalUpgradeNFT                │                       │
│  │  - ERC-1155 permanent upgrades      │                       │
│  │  - Progressive minting cost         │                       │
│  │  Pausable                           │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
│  ┌─────────────────────────────────────┐                       │
│  │      FutarchyMarket                  │  (Phase 2: +6mo)     │
│  │  - Binary prediction markets        │                       │
│  │  - TWAP-based settlement            │                       │
│  │  Pausable                           │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## VSCToken.sol

Primary ERC-20 token for Farcaster Survivors.

### Specifications

| Property   | Value                            |
| ---------- | -------------------------------- |
| Name       | Vampire Survivor Clone           |
| Symbol     | VSC                              |
| Decimals   | 18                               |
| Max Supply | 100,000,000,000 (100B)           |
| Mintable   | Yes (authorized minters only)    |
| Burnable   | Yes (anyone can burn own tokens) |
| Pausable   | Yes                              |
| Ownable    | Ownable2Step                     |

### Initial Allocation (minted at deployment)

| Recipient          | Amount | Notes                                |
| ------------------ | ------ | ------------------------------------ |
| Team & Advisors    | 24B    | To Hedgey vesting contract           |
| Treasury           | 24B    | To treasury multisig                 |
| Liquidity          | 6B     | To bonding curve                     |
| Airdrop            | 4B     | To merkle distributor                |
| Gameplay Emissions | 42B    | Mint capability to RewardDistributor |

### Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVSCToken {
    // Events
    event MinterAuthorized(address indexed minter, bool authorized);
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    // Errors
    error NotAuthorized();
    error ExceedsMaxSupply();
    error ZeroAddress();
    error ZeroAmount();

    // Minting
    function mint(address to, uint256 amount) external;
    function setMinter(address minter, bool authorized) external;
    function authorizedMinters(address minter) external view returns (bool);

    // Burning
    function burn(uint256 amount) external;

    // Views
    function remainingSupply() external view returns (uint256);
    function totalMinted() external view returns (uint256);

    // Pausable
    function pause() external;
    function unpause() external;
}
```

---

## GearToken.sol

Template for 6 gear tokens. Deploy 6 instances with different names/symbols.

### Gear Specifications

| Property   | Value                           |
| ---------- | ------------------------------- |
| Decimals   | 18                              |
| Max Supply | Uncapped (bonding curve minted) |
| Mintable   | Yes (BondingCurve only)         |
| Burnable   | Yes (BondingCurve only)         |
| Pausable   | Yes                             |

### Token Instances

| Name          | Symbol | Gear Slot | Stat Bonus          |
| ------------- | ------ | --------- | ------------------- |
| Weapon Core   | WEAPON | 0         | +% Base Damage      |
| Armor Plate   | ARMOR  | 1         | +% Damage Reduction |
| Power Belt    | POWER  | 2         | +% Area of Effect   |
| Combat Gloves | GLOVES | 3         | +% Attack Speed     |
| Amulet        | AMULET | 4         | +% XP Gain          |
| Swift Boots   | BOOTS  | 5         | +% Movement Speed   |

### Gear Interface

```solidity
interface IGearToken {
    // Events
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    // Errors
    error NotBondingCurve();
    error ZeroAddress();
    error ZeroAmount();

    // Minting/Burning (BondingCurve only)
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;

    // Views
    function bondingCurve() external view returns (address);
    function totalSupply() external view returns (uint256);

    // Pausable
    function pause() external;
    function unpause() external;
}
```

---

## BondingCurve.sol

Polynomial AMM for token trading.

### Curve Formula

```text
Price = BasePrice + (Slope × Supply²)
```

### Parameters

| Parameter     | Value    | Notes                |
| ------------- | -------- | -------------------- |
| Base Price    | 0.0001   | 1e14 wei equivalent  |
| Slope         | 0.000001 | 1e12                 |
| Reserve Ratio | 100%     | Fully collateralized |
| Buy Fee       | 2%       | 200 basis points     |
| Sell Fee      | 3%       | 300 basis points     |

### Fee Distribution

| Destination | Split | Purpose                  |
| ----------- | ----- | ------------------------ |
| Treasury    | 60%   | Operations & development |
| Burn        | 40%   | Deflationary pressure    |

### Curves to Deploy

1. $VSC <-> ETH (primary liquidity)
2. $WEAPON <-> $VSC
3. $ARMOR <-> $VSC
4. $POWER <-> $VSC
5. $GLOVES <-> $VSC
6. $AMULET <-> $VSC
7. $BOOTS <-> $VSC

### Bonding Curve Interface

```solidity
interface IBondingCurve {
    // Events
    event TokensBought(address indexed buyer, uint256 baseAmount, uint256 tokensReceived, uint256 fee);
    event TokensSold(address indexed seller, uint256 tokenAmount, uint256 baseReceived, uint256 fee);
    event FeeRecipientUpdated(address treasury, address burn);
    event FeeSplitUpdated(uint256 treasuryBps, uint256 burnBps);

    // Errors
    error InsufficientOutput();
    error InsufficientLiquidity();
    error ZeroAmount();
    error InvalidFeeSplit();

    // Trading
    function buy(uint256 minTokensOut) external payable returns (uint256 tokensReceived);
    function sell(uint256 tokenAmount, uint256 minBaseOut) external returns (uint256 baseReceived);

    // Price Views
    function calculateBuyReturn(uint256 baseAmount) external view returns (uint256 tokensOut, uint256 fee);
    function calculateSellReturn(uint256 tokenAmount) external view returns (uint256 baseOut, uint256 fee);
    function getCurrentPrice() external view returns (uint256);
    function getSpotPrice(uint256 supply) external pure returns (uint256);

    // Admin
    function setFeeRecipients(address treasury, address burn) external;
    function setFeeSplit(uint256 treasuryBps, uint256 burnBps) external;

    // Pausable
    function pause() external;
    function unpause() external;
}
```

---

## GearStaking.sol

Manages gear slot staking and power calculation.

### Gear Slots

| Slot | Token   | Stat Bonus          |
| ---- | ------- | ------------------- |
| 0    | $WEAPON | +% Base Damage      |
| 1    | $ARMOR  | +% Damage Reduction |
| 2    | $POWER  | +% Area of Effect   |
| 3    | $GLOVES | +% Attack Speed     |
| 4    | $AMULET | +% XP Gain          |
| 5    | $BOOTS  | +% Movement Speed   |

### Power Calculation

```text
basePower = sqrt(stakedAmount) * slotMultiplier
maintenanceBonus = basePower * 0.5 (if maintenance pool >= threshold)
totalPower = basePower + maintenanceBonus
```

### Tier Thresholds (for rarity display)

| Tier      | Minimum Staked |
| --------- | -------------- |
| Common    | 1              |
| Uncommon  | 100            |
| Rare      | 1,000          |
| Epic      | 10,000         |
| Legendary | 100,000        |

### Fees

| Action  | Fee | Destination |
| ------- | --- | ----------- |
| Stake   | 5%  | Treasury    |
| Unstake | 0%  | -           |

### Staking Interface

```solidity
interface IGearStaking {
    // Events
    event TokensStaked(address indexed player, uint8 slot, uint256 amount, uint256 fee);
    event TokensUnstaked(address indexed player, uint8 slot, uint256 amount);
    event PowerUpdated(address indexed player, uint256 totalPower);

    // Errors
    error InvalidSlot();
    error InsufficientStake();
    error ZeroAmount();

    // Staking
    function stake(uint8 slot, uint256 amount) external;
    function unstake(uint8 slot, uint256 amount) external;

    // Views
    function getStakedAmount(address player, uint8 slot) external view returns (uint256);
    function getGearPower(address player, uint8 slot) external view returns (uint256);
    function getTotalPower(address player) external view returns (uint256);
    function getPlayerStats(address player) external view returns (PlayerStats memory);
    function getTier(uint256 stakedAmount) external pure returns (uint8);

    // Pausable
    function pause() external;
    function unpause() external;
}

struct PlayerStats {
    uint256[6] stakedAmounts;
    uint256[6] slotPowers;
    uint256 totalPower;
    bool maintenanceActive;
}
```

---

## MaintenancePool.sol

Handles maintenance deposits and decay.

### Mechanics

- Players deposit $VSC to their maintenance pool
- Pool decays at 1% per week
- When pool >= threshold, gear gets +50% bonus power
- Threshold = sum of all staked gear values × maintenance multiplier

### Decay Calculation

```text
decayPerBlock = (poolBalance * weeklyDecayRate) / blocksPerWeek
currentBalance = lastBalance - (decayPerBlock * blocksSinceLastUpdate)
```

### Maintenance Interface

```solidity
interface IMaintenancePool {
    // Events
    event MaintenanceDeposited(address indexed player, uint256 amount);
    event MaintenanceWithdrawn(address indexed player, uint256 amount);
    event DecayApplied(address indexed player, uint256 decayAmount, uint256 newBalance);
    event MaintenanceStatusChanged(address indexed player, bool active);

    // Errors
    error InsufficientBalance();
    error ExceedsThreshold();
    error ZeroAmount();

    // Deposits
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;

    // Views
    function getPoolBalance(address player) external view returns (uint256);
    function getThreshold(address player) external view returns (uint256);
    function getMaintenanceStatus(address player) external view returns (bool);
    function getPendingDecay(address player) external view returns (uint256);

    // Decay
    function applyDecay(address player) external;

    // Admin
    function setDecayRate(uint256 weeklyRateBps) external;
    function setMaintenanceMultiplier(uint256 multiplier) external;

    // Pausable
    function pause() external;
    function unpause() external;
}
```

---

## RewardDistributor.sol

Manages gameplay reward emissions.

### Authorization

- Backend signs reward claims with authorized signer key
- Signature includes: player, amount, nonce, expiry
- Nonces prevent replay attacks

### Reward Types

| Type ID | Name          | Description             |
| ------- | ------------- | ----------------------- |
| 0       | Gameplay      | Survival time, kills    |
| 1       | Daily Login   | Consecutive login bonus |
| 2       | Achievement   | One-time milestones     |
| 3       | Social Action | Casts, referrals        |

### Limits

| Limit            | Value          | Notes          |
| ---------------- | -------------- | -------------- |
| Daily Player Cap | 10,000 $VSC    | Configurable   |
| Global Daily Cap | 1,000,000 $VSC | Configurable   |
| Claim Cooldown   | 60 seconds     | Between claims |

### Rewards Interface

```solidity
interface IRewardDistributor {
    // Events
    event RewardClaimed(address indexed player, uint256 amount, uint8 rewardType, uint256 nonce);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event DailyCapUpdated(uint256 playerCap, uint256 globalCap);

    // Errors
    error InvalidSignature();
    error NonceAlreadyUsed();
    error ClaimExpired();
    error DailyCapExceeded();
    error CooldownActive();

    // Claims
    function claim(
        uint256 amount,
        uint8 rewardType,
        uint256 nonce,
        uint256 expiry,
        bytes calldata signature
    ) external;

    // Views
    function getDailyClaimed(address player) external view returns (uint256);
    function getGlobalDailyClaimed() external view returns (uint256);
    function isNonceUsed(address player, uint256 nonce) external view returns (bool);
    function getLastClaimTime(address player) external view returns (uint256);

    // Admin
    function setAuthorizedSigner(address signer) external;
    function setDailyPlayerCap(uint256 cap) external;
    function setGlobalDailyCap(uint256 cap) external;

    // Pausable
    function pause() external;
    function unpause() external;
}
```

---

## GlobalUpgradeNFT.sol

ERC-1155 for permanent stat upgrades.

### Upgrade Types

| Token ID | Name            | Effect                  |
| -------- | --------------- | ----------------------- |
| 1        | Max Health      | +5% per level           |
| 2        | Base Damage     | +5% per level           |
| 3        | Move Speed      | +5% per level           |
| 4        | XP Gain         | +5% per level           |
| 5        | Pickup Range    | +10% per level          |
| 6        | Revival         | +1 extra life per level |
| 7        | Starting Weapon | +1 slot per level       |

### Cost Formula

```text
cost = baseCost * (1 + (ownedCount * escalationMultiplier))
```

### Upgrades Parameters

| Parameter             | Value      |
| --------------------- | ---------- |
| Base Cost             | 1,000 $VSC |
| Escalation Multiplier | 0.5 (50%)  |
| Max Per Type          | 10         |

### Upgrades Interface

```solidity
interface IGlobalUpgradeNFT {
    // Events
    event UpgradeMinted(address indexed player, uint256 upgradeType, uint256 cost);

    // Errors
    error InvalidUpgradeType();
    error MaxUpgradesReached();
    error InsufficientPayment();

    // Minting
    function mint(uint256 upgradeType) external;

    // Views
    function getMintCost(address player, uint256 upgradeType) external view returns (uint256);
    function getUpgradeCount(address player, uint256 upgradeType) external view returns (uint256);
    function getAllUpgrades(address player) external view returns (uint256[7] memory);

    // Pausable
    function pause() external;
    function unpause() external;
}
```

---

## EarlyAdopterNFT.sol

ERC-721 for early community members.

### NFT Specifications

| Property     | Value                                       |
| ------------ | ------------------------------------------- |
| Max Supply   | 1,000                                       |
| Transferable | Yes                                         |
| Benefits     | 10% gameplay reward bonus, exclusive frames |
| Mint Period  | Prelaunch only                              |

### Mint Authorization

- Backend signs mint requests
- One per Farcaster FID
- Requires valid FID verification

### NFT Interface

```solidity
interface IEarlyAdopterNFT {
    // Events
    event NFTMinted(address indexed to, uint256 tokenId, uint256 fid);

    // Errors
    error MaxSupplyReached();
    error AlreadyMinted();
    error InvalidSignature();

    // Minting
    function mint(uint256 fid, bytes calldata signature) external;

    // Views
    function hasMinted(uint256 fid) external view returns (bool);
    function tokenOfFid(uint256 fid) external view returns (uint256);
    function fidOfToken(uint256 tokenId) external view returns (uint256);

    // Pausable
    function pause() external;
    function unpause() external;
}
```

---

## FutarchyMarket.sol (Phase 2)

Binary prediction market for governance. Deploy 6 months post-launch.

### Settlement Mechanism (MetaDAO model)

- Single binary market per proposal
- "Pass" and "Fail" conditional tokens
- 7-day trading period
- Settlement via Time-Weighted Average Price (TWAP)
- Pass threshold: Pass TWAP must exceed Fail TWAP by >= 1.5%
- Auto-execution if threshold met

### Proposal Requirements

- Proposer must have 10,000+ $VSC staked
- Proposal includes: target parameter, new value, evaluation metric

### Governable Parameters

| Parameter            | Current Value     |
| -------------------- | ----------------- |
| Treasury/Burn Split  | 60% / 40%         |
| Buy Fee Rate         | 2%                |
| Sell Fee Rate        | 3%                |
| Maintenance Decay    | 1% / week         |
| Reward Emission Caps | Variable          |
| Gear Tier Thresholds | 1/100/1K/10K/100K |

---

## Solidity Style Guide

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title ContractName
 * @author Farcaster Survivors
 * @notice Brief description of contract purpose
 * @dev Implementation details for developers
 */
contract ContractName is ERC20, Pausable, Ownable2Step {
    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    uint256 public constant MAX_SUPPLY = 100_000_000_000 * 1e18;
    uint256 public constant FEE_DENOMINATOR = 10_000;

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    mapping(address => bool) public authorizedMinters;
    uint256 public totalMinted;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event MinterAuthorized(address indexed minter, bool authorized);
    event TokensMinted(address indexed to, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotAuthorized();
    error ExceedsMaxSupply();
    error ZeroAddress();
    error ZeroAmount();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() ERC20("Token Name", "SYMBOL") Ownable(msg.sender) {
        // Initial setup
    }

    /*//////////////////////////////////////////////////////////////
                            EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Mint tokens to an address
    /// @param to Recipient address
    /// @param amount Amount to mint
    function mint(address to, uint256 amount) external whenNotPaused {
        if (!authorizedMinters[msg.sender]) revert NotAuthorized();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (totalMinted + amount > MAX_SUPPLY) revert ExceedsMaxSupply();

        totalMinted += amount;
        _mint(to, amount);

        emit TokensMinted(to, amount);
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Set minter authorization
    function setMinter(address minter, bool authorized) external onlyOwner {
        if (minter == address(0)) revert ZeroAddress();
        authorizedMinters[minter] = authorized;
        emit MinterAuthorized(minter, authorized);
    }

    /// @notice Pause all token transfers
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause token transfers
    function unpause() external onlyOwner {
        _unpause();
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Get remaining mintable supply
    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalMinted;
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Hook called before any transfer
    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override whenNotPaused {
        super._update(from, to, value);
    }
}
```

### Code Organization Order

1. SPDX License
2. Pragma
3. Imports
4. Contract documentation
5. Contract declaration with inheritance
6. Constants
7. Immutables
8. State variables
9. Events
10. Errors
11. Modifiers
12. Constructor
13. External functions
14. Public functions
15. Internal functions
16. Private functions
17. View/Pure functions
