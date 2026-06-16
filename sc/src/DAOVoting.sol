// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title DAOVoting
 * @notice On-chain governance: fund → propose → vote → execute.
 *         Supports gasless voting via ERC-2771 meta-transactions.
 */
contract DAOVoting is ERC2771Context {
    using Address for address payable;

    enum VoteType { Against, For, Abstain }
    enum ProposalState { Active, Defeated, Executed }

    struct Proposal {
        uint256 id;
        address recipient;
        uint256 amount;
        uint256 deadline;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votesAbstain;
        bool    executed;
    }

    uint256 public proposalCount;
    uint256 public totalFunds;
    uint256 public securityPeriod;

    mapping(uint256 => Proposal) private _proposals;
    mapping(address => uint256)  public  userBalance;
    mapping(uint256 => mapping(address => VoteType))  private _votes;
    mapping(uint256 => mapping(address => bool))      private _hasVoted;

    event DAOFunded(address indexed funder, uint256 amount);
    event ProposalCreated(uint256 indexed id, address indexed recipient, uint256 amount, uint256 deadline);
    event Voted(uint256 indexed id, address indexed voter, VoteType voteType);
    event ProposalExecuted(uint256 indexed id, address indexed recipient, uint256 amount);

    error InsufficientBalance(uint256 required, uint256 available);
    error NotProposer(uint256 required, uint256 available);
    error ProposalNotFound(uint256 id);
    error VotingClosed(uint256 deadline);
    error NotExecutable(uint256 id);
    error AlreadyExecuted(uint256 id);
    error TransferFailed();

    constructor(address trustedForwarder_, uint256 securityPeriod_)
        ERC2771Context(trustedForwarder_)
    {
        securityPeriod = securityPeriod_;
    }

    receive() external payable {
        userBalance[msg.sender] += msg.value;
        totalFunds += msg.value;
        emit DAOFunded(msg.sender, msg.value);
    }

    function fundDAO() external payable {
        userBalance[_msgSender()] += msg.value;
        totalFunds += msg.value;
        emit DAOFunded(_msgSender(), msg.value);
    }

    function createProposal(
        address recipient,
        uint256 amount,
        uint256 deadline
    ) external {
        address proposer = _msgSender();
        uint256 required = totalFunds / 10;
        if (userBalance[proposer] < required) {
            revert NotProposer(required, userBalance[proposer]);
        }

        uint256 id = ++proposalCount;
        Proposal storage p = _proposals[id];
        p.id        = id;
        p.recipient = recipient;
        p.amount    = amount;
        p.deadline  = deadline;

        emit ProposalCreated(id, recipient, amount, deadline);
    }

    function vote(uint256 proposalId, VoteType voteType) external {
        address voter = _msgSender();

        if (_proposals[proposalId].id == 0) revert ProposalNotFound(proposalId);
        if (block.timestamp > _proposals[proposalId].deadline) revert VotingClosed(_proposals[proposalId].deadline);
        if (userBalance[voter] == 0) revert InsufficientBalance(1, 0);

        Proposal storage p = _proposals[proposalId];

        if (_hasVoted[proposalId][voter]) {
            VoteType prev = _votes[proposalId][voter];
            if (prev == VoteType.For)          p.votesFor--;
            else if (prev == VoteType.Against) p.votesAgainst--;
            else                               p.votesAbstain--;
        } else {
            _hasVoted[proposalId][voter] = true;
        }

        _votes[proposalId][voter] = voteType;
        if (voteType == VoteType.For)          p.votesFor++;
        else if (voteType == VoteType.Against) p.votesAgainst++;
        else                                   p.votesAbstain++;

        emit Voted(proposalId, voter, voteType);
    }

    function executeProposal(uint256 proposalId) external {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert ProposalNotFound(proposalId);
        if (p.executed) revert AlreadyExecuted(proposalId);
        if (block.timestamp <= p.deadline + securityPeriod) revert NotExecutable(proposalId);
        if (p.votesFor <= p.votesAgainst) revert NotExecutable(proposalId);

        p.executed = true;
        totalFunds -= p.amount;

        (bool ok,) = payable(p.recipient).call{value: p.amount}("");
        if (!ok) revert TransferFailed();

        emit ProposalExecuted(proposalId, p.recipient, p.amount);
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            uint256 id,
            address recipient,
            uint256 amount,
            uint256 deadline,
            uint256 votesFor,
            uint256 votesAgainst,
            uint256 votesAbstain,
            bool    executed
        )
    {
        Proposal storage p = _proposals[proposalId];
        return (p.id, p.recipient, p.amount, p.deadline, p.votesFor, p.votesAgainst, p.votesAbstain, p.executed);
    }

    function getUserBalance(address user) external view returns (uint256) {
        return userBalance[user];
    }

    function getProposalState(uint256 proposalId) external view returns (ProposalState) {
        Proposal storage p = _proposals[proposalId];
        if (p.executed) return ProposalState.Executed;
        if (block.timestamp > p.deadline + securityPeriod && p.votesFor > p.votesAgainst) {
            return ProposalState.Executed;
        }
        if (p.votesFor <= p.votesAgainst && block.timestamp > p.deadline) {
            return ProposalState.Defeated;
        }
        return ProposalState.Active;
    }

    function getVoteOf(uint256 proposalId, address voter) external view returns (VoteType) {
        return _votes[proposalId][voter];
    }

    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return _hasVoted[proposalId][voter];
    }
}
