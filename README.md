# DAO Gasless Voting — Codecrypto

A complete DAO application that allows users to vote on proposals **without paying gas**, using EIP-2771 meta-transactions.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ConnectWallet · FundingPanel · CreateProposal · VoteButtons │
└────────────────────────┬────────────────────────────────────┘
                         │ EIP-712 signed meta-tx
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Relayer API (/api/relay)                   │
│              Validates signature → forwards to forwarder     │
└────────────────────────┬────────────────────────────────────┘
                         │ execute()
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  MinimalForwarder (EIP-2771)                 │
│         Verifies sig → appends sender → calls DAO            │
└────────────────────────┬────────────────────────────────────┘
                         │ _msgSender() = original user
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     DAOVoting Contract                       │
│    fundDAO · createProposal · vote · executeProposal         │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer    | Technology               |
|----------|--------------------------|
| Contracts| Solidity 0.8.20, Foundry, OpenZeppelin |
| Frontend | Next.js 15, TypeScript, Tailwind CSS, ethers.js v6 |
| Meta-Tx  | EIP-2771, EIP-712 typed data signing |
| Network  | Anvil (local)            |

## Prerequisites

- [Foundry](https://book.getfoundry.sh/) (forge, anvil)
- Node.js >= 18
- MetaMask browser extension

## Quick Start

```bash
# Clone and setup
git clone <repo-url>
cd votacion_gasless_dao_codecrypto

# Install dependencies
cd sc && forge install && cd ..
cd web && npm install && cd ..

# Start everything (Anvil + deploy + frontend)
./start.sh
```

The script will:
1. Check if Anvil is running — start it if not
2. Deploy MinimalForwarder and DAOVoting contracts
3. Update `web/.env.local` with deployed addresses
4. Start the frontend at `http://localhost:3000`

## Manual Setup

### 1. Start Anvil

```bash
anvil
```

### 2. Deploy Contracts

```bash
cd sc
forge install
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
forge script script/DeployDAO.s.sol --broadcast --rpc-url http://127.0.0.1:8545 --private-key $PRIVATE_KEY
```

### 3. Configure Frontend

Update `web/.env.local` with the deployed contract addresses:

```
NEXT_PUBLIC_DAO_ADDRESS=0x...
NEXT_PUBLIC_FORWARDER_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
RELAYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RELAYER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### 4. Start Frontend

```bash
cd web
npm run dev
```

## Smart Contracts

### MinimalForwarder (`sc/src/MinimalForwarder.sol`)

EIP-2771 meta-transaction forwarder:
- `verify(req, signature)` — validates a signed forward request
- `execute(req, signature)` — executes the meta-transaction
- `getNonce(address)` — returns current nonce (replay protection)

### DAOVoting (`sc/src/DAOVoting.sol`)

Governance contract inheriting `ERC2771Context`:
- `fundDAO()` — deposit ETH (becomes voting power)
- `createProposal(recipient, amount, deadline)` — requires >= 10% of total balance
- `vote(proposalId, voteType)` — gasless voting via forwarder (For / Against / Abstain)
- `executeProposal(proposalId)` — executes after deadline + security period if approved

### Tests

```bash
cd sc
forge test -vv        # Run all tests (27 tests)
forge coverage        # Coverage report (83%+ total)
```

## Frontend Components

| Component       | Description                              |
|-----------------|------------------------------------------|
| `ConnectWallet` | MetaMask connection with chain switching |
| `FundingPanel`  | ETH deposit with balance display         |
| `CreateProposal`| Proposal form with 10% balance check     |
| `ProposalList`  | Fetches and displays all proposals       |
| `ProposalCard`  | Proposal details, votes, state, execute  |
| `VoteButtons`   | Gasless voting via EIP-712 + relayer     |

## API Routes

| Endpoint       | Method | Description                              |
|----------------|--------|------------------------------------------|
| `/api/relay`   | POST   | Relays signed meta-transactions          |
| `/api/execute` | POST   | Scans and executes eligible proposals    |

## Voting Flow

1. User clicks vote button in the UI
2. Frontend builds EIP-712 typed data with the vote
3. User signs with MetaMask (no gas needed)
4. Signed request is sent to `/api/relay`
5. Relayer submits the transaction via MinimalForwarder
6. MinimalForwarder verifies signature and calls DAOVoting
7. DAOVoting records the vote using `_msgSender()` (original user)

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `revert`

Scopes: `dao`, `forwarder`, `frontend`, `relayer`, `config`, `scripts`

## License

MIT
