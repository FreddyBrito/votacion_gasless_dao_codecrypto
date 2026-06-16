# DAO Voting — Smart Contracts

Solidity smart contracts for the DAO Gasless Voting system.

## Contracts

### MinimalForwarder

EIP-2771 meta-transaction forwarder. Users sign typed data off-chain; a relayer submits the signature via `execute()`.

- Built on OpenZeppelin `EIP712` and `Nonces`
- ECDSA signature verification
- Per-user nonce tracking for replay protection

### DAOVoting

On-chain governance contract inheriting `ERC2771Context`:

- **Fund**: `fundDAO()` — deposit ETH, gain voting power
- **Propose**: `createProposal(recipient, amount, deadline)` — requires >= 10% of total balance
- **Vote**: `vote(proposalId, voteType)` — 3 options: For, Against, Abstain
- **Execute**: `executeProposal(proposalId)` — after deadline + security period if votes For > Against

## Setup

```bash
forge install
```

## Build

```bash
forge build
```

## Test

```bash
forge test -vv
```

27 tests covering:
- Funding
- Proposal creation (with balance validation)
- Voting (normal + gasless via forwarder)
- Vote changing before deadline
- Proposal execution (approved + defeated)
- Edge cases (nonexistent proposals, expired deadlines, double execution)

## Coverage

```bash
forge coverage
```

| Contract         | Lines   | Statements | Branches | Functions |
|------------------|---------|------------|----------|-----------|
| DAOVoting.sol    | 97%     | 96%        | 77%      | 100%      |
| MinimalForwarder | 77%     | 63%        | 29%      | 75%       |
| **Total**        | **83%** | **77%**    | **66%**  | **88%**   |

## Deploy

```bash
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
forge script script/DeployDAO.s.sol --broadcast --rpc-url http://127.0.0.1:8545 --private-key $PRIVATE_KEY
```

## Stack

- Solidity 0.8.20
- Foundry (forge, anvil)
- OpenZeppelin Contracts v5
