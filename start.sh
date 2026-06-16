#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ───────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ANVIL_PORT=8545
ANVIL_URL="http://127.0.0.1:${ANVIL_PORT}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SC_DIR="${SCRIPT_DIR}/sc"
WEB_DIR="${SCRIPT_DIR}/web"

log()  { echo -e "${CYAN}[启动]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

# ─── 1. Check / Start Anvil ──────────────────────────────
check_anvil() {
  if curl -sf "${ANVIL_URL}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    > /dev/null 2>&1; then
    return 0
  fi
  return 1
}

if check_anvil; then
  ok "Anvil ya está corriendo en puerto ${ANVIL_PORT}"
else
  log "Anvil no detectado — levantando..."
  anvil --port "${ANVIL_PORT}" --silent &
  ANVIL_PID=$!

  for i in {1..10}; do
    if check_anvil; then
      ok "Anvil listo (PID: ${ANVIL_PID})"
      break
    fi
    if [ "$i" -eq 10 ]; then
      err "Anvil no arrancó en 10 segundos"
      exit 1
    fi
    sleep 1
  done
fi

# ─── 2. Deploy Contracts ─────────────────────────────────
log "Desplegando contratos..."

DEPLOY_OUTPUT=$(cd "${SC_DIR}" && forge script script/DeployDAO.s.sol \
  --broadcast \
  --rpc-url "${ANVIL_URL}" \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  2>&1)

FORWARDER_ADDRESS=$(echo "${DEPLOY_OUTPUT}" | grep -oP 'MinimalForwarder deployed at: \K0x[a-fA-F0-9]{40}' | head -1)
DAO_ADDRESS=$(echo "${DEPLOY_OUTPUT}" | grep -oP 'DAOVoting deployed at: \K0x[a-fA-F0-9]{40}' | head -1)

if [ -z "${FORWARDER_ADDRESS}" ] || [ -z "${DAO_ADDRESS}" ]; then
  err "No se pudieron extraer las direcciones de los contratos"
  echo "${DEPLOY_OUTPUT}"
  exit 1
fi

ok "MinimalForwarder: ${FORWARDER_ADDRESS}"
ok "DAOVoting:        ${DAO_ADDRESS}"

# ─── 3. Update .env.local ────────────────────────────────
ENV_FILE="${WEB_DIR}/.env.local"

cat > "${ENV_FILE}" <<EOF
NEXT_PUBLIC_DAO_ADDRESS=${DAO_ADDRESS}
NEXT_PUBLIC_FORWARDER_ADDRESS=${FORWARDER_ADDRESS}
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=${ANVIL_URL}
RELAYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RELAYER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
EOF

ok ".env.local actualizado"

# ─── 4. Start Frontend ───────────────────────────────────
log "Levantando frontend..."
cd "${WEB_DIR}"
npm run dev
