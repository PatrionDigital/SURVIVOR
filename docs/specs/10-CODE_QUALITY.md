# 10 - Code Quality Standards

## Overview

This document defines code quality standards, linting rules, and development conventions for the Farcaster Survivors project.

## TypeScript Configuration

### Base Configuration

```json
// packages/config/typescript/base.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,

    // Strict type checking
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,

    // Interop
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,

    // Build
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### Frontend Configuration

```json
// apps/web/tsconfig.json
{
  "extends": "../../packages/config/typescript/base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@game/*": ["./src/game/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@stores/*": ["./src/stores/*"],
      "@lib/*": ["./src/lib/*"],
      "@types/*": ["./src/types/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Backend Configuration

```json
// apps/api/tsconfig.json
{
  "extends": "../../packages/config/typescript/base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@routes/*": ["./src/routes/*"],
      "@services/*": ["./src/services/*"],
      "@db/*": ["./src/db/*"],
      "@middleware/*": ["./src/middleware/*"],
      "@lib/*": ["./src/lib/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

---

## ESLint Configuration

### ESLint Base Configuration

```javascript
// packages/config/eslint/index.js
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: true,
  },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  rules: {
    // TypeScript
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/strict-boolean-expressions": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",

    // General
    "no-console": "warn",
    "no-debugger": "error",
    "no-alert": "error",
    "prefer-const": "error",
    "no-var": "error",
    eqeqeq: ["error", "always"],

    // Import
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc" },
      },
    ],
    "import/no-duplicates": "error",
    "import/no-cycle": "error",
  },
  settings: {
    "import/resolver": {
      typescript: true,
      node: true,
    },
  },
};
```

### React-Specific Rules

```javascript
// apps/web/.eslintrc.js
module.exports = {
  extends: [
    "../../packages/config/eslint",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
  ],
  plugins: ["react", "react-hooks", "jsx-a11y"],
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react/jsx-no-target-blank": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "jsx-a11y/click-events-have-key-events": "warn",
    "jsx-a11y/no-static-element-interactions": "warn",
  },
};
```

---

## Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

---

## Git Conventions

### Branch Naming

```text
feature/[ticket-id]-description
fix/[ticket-id]-description
refactor/[ticket-id]-description
chore/description
docs/description
```

Examples:

- `feature/VSC-123-add-gear-staking`
- `fix/VSC-456-bonding-curve-calculation`
- `refactor/VSC-789-optimize-game-loop`
- `chore/update-dependencies`
- `docs/api-documentation`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Types

| Type       | Description                             |
| ---------- | --------------------------------------- |
| `feat`     | New feature                             |
| `fix`      | Bug fix                                 |
| `refactor` | Code change that neither fixes nor adds |
| `perf`     | Performance improvement                 |
| `test`     | Adding or fixing tests                  |
| `docs`     | Documentation only                      |
| `style`    | Formatting, missing semicolons, etc.    |
| `chore`    | Maintenance tasks                       |
| `ci`       | CI/CD changes                           |
| `build`    | Build system changes                    |
| `revert`   | Revert previous commit                  |

#### Scopes

| Scope       | Description     |
| ----------- | --------------- |
| `contracts` | Smart contracts |
| `web`       | Frontend app    |
| `api`       | Backend API     |
| `sdk`       | Shared SDK      |
| `game`      | Game engine     |
| `ui`        | UI components   |
| `auth`      | Authentication  |
| `rewards`   | Reward system   |

#### Examples

```text
feat(contracts): add GearStaking contract

Implements staking functionality for 6 gear token types.
Includes power calculation and tier determination.

Closes #123

---

fix(api): correct reward calculation overflow

Use BigInt throughout reward calculation to prevent
overflow on large survival times.

Fixes #456

---

refactor(game): optimize collision detection

Replace O(n²) collision check with spatial hashing.
Reduces frame time from 8ms to 2ms with 500 enemies.

---

docs(api): add OpenAPI specification

Generate OpenAPI 3.0 spec from Fastify schemas.
Includes all endpoints with request/response examples.
```

### Pull Request Guidelines

#### PR Title

Follow commit message format:

```text
feat(scope): description
```

#### PR Description Template

```markdown
## Description

Brief description of changes.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues

Closes #123

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Added necessary documentation
- [ ] No new warnings
```

#### Review Requirements

- All PRs require at least 1 approval
- All CI checks must pass
- No unresolved conversations
- Branch must be up to date with main

---

## Code Style Guidelines

### TypeScript/JavaScript

```typescript
// ✅ Use explicit types
function calculateReward(time: number, kills: number): bigint {
  // ...
}

// ❌ Avoid implicit any
function calculateReward(time, kills) {
  // ...
}

// ✅ Use const for immutable bindings
const MAX_LEVEL = 100;
const config = { debug: false };

// ❌ Avoid let when const works
let MAX_LEVEL = 100;

// ✅ Use template literals
const message = `Player ${name} scored ${score}`;

// ❌ Avoid string concatenation
const message = "Player " + name + " scored " + score;

// ✅ Use optional chaining
const power = player?.stats?.power ?? 0;

// ❌ Avoid nested conditionals
const power =
  player && player.stats && player.stats.power ? player.stats.power : 0;

// ✅ Use async/await
async function fetchPlayer(id: string): Promise<Player> {
  const response = await fetch(`/api/player/${id}`);
  return response.json();
}

// ❌ Avoid .then() chains
function fetchPlayer(id: string): Promise<Player> {
  return fetch(`/api/player/${id}`).then((response) => response.json());
}

// ✅ Handle errors explicitly
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof SpecificError) {
    handleSpecificError(error);
  } else {
    throw error;
  }
}

// ❌ Avoid swallowing errors
try {
  await riskyOperation();
} catch {
  // Silent failure
}
```

### React Components

```typescript
// ✅ Use function components with explicit return types
interface GearSlotProps {
  slot: number;
  stakedAmount: bigint;
  onStake: (slot: number, amount: bigint) => void;
}

export function GearSlot({ slot, stakedAmount, onStake }: GearSlotProps): JSX.Element {
  return (
    <div className="gear-slot">
      {/* ... */}
    </div>
  );
}

// ✅ Use hooks at the top level
function GameScreen(): JSX.Element {
  const [isPlaying, setIsPlaying] = useState(false);
  const { balance } = useVSCToken();

  useEffect(() => {
    // Effect logic
  }, []);

  return <div>{/* ... */}</div>;
}

// ✅ Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveThing(data);
}, [data]);

// ✅ Memoize callbacks passed to children
const handleClick = useCallback(() => {
  doSomething();
}, [dependency]);

// ✅ Use descriptive event handler names
const handleStakeClick = () => { /* ... */ };
const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => { /* ... */ };
```

### Solidity

See [04-SMART_CONTRACTS.md](./04-SMART_CONTRACTS.md) for Solidity style guide.

---

## Documentation Standards

### Code Comments

```typescript
// ✅ Explain WHY, not WHAT
// Apply 10% bonus for early adopters to incentivize early participation
const bonus = hasEarlyAdopterNFT ? reward / 10n : 0n;

// ❌ Don't state the obvious
// Add bonus to reward
const total = reward + bonus;

// ✅ Document complex logic
/**
 * Calculate gear power using square root scaling.
 *
 * This creates diminishing returns - doubling stake
 * increases power by ~41%, not 100%. This prevents
 * whales from completely dominating.
 *
 * @param stakedAmount - Amount of tokens staked (in wei)
 * @param slotMultiplier - Multiplier for this gear slot
 * @returns Power value (0-10000 scale)
 */
function calculatePower(stakedAmount: bigint, slotMultiplier: number): number {
  // ...
}
```

### JSDoc/TSDoc

````typescript
/**
 * Stake gear tokens to a specific slot.
 *
 * @param slot - Gear slot index (0-5)
 * @param amount - Amount to stake in wei
 * @returns Transaction hash
 * @throws {InsufficientBalanceError} If user lacks sufficient tokens
 * @throws {InvalidSlotError} If slot index is out of range
 *
 * @example
 * ```typescript
 * // Stake 1000 WEAPON tokens
 * const txHash = await stakeGear(0, parseEther('1000'));
 * ```
 */
async function stakeGear(slot: number, amount: bigint): Promise<string> {
  // ...
}
````

### README Files

Each package should have a README with:

1. **Purpose** - What does this package do?
2. **Installation** - How to install
3. **Usage** - Basic usage examples
4. **API** - Public API documentation
5. **Development** - How to develop/test

---

## Performance Guidelines

### Frontend

- Bundle size: < 500KB gzipped for initial load
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Game FPS: Stable 60 FPS

### Backend

- API response time: P95 < 200ms
- Database queries: < 50ms
- Memory usage: < 512MB per instance

### Smart Contracts

- Gas optimization for frequent functions
- Use appropriate data types (uint8 vs uint256)
- Minimize storage writes
- Batch operations where possible

---

## Quality Checklist

Before merging any PR:

- [ ] All tests pass
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] No new console.log/debug statements
- [ ] Performance impact considered
- [ ] Security implications reviewed
- [ ] Mobile responsiveness tested (frontend)
- [ ] Gas costs reasonable (contracts)
