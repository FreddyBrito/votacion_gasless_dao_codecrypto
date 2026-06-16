export const FORWARDER_ADDRESS = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS as string;
export const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS as string;
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "31337");
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL as string;

export const FORWARDER_ABI = [
  "function execute(tuple(address from, address to, uint256 value, uint256 gas, uint48 deadline, bytes data) req, bytes signature) payable returns (bool, bytes)",
  "function verify(tuple(address from, address to, uint256 value, uint256 gas, uint48 deadline, bytes data) req, bytes signature) view returns (bool)",
  "function getNonce(address from) view returns (uint256)",
  "function eip712Domain() view returns (bytes1, string, string, uint256, address, bytes32, uint256[])",
] as const;

export const DAO_ABI = [
  "function fundDAO() payable",
  "function createProposal(address recipient, uint256 amount, uint256 deadline) external",
  "function vote(uint256 proposalId, uint8 voteType) external",
  "function executeProposal(uint256 proposalId) external",
  "function getProposal(uint256 proposalId) view returns (uint256 id, address recipient, uint256 amount, uint256 deadline, uint256 votesFor, uint256 votesAgainst, uint256 votesAbstain, bool executed)",
  "function getUserBalance(address user) view returns (uint256)",
  "function getProposalState(uint256 proposalId) view returns (uint8)",
  "function getVoteOf(uint256 proposalId, address voter) view returns (uint8)",
  "function hasVoted(uint256 proposalId, address voter) view returns (bool)",
  "function proposalCount() view returns (uint256)",
  "function totalFunds() view returns (uint256)",
  "function userBalance(address) view returns (uint256)",
  "event DAOFunded(address indexed funder, uint256 amount)",
  "event ProposalCreated(uint256 indexed id, address indexed recipient, uint256 amount, uint256 deadline)",
  "event Voted(uint256 indexed id, address indexed voter, uint8 voteType)",
  "event ProposalExecuted(uint256 indexed id, address indexed recipient, uint256 amount)",
] as const;

export enum VoteType {
  Against = 0,
  For = 1,
  Abstain = 2,
}

export enum ProposalState {
  Active = 0,
  Defeated = 1,
  Executed = 2,
}

export interface Proposal {
  id: bigint;
  recipient: string;
  amount: bigint;
  deadline: bigint;
  votesFor: bigint;
  votesAgainst: bigint;
  votesAbstain: bigint;
  executed: boolean;
}
