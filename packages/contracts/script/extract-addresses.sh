#!/bin/bash
#
# Extract deployed contract addresses from Forge broadcast and output to .env format
# Usage: ./script/extract-addresses.sh [network]
#   network: anvil (default), sepolia, mainnet
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_ROOT/deployments"

NETWORK="${1:-anvil}"

# Map network to chain ID
case "$NETWORK" in
  anvil)
    CHAIN_ID=31337
    DEPLOY_SCRIPT="DeployAnvil.s.sol"
    ;;
  sepolia)
    CHAIN_ID=84532
    DEPLOY_SCRIPT="Deploy.s.sol"
    ;;
  mainnet)
    CHAIN_ID=8453
    DEPLOY_SCRIPT="Deploy.s.sol"
    ;;
  *)
    echo "Unknown network: $NETWORK"
    echo "Usage: $0 [anvil|sepolia|mainnet]"
    exit 1
    ;;
esac

BROADCAST_FILE="$PROJECT_ROOT/broadcast/$DEPLOY_SCRIPT/$CHAIN_ID/run-latest.json"

if [ ! -f "$BROADCAST_FILE" ]; then
  echo "Error: Broadcast file not found at $BROADCAST_FILE"
  echo "Did you run the deployment script first?"
  exit 1
fi

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

echo "=== Extracting addresses from $NETWORK deployment ==="
echo ""

# Extract addresses using jq
# The broadcast file has a transactions array with deployed contracts
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create .env file
ENV_FILE="$OUTPUT_DIR/${NETWORK}-addresses.env"
cat > "$ENV_FILE" << EOF
# Contract Addresses for $NETWORK
# Generated: $TIMESTAMP
# Source: $BROADCAST_FILE

EOF

# Extract contract creations from broadcast
# Format: contractName -> address
echo "# Core Contracts" >> "$ENV_FILE"

# Use jq to extract deployed contract addresses from receipts
# Each transaction in the broadcast has a contractName and contractAddress
jq -r '.transactions[] | select(.transactionType == "CREATE") | "\(.contractName)=\(.contractAddress)"' "$BROADCAST_FILE" | while read line; do
  CONTRACT_NAME=$(echo "$line" | cut -d'=' -f1)
  CONTRACT_ADDRESS=$(echo "$line" | cut -d'=' -f2)

  # Convert camelCase/PascalCase to SCREAMING_SNAKE_CASE
  ENV_KEY=$(echo "$CONTRACT_NAME" | sed -E 's/([A-Z])/_\1/g' | tr '[:lower:]' '[:upper:]' | sed 's/^_//')

  echo "VITE_${ENV_KEY}_ADDRESS=$CONTRACT_ADDRESS" >> "$ENV_FILE"
done

# Create JSON file
JSON_FILE="$OUTPUT_DIR/${NETWORK}-addresses.json"
jq -n --arg network "$NETWORK" --arg chainId "$CHAIN_ID" --arg timestamp "$TIMESTAMP" \
  --slurpfile broadcast "$BROADCAST_FILE" '
{
  network: $network,
  chainId: ($chainId | tonumber),
  deployedAt: $timestamp,
  contracts: (
    $broadcast[0].transactions
    | map(select(.transactionType == "CREATE"))
    | map({(.contractName): .contractAddress})
    | add
  )
}' > "$JSON_FILE"

echo ""
echo "=== Addresses extracted successfully ==="
echo ""
echo "Output files:"
echo "  - $ENV_FILE"
echo "  - $JSON_FILE"
echo ""
echo "Deployed contracts:"
jq -r '.transactions[] | select(.transactionType == "CREATE") | "  \(.contractName): \(.contractAddress)"' "$BROADCAST_FILE"
echo ""
echo "To use:"
echo "  cat $ENV_FILE >> apps/web/.env.local"
