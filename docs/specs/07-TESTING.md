# 07 - Testing Requirements

## Overview

All code must be thoroughly tested before deployment. This document outlines testing requirements for smart contracts, frontend, and backend components.

## Smart Contract Testing

### Coverage Requirements

| Requirement       | Target |
| ----------------- | ------ |
| Line Coverage     | 100%   |
| Branch Coverage   | 100%   |
| Function Coverage | 100%   |

### Test Categories

#### Unit Tests

Test individual functions in isolation.

```solidity
// test/VSCToken.t.sol
contract VSCTokenTest is Test {
    VSCToken token;
    address owner = address(1);
    address minter = address(2);
    address user = address(3);

    function setUp() public {
        vm.prank(owner);
        token = new VSCToken();
    }

    function test_InitialSupply() public {
        assertEq(token.totalSupply(), 0);
        assertEq(token.MAX_SUPPLY(), 100_000_000_000 * 1e18);
    }

    function test_SetMinter() public {
        vm.prank(owner);
        token.setMinter(minter, true);
        assertTrue(token.authorizedMinters(minter));
    }

    function test_SetMinter_RevertIfNotOwner() public {
        vm.prank(user);
        vm.expectRevert();
        token.setMinter(minter, true);
    }

    function test_Mint() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user, 1000 * 1e18);

        assertEq(token.balanceOf(user), 1000 * 1e18);
    }

    function test_Mint_RevertIfNotMinter() public {
        vm.prank(user);
        vm.expectRevert(VSCToken.NotAuthorized.selector);
        token.mint(user, 1000 * 1e18);
    }

    function test_Mint_RevertIfExceedsMaxSupply() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        vm.expectRevert(VSCToken.ExceedsMaxSupply.selector);
        token.mint(user, 100_000_000_001 * 1e18);
    }

    function test_Burn() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user, 1000 * 1e18);

        vm.prank(user);
        token.burn(500 * 1e18);

        assertEq(token.balanceOf(user), 500 * 1e18);
    }

    function test_Pause() public {
        vm.prank(owner);
        token.pause();
        assertTrue(token.paused());
    }

    function test_Transfer_RevertWhenPaused() public {
        vm.prank(owner);
        token.setMinter(minter, true);

        vm.prank(minter);
        token.mint(user, 1000 * 1e18);

        vm.prank(owner);
        token.pause();

        vm.prank(user);
        vm.expectRevert();
        token.transfer(address(4), 100 * 1e18);
    }
}
```

#### Fuzz Tests

Test with random inputs to find edge cases.

```solidity
// test/BondingCurve.t.sol
contract BondingCurveFuzzTest is Test {
    BondingCurve curve;

    function setUp() public {
        curve = new BondingCurve();
    }

    function testFuzz_BuyThenSell_NoProfit(uint256 buyAmount) public {
        buyAmount = bound(buyAmount, 0.001 ether, 100 ether);

        // Buy tokens
        uint256 tokensBought = curve.buy{value: buyAmount}(0);

        // Sell all tokens
        uint256 ethReceived = curve.sell(tokensBought, 0);

        // Should not profit due to fees
        assertLt(ethReceived, buyAmount);
    }

    function testFuzz_PriceIncreases_WithSupply(uint256 amount1, uint256 amount2) public {
        amount1 = bound(amount1, 0.01 ether, 10 ether);
        amount2 = bound(amount2, 0.01 ether, 10 ether);

        uint256 price1 = curve.getCurrentPrice();
        curve.buy{value: amount1}(0);
        uint256 price2 = curve.getCurrentPrice();

        assertGt(price2, price1);
    }
}
```

#### Invariant Tests

Test system-wide properties that must always hold.

```solidity
// test/invariants/EconomicInvariants.t.sol
contract EconomicInvariantsTest is Test {
    VSCToken vscToken;
    BondingCurve bondingCurve;
    GearStaking gearStaking;

    function setUp() public {
        // Deploy full system
    }

    function invariant_VSCSupply_NeverExceedsMax() public {
        assertLe(vscToken.totalSupply(), vscToken.MAX_SUPPLY());
    }

    function invariant_BondingCurve_AlwaysCollateralized() public {
        uint256 reserveBalance = address(bondingCurve).balance;
        uint256 tokenSupply = bondingCurve.token().totalSupply();
        uint256 reserveRequired = bondingCurve.calculateReserveRequired(tokenSupply);

        assertGe(reserveBalance, reserveRequired);
    }

    function invariant_StakedAmount_NeverExceedsBalance() public {
        // For all users, staked amount <= token balance + staked
    }
}
```

#### Integration Tests

Test contract interactions.

```solidity
// test/integration/FullFlow.t.sol
contract FullFlowTest is Test {
    VSCToken vscToken;
    GearToken weaponToken;
    BondingCurve vscCurve;
    BondingCurve weaponCurve;
    GearStaking gearStaking;
    MaintenancePool maintenancePool;
    RewardDistributor rewardDistributor;

    address player = address(1);

    function setUp() public {
        // Deploy all contracts
        // Configure permissions
    }

    function test_FullPlayerFlow() public {
        // 1. Player buys $VSC
        vm.deal(player, 10 ether);
        vm.prank(player);
        uint256 vscAmount = vscCurve.buy{value: 1 ether}(0);

        // 2. Player buys gear token
        vm.prank(player);
        vscToken.approve(address(weaponCurve), vscAmount / 2);
        vm.prank(player);
        uint256 weaponAmount = weaponCurve.buy(vscAmount / 2, 0);

        // 3. Player stakes gear
        vm.prank(player);
        weaponToken.approve(address(gearStaking), weaponAmount);
        vm.prank(player);
        gearStaking.stake(0, weaponAmount);

        // 4. Player deposits maintenance
        vm.prank(player);
        vscToken.approve(address(maintenancePool), vscAmount / 4);
        vm.prank(player);
        maintenancePool.deposit(vscAmount / 4);

        // 5. Verify power calculation
        uint256 power = gearStaking.getTotalPower(player);
        assertGt(power, 0);

        // 6. Verify maintenance bonus
        assertTrue(maintenancePool.getMaintenanceStatus(player));
    }
}
```

### Required Test Files

```bash
test/
├── VSCToken.t.sol
├── GearToken.t.sol
├── BondingCurve.t.sol
├── GearStaking.t.sol
├── MaintenancePool.t.sol
├── RewardDistributor.t.sol
├── GlobalUpgradeNFT.t.sol
├── EarlyAdopterNFT.t.sol
├── integration/
│   └── FullFlow.t.sol
└── invariants/
    └── EconomicInvariants.t.sol
```

### Running Tests

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test file
forge test --match-path test/VSCToken.t.sol

# Run with coverage
forge coverage

# Generate coverage report
forge coverage --report lcov
```

---

## Frontend Testing

### Frontend Coverage Requirements

| Requirement        | Target |
| ------------------ | ------ |
| Component Coverage | 90%    |
| Hook Coverage      | 100%   |
| Store Coverage     | 100%   |
| Critical Path E2E  | 100%   |

### Unit Tests (Vitest)

```typescript
// __tests__/hooks/useVSCToken.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { useVSCToken } from "@/hooks/useVSCToken";
import { mockWagmiWrapper } from "../utils/mockWagmi";

describe("useVSCToken", () => {
  it("should return zero balance when not connected", () => {
    const { result } = renderHook(() => useVSCToken(), {
      wrapper: mockWagmiWrapper({ isConnected: false }),
    });

    expect(result.current.balance).toBe(0n);
  });

  it("should fetch balance when connected", async () => {
    const { result } = renderHook(() => useVSCToken(), {
      wrapper: mockWagmiWrapper({
        isConnected: true,
        address: "0x123...",
        mockBalanceOf: 1000n * 10n ** 18n,
      }),
    });

    await waitFor(() => {
      expect(result.current.balance).toBe(1000n * 10n ** 18n);
    });
  });
});
```

### Component Tests

```typescript
// __tests__/components/GearSlot.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { GearSlot } from '@/components/meta/GearSlot';

describe('GearSlot', () => {
  const defaultProps = {
    slot: 0,
    name: 'Weapon',
    stakedAmount: 1000n * 10n ** 18n,
    tokenBalance: 5000n * 10n ** 18n,
    onStake: jest.fn(),
    onUnstake: jest.fn(),
  };

  it('renders slot name and staked amount', () => {
    render(<GearSlot {...defaultProps} />);

    expect(screen.getByText('Weapon')).toBeInTheDocument();
    expect(screen.getByText('1,000 staked')).toBeInTheDocument();
  });

  it('shows tier based on staked amount', () => {
    render(<GearSlot {...defaultProps} stakedAmount={10000n * 10n ** 18n} />);

    expect(screen.getByText('Epic')).toBeInTheDocument();
  });

  it('calls onStake when stake button clicked', async () => {
    render(<GearSlot {...defaultProps} />);

    fireEvent.click(screen.getByText('Stake'));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '100' } });
    fireEvent.click(screen.getByText('Confirm'));

    expect(defaultProps.onStake).toHaveBeenCalledWith(0, 100n * 10n ** 18n);
  });
});
```

### Store Tests

```typescript
// __tests__/stores/gameStore.test.ts
import { useGameStore } from "@/stores/gameStore";

describe("gameStore", () => {
  beforeEach(() => {
    useGameStore.setState({
      gameState: null,
      isPlaying: false,
      isPaused: false,
    });
  });

  it("starts game with initial state", () => {
    useGameStore.getState().startGame();

    const state = useGameStore.getState();
    expect(state.isPlaying).toBe(true);
    expect(state.gameState).not.toBeNull();
    expect(state.gameState?.player.health).toBe(100);
  });

  it("pauses and resumes game", () => {
    useGameStore.getState().startGame();
    useGameStore.getState().pauseGame();

    expect(useGameStore.getState().isPaused).toBe(true);

    useGameStore.getState().resumeGame();

    expect(useGameStore.getState().isPaused).toBe(false);
  });

  it("ends game and clears state", () => {
    useGameStore.getState().startGame();
    useGameStore.getState().endGame({
      survivalTime: 300,
      enemiesKilled: 100,
      xpCollected: 5000,
      levelReached: 10,
    });

    expect(useGameStore.getState().isPlaying).toBe(false);
    expect(useGameStore.getState().gameState).toBeNull();
  });
});
```

### E2E Tests (Playwright)

```typescript
// e2e/gameplay.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Gameplay", () => {
  test.beforeEach(async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.mockWallet = {
        address: "0x123...",
        isConnected: true,
      };
    });

    await page.goto("/");
  });

  test("can start a game session", async ({ page }) => {
    await page.click('[data-testid="play-button"]');

    await expect(page.locator('[data-testid="game-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="hud-timer"]')).toContainText("0:00");
  });

  test("can pause and resume game", async ({ page }) => {
    await page.click('[data-testid="play-button"]');
    await page.keyboard.press("Escape");

    await expect(page.locator('[data-testid="pause-menu"]')).toBeVisible();

    await page.click('[data-testid="resume-button"]');

    await expect(page.locator('[data-testid="pause-menu"]')).not.toBeVisible();
  });

  test("shows game over screen on death", async ({ page }) => {
    await page.click('[data-testid="play-button"]');

    // Simulate death (via exposed test function)
    await page.evaluate(() => window.testHelpers.killPlayer());

    await expect(page.locator('[data-testid="game-over-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="rewards-earned"]')).toBeVisible();
  });
});
```

### Frontend Required Test Files

```bash
__tests__/
├── components/
│   ├── game/
│   │   ├── GameCanvas.test.tsx
│   │   ├── HUD.test.tsx
│   │   └── LevelUpModal.test.tsx
│   ├── meta/
│   │   ├── GearSlot.test.tsx
│   │   ├── MaintenanceBar.test.tsx
│   │   └── UpgradeShop.test.tsx
│   └── wallet/
│       └── ConnectButton.test.tsx
├── hooks/
│   ├── useVSCToken.test.ts
│   ├── useGearStaking.test.ts
│   └── useMaintenance.test.ts
├── stores/
│   ├── gameStore.test.ts
│   ├── playerStore.test.ts
│   └── sessionStore.test.ts
└── utils/
    └── mockWagmi.ts

e2e/
├── gameplay.spec.ts
├── staking.spec.ts
├── rewards.spec.ts
└── wallet.spec.ts
```

---

## Backend Testing

### Backend Coverage Requirements

| Requirement             | Target |
| ----------------------- | ------ |
| Service Coverage        | 100%   |
| Route Coverage          | 100%   |
| Database Query Coverage | 100%   |

### Service Tests

```typescript
// tests/services/rewardCalculator.test.ts
import { calculateRewards } from "@/services/rewardCalculator";

describe("rewardCalculator", () => {
  it("calculates base reward from survival time", () => {
    const result = calculateRewards({
      survivalTime: 60, // 1 minute
      enemiesKilled: 0,
      xpCollected: 0,
      levelReached: 1,
      gearPower: 0,
      hasEarlyAdopterNFT: false,
    });

    expect(result.baseReward).toBe(60n * 10n ** 18n);
  });

  it("adds time bonus after 5 minutes", () => {
    const result = calculateRewards({
      survivalTime: 360, // 6 minutes
      enemiesKilled: 0,
      xpCollected: 0,
      levelReached: 1,
      gearPower: 0,
      hasEarlyAdopterNFT: false,
    });

    // 60 seconds * 0.5 VSC = 30 VSC bonus
    expect(result.timeBonus).toBe(60n * 5n * 10n ** 17n);
  });

  it("applies gear multiplier", () => {
    const withoutGear = calculateRewards({
      survivalTime: 60,
      enemiesKilled: 0,
      xpCollected: 0,
      levelReached: 1,
      gearPower: 0,
      hasEarlyAdopterNFT: false,
    });

    const withGear = calculateRewards({
      survivalTime: 60,
      enemiesKilled: 0,
      xpCollected: 0,
      levelReached: 1,
      gearPower: 5000, // 50% bonus
      hasEarlyAdopterNFT: false,
    });

    expect(withGear.total).toBe((withoutGear.total * 15n) / 10n);
  });

  it("applies early adopter bonus", () => {
    const without = calculateRewards({
      survivalTime: 60,
      enemiesKilled: 0,
      xpCollected: 0,
      levelReached: 1,
      gearPower: 0,
      hasEarlyAdopterNFT: false,
    });

    const with_ = calculateRewards({
      survivalTime: 60,
      enemiesKilled: 0,
      xpCollected: 0,
      levelReached: 1,
      gearPower: 0,
      hasEarlyAdopterNFT: true,
    });

    expect(with_.total).toBe((without.total * 11n) / 10n);
  });
});
```

### Route Tests

```typescript
// tests/routes/game.test.ts
import { build } from "@/app";
import { mockDb } from "../utils/mockDb";

describe("POST /api/game/session/start", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a new session", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/game/session/start",
      headers: {
        authorization: `Bearer ${mockToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toHaveProperty("sessionId");
  });

  it("returns 401 without auth", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/game/session/start",
    });

    expect(response.statusCode).toBe(401);
  });

  it("abandons existing active session", async () => {
    // Create first session
    const first = await app.inject({
      method: "POST",
      url: "/api/game/session/start",
      headers: { authorization: `Bearer ${mockToken}` },
    });
    const firstId = JSON.parse(first.body).sessionId;

    // Create second session
    await app.inject({
      method: "POST",
      url: "/api/game/session/start",
      headers: { authorization: `Bearer ${mockToken}` },
    });

    // First session should be abandoned
    const session = await mockDb.getSession(firstId);
    expect(session.status).toBe("abandoned");
  });
});
```

### Backend Required Test Files

```bash
tests/
├── services/
│   ├── rewardCalculator.test.ts
│   ├── rewardSigner.test.ts
│   ├── antiFraud.test.ts
│   └── leaderboard.test.ts
├── routes/
│   ├── auth.test.ts
│   ├── game.test.ts
│   ├── rewards.test.ts
│   └── player.test.ts
├── db/
│   ├── players.test.ts
│   ├── sessions.test.ts
│   └── rewards.test.ts
└── utils/
    ├── mockDb.ts
    └── mockAuth.ts
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: foundry-rs/foundry-toolchain@v1

      - name: Run tests
        working-directory: packages/contracts
        run: forge test -vvv

      - name: Check coverage
        working-directory: packages/contracts
        run: |
          forge coverage --report summary
          forge coverage --report lcov

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: packages/contracts/lcov.info
          flags: contracts

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install
      - run: pnpm --filter web test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: apps/web/coverage/lcov.info
          flags: frontend

  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install
      - run: pnpm --filter api test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: apps/api/coverage/lcov.info
          flags: backend

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm --filter web build
      - run: pnpm --filter web test:e2e
```
