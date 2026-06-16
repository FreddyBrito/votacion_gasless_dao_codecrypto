#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

ANVIL_URL="http://127.0.0.1:8545"

usage() {
  echo "Usage: $0 <amount> [unit]"
  echo ""
  echo "Units: seconds (default), minutes, hours, days, weeks"
  echo ""
  echo "Examples:"
  echo "  $0 30 seconds    # advance 30 seconds"
  echo "  $0 5 minutes     # advance 5 minutes"
  echo "  $0 1 hours       # advance 1 hour"
  echo "  $0 7 days        # advance 7 days"
  exit 1
}

if [ $# -lt 1 ]; then
  usage
fi

AMOUNT=$1
UNIT=${2:-seconds}

case "$UNIT" in
  seconds|s)  SECONDS_TOTAL=$AMOUNT ;;
  minutes|m)  SECONDS_TOTAL=$((AMOUNT * 60)) ;;
  hours|h)    SECONDS_TOTAL=$((AMOUNT * 3600)) ;;
  days|d)     SECONDS_TOTAL=$((AMOUNT * 86400)) ;;
  weeks|w)    SECONDS_TOTAL=$((AMOUNT * 604800)) ;;
  *) echo -e "${RED}Unknown unit: $UNIT${NC}"; usage ;;
esac

echo -e "${CYAN}[INFO]${NC} Advancing time by ${AMOUNT} ${UNIT} (${SECONDS_TOTAL}s)..."

cast evm_increaseTime "$SECONDS_TOTAL" --rpc-url "$ANVIL_URL" > /dev/null
cast evm_mine --rpc-url "$ANVIL_URL" > /dev/null

echo -e "${GREEN}[OK]${NC} Time advanced. New block mined."
