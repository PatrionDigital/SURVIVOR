#!/usr/bin/env bash
# verify-deployment.sh — Post-deployment smoke tests
#
# Usage:
#   ./scripts/verify-deployment.sh [testnet|mainnet]
#
# Checks:
#   1. Smart contracts respond (if RPC + addresses configured)
#   2. API health endpoint returns OK
#   3. Frontend is accessible

set -euo pipefail

ENV="${1:-testnet}"
PASSED=0
FAILED=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}  ✓ $1${NC}"; ((PASSED++)); }
fail() { echo -e "${RED}  ✗ $1${NC}"; ((FAILED++)); }
warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; ((WARNINGS++)); }

echo "============================================"
echo " Farcaster Survivors — Deployment Verification"
echo " Environment: ${ENV}"
echo "============================================"
echo ""

# Load env file if it exists
ENV_FILE=".env.${ENV}"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source <(grep -v '^#' "$ENV_FILE" | grep -v '^\s*$' | sed 's/^/export /')
fi

# ─── Contract Checks ───

echo "── Smart Contracts ──"

if [ "$ENV" = "testnet" ]; then
  RPC_URL="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"
elif [ "$ENV" = "mainnet" ]; then
  RPC_URL="${BASE_MAINNET_RPC_URL:-https://mainnet.base.org}"
else
  RPC_URL="http://localhost:8545"
fi

VSC_ADDR="${VITE_VSC_TOKEN_ADDRESS:-}"

if [ -z "$VSC_ADDR" ]; then
  warn "VSC_TOKEN_ADDRESS not set — skipping contract checks"
else
  # Check VSCToken responds to name()
  if command -v cast &> /dev/null; then
    TOKEN_NAME=$(cast call "$VSC_ADDR" "name()(string)" --rpc-url "$RPC_URL" 2>/dev/null || echo "FAIL")
    if [ "$TOKEN_NAME" = "FAIL" ]; then
      fail "VSCToken at $VSC_ADDR not responding"
    else
      pass "VSCToken responds: name() = $TOKEN_NAME"
    fi

    # Check total supply is non-zero
    TOTAL_SUPPLY=$(cast call "$VSC_ADDR" "totalSupply()(uint256)" --rpc-url "$RPC_URL" 2>/dev/null || echo "0")
    if [ "$TOTAL_SUPPLY" = "0" ]; then
      fail "VSCToken totalSupply is 0 — allocations may not be minted"
    else
      pass "VSCToken totalSupply = $TOTAL_SUPPLY"
    fi
  else
    warn "cast not found — install Foundry to run contract checks"
  fi
fi

echo ""

# ─── API Checks ───

echo "── Backend API ──"

API_URL="${VITE_API_URL:-http://localhost:3001}"

# Health endpoint
HEALTH=$(curl -sf "${API_URL}/health" 2>/dev/null || echo "FAIL")
if [ "$HEALTH" = "FAIL" ]; then
  fail "API health check failed at ${API_URL}/health"
else
  pass "API health check OK: ${API_URL}/health"
fi

# Readiness endpoint
READY=$(curl -sf "${API_URL}/ready" 2>/dev/null || echo "FAIL")
if [ "$READY" = "FAIL" ]; then
  warn "API readiness check failed at ${API_URL}/ready (may need DB/Redis)"
else
  READY_STATUS=$(echo "$READY" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  if [ "$READY_STATUS" = "ready" ]; then
    pass "API readiness check: all dependencies healthy"
  else
    warn "API readiness check: status=$READY_STATUS (some dependencies degraded)"
  fi
fi

echo ""

# ─── Frontend Checks ───

echo "── Frontend ──"

if [ "$ENV" = "testnet" ]; then
  FRONTEND_URL="${FRONTEND_URL:-https://survivor-testnet.vercel.app}"
elif [ "$ENV" = "mainnet" ]; then
  FRONTEND_URL="${FRONTEND_URL:-https://farcastersurvivors.game}"
else
  FRONTEND_URL="http://localhost:5173"
fi

HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
  pass "Frontend accessible at ${FRONTEND_URL} (HTTP $HTTP_STATUS)"
else
  fail "Frontend not accessible at ${FRONTEND_URL} (HTTP $HTTP_STATUS)"
fi

# Check .well-known/farcaster.json for Frame manifest
MANIFEST_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/.well-known/farcaster.json" 2>/dev/null || echo "000")
if [ "$MANIFEST_STATUS" = "200" ]; then
  pass "Farcaster manifest found at /.well-known/farcaster.json"
else
  warn "Farcaster manifest not found (HTTP $MANIFEST_STATUS) — may need to add .well-known/farcaster.json"
fi

echo ""

# ─── Summary ───

echo "============================================"
echo -e " Results: ${GREEN}${PASSED} passed${NC}, ${RED}${FAILED} failed${NC}, ${YELLOW}${WARNINGS} warnings${NC}"
echo "============================================"

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
