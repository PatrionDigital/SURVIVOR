#!/usr/bin/env bash
# deploy-testnet.sh — Deploy all contracts to Base Sepolia
#
# Usage:
#   ./scripts/deploy-testnet.sh
#
# Prerequisites:
#   - Foundry installed (forge, cast)
#   - .env file with DEPLOYER_PRIVATE_KEY, TREASURY_ADDRESS, etc.
#   - Deployer wallet funded with Sepolia ETH
#
# This script:
#   1. Runs forge build to ensure contracts compile
#   2. Deploys VSCToken + GearTokens + BondingCurves via Deploy.s.sol
#   3. Outputs all deployed addresses
#   4. Generates an env snippet you can paste into .env / Vercel / Railway

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/packages/contracts"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN} Farcaster Survivors — Testnet Deployment${NC}"
echo -e "${CYAN} Target: Base Sepolia (Chain ID 84532)${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Load env
if [ -f "$PROJECT_ROOT/.env" ]; then
  # shellcheck disable=SC1091
  source <(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^\s*$' | sed 's/^/export /')
fi

# Validate required env vars
REQUIRED_VARS=(
  "DEPLOYER_PRIVATE_KEY"
  "TREASURY_ADDRESS"
  "EMISSIONS_ADDRESS"
  "TEAM_ADDRESS"
  "LIQUIDITY_ADDRESS"
  "AIRDROP_ADDRESS"
)

MISSING=0
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo -e "${RED}  ✗ Missing required env var: $var${NC}"
    MISSING=1
  fi
done

if [ "$MISSING" -eq 1 ]; then
  echo ""
  echo "Set these in .env or export them before running this script."
  exit 1
fi

RPC_URL="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"
BASESCAN_KEY="${BASESCAN_API_KEY:-}"

echo -e "${GREEN}  ✓ All required env vars set${NC}"
echo ""

# Step 1: Build contracts
echo "── Step 1: Building contracts ──"
cd "$CONTRACTS_DIR"
forge build --sizes 2>&1 | tail -5
echo -e "${GREEN}  ✓ Build complete${NC}"
echo ""

# Step 2: Run tests
echo "── Step 2: Running contract tests ──"
forge test --no-match-path "test/invariant/*" 2>&1 | tail -3
echo -e "${GREEN}  ✓ Tests passed${NC}"
echo ""

# Step 3: Deploy
echo "── Step 3: Deploying to Base Sepolia ──"
echo "  RPC: $RPC_URL"
echo ""

VERIFY_FLAGS=""
if [ -n "$BASESCAN_KEY" ]; then
  VERIFY_FLAGS="--verify --etherscan-api-key $BASESCAN_KEY"
  echo "  BaseScan verification: enabled"
else
  echo -e "${YELLOW}  BaseScan verification: disabled (no BASESCAN_API_KEY)${NC}"
fi

# Run the deploy script and capture output
DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --slow \
  $VERIFY_FLAGS \
  2>&1) || {
    echo -e "${RED}  ✗ Deployment failed${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
  }

echo "$DEPLOY_OUTPUT" | grep -E "(deployed at|Deployed|VSCToken|WEAPON|ARMOR|POWER|GLOVES|AMULET|BOOTS|Curve)" || true
echo ""
echo -e "${GREEN}  ✓ Deployment complete${NC}"
echo ""

# Step 4: Extract addresses from broadcast
echo "── Step 4: Extracting deployed addresses ──"

BROADCAST_DIR="$CONTRACTS_DIR/broadcast/Deploy.s.sol/84532"
LATEST_RUN=$(ls -t "$BROADCAST_DIR"/run-*.json 2>/dev/null | head -1)

if [ -z "$LATEST_RUN" ]; then
  echo -e "${YELLOW}  ⚠ Could not find broadcast file — addresses must be extracted from deploy output above${NC}"
else
  echo "  Broadcast file: $LATEST_RUN"
  echo ""
  echo -e "${CYAN}# ── Paste these into your .env / Vercel / Railway ──${NC}"
  echo ""

  # Parse the broadcast JSON for contract addresses
  # Contracts are created in order: VSCToken, 6 GearTokens, 6 BondingCurves
  CONTRACTS=$(cat "$LATEST_RUN" | python3 -c "
import json, sys
data = json.load(sys.stdin)
txs = data.get('transactions', [])
creates = [tx for tx in txs if tx.get('transactionType') == 'CREATE']
names = ['VSC_TOKEN', 'WEAPON_TOKEN', 'ARMOR_TOKEN', 'POWER_TOKEN', 'GLOVES_TOKEN', 'AMULET_TOKEN', 'BOOTS_TOKEN',
         'WEAPON_CURVE', 'ARMOR_CURVE', 'POWER_CURVE', 'GLOVES_CURVE', 'AMULET_CURVE', 'BOOTS_CURVE']
for i, name in enumerate(names):
    if i < len(creates):
        addr = creates[i].get('contractAddress', 'NOT_FOUND')
        print(f'VITE_{name}_ADDRESS={addr}')
" 2>/dev/null) || {
    echo -e "${YELLOW}  ⚠ Could not parse broadcast JSON (python3 required)${NC}"
    echo "  Check the deploy output above for addresses."
    CONTRACTS=""
  }

  if [ -n "$CONTRACTS" ]; then
    echo "$CONTRACTS"
    echo ""

    # Save to file for easy copy
    ENV_OUTPUT="$PROJECT_ROOT/deployed-addresses-testnet.env"
    echo "# Deployed to Base Sepolia at $(date -u +"%Y-%m-%dT%H:%M:%SZ")" > "$ENV_OUTPUT"
    echo "$CONTRACTS" >> "$ENV_OUTPUT"
    echo -e "${GREEN}  ✓ Addresses saved to deployed-addresses-testnet.env${NC}"
  fi
fi

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN} Deployment Complete!${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Update .env / Vercel / Railway with deployed addresses"
echo "  2. Run database migrations on staging DB"
echo "  3. Deploy backend: railway up"
echo "  4. Deploy frontend: vercel --prod"
echo "  5. Verify: ./scripts/verify-deployment.sh testnet"
