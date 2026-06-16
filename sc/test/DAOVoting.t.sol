// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {MinimalForwarder} from "../src/MinimalForwarder.sol";
import {DAOVoting} from "../src/DAOVoting.sol";

contract DAOVotingTest is Test {
    MinimalForwarder public forwarder;
    DAOVoting         public dao;

    address alice;
    address bob;
    address carol;
    address dave;

    uint256 aliceKey;
    uint256 bobKey;
    uint256 carolKey;

    uint256 constant SECURITY_PERIOD = 1 hours;

    bytes32 private constant EIP712_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    function setUp() public {
        (alice, aliceKey) = makeAddrAndKey("alice");
        (bob,   bobKey)   = makeAddrAndKey("bob");
        (carol, carolKey) = makeAddrAndKey("carol");
        dave = makeAddr("dave");

        forwarder = new MinimalForwarder("MinimalForwarder");
        dao = new DAOVoting(address(forwarder), SECURITY_PERIOD);

        vm.deal(alice, 10 ether);
        vm.startPrank(alice);
        dao.fundDAO{value: 10 ether}();
        vm.stopPrank();

        vm.deal(bob, 5 ether);
        vm.startPrank(bob);
        dao.fundDAO{value: 5 ether}();
        vm.stopPrank();
    }

    // ─── Helpers ──────────────────────────────────────────

    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(abi.encode(
            EIP712_TYPEHASH,
            keccak256("MinimalForwarder"),
            keccak256("1"),
            block.chainid,
            address(forwarder)
        ));
    }

    function _buildAndSign(
        uint256 signerKey,
        address from,
        address to,
        bytes memory data,
        uint48  reqDeadline
    ) internal view returns (MinimalForwarder.ForwardRequest memory, bytes memory) {
        MinimalForwarder.ForwardRequest memory req = MinimalForwarder.ForwardRequest({
            from:     from,
            to:       to,
            value:    0,
            gas:      500_000,
            deadline: reqDeadline,
            data:     data
        });

        bytes32 structHash = keccak256(abi.encode(
            keccak256("ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,uint48 deadline,bytes data)"),
            from,
            to,
            uint256(0),
            uint256(500_000),
            forwarder.getNonce(from),
            reqDeadline,
            keccak256(data)
        ));

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return (req, abi.encodePacked(r, s, v));
    }

    // ─── Fund DAO ─────────────────────────────────────────

    function test_FundDAO() public view {
        assertEq(dao.getUserBalance(alice), 10 ether);
        assertEq(dao.getUserBalance(bob), 5 ether);
        assertEq(dao.totalFunds(), 15 ether);
    }

    function test_ReceiveETH() public {
        address random = makeAddr("random");
        vm.deal(random, 3 ether);
        vm.prank(random);
        (bool ok,) = address(dao).call{value: 3 ether}("");
        assertTrue(ok);
        assertEq(dao.getUserBalance(random), 3 ether);
        assertEq(dao.totalFunds(), 18 ether);
    }

    // ─── Create Proposal ──────────────────────────────────

    function test_CreateProposal() public {
        uint256 deadline = block.timestamp + 7 days;

        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        assertEq(dao.proposalCount(), 1);

        (uint256 id, address recipient, uint256 amount, uint256 d,,,,) = dao.getProposal(1);
        assertEq(id, 1);
        assertEq(recipient, carol);
        assertEq(amount, 1 ether);
        assertEq(d, deadline);
    }

    function test_CreateProposal_Revert_NotEnoughBalance() public {
        vm.prank(dave);
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.NotProposer.selector, 1.5 ether, uint256(0)));
        dao.createProposal(carol, 1 ether, block.timestamp + 1 days);
    }

    function test_CreateProposal_Revert_DaveCannotCreate() public {
        vm.startPrank(dave);
        vm.deal(dave, 0.1 ether);
        dao.fundDAO{value: 0.1 ether}();
        vm.stopPrank();

        vm.prank(dave);
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.NotProposer.selector, 1.51 ether, 0.1 ether));
        dao.createProposal(carol, 1 ether, block.timestamp + 1 days);
    }

    // ─── Vote ─────────────────────────────────────────────

    function test_Vote_For() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        vm.prank(bob);
        dao.vote(1, DAOVoting.VoteType.For);

        (,,,,uint256 votesFor,,,) = dao.getProposal(1);
        assertEq(votesFor, 1);
        assertTrue(dao.hasVoted(1, bob));
        assertEq(uint8(dao.getVoteOf(1, bob)), uint8(DAOVoting.VoteType.For));
    }

    function test_Vote_Against() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.Against);

        (,,,,,uint256 votesAgainst,,) = dao.getProposal(1);
        assertEq(votesAgainst, 1);
    }

    function test_Vote_Abstain() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        vm.prank(bob);
        dao.vote(1, DAOVoting.VoteType.Abstain);

        (,,,,,,uint256 votesAbstain,) = dao.getProposal(1);
        assertEq(votesAbstain, 1);
    }

    function test_Vote_ChangeVote() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        vm.startPrank(bob);
        dao.vote(1, DAOVoting.VoteType.For);
        (,,,,uint256 vF,,,) = dao.getProposal(1);
        assertEq(vF, 1);

        dao.vote(1, DAOVoting.VoteType.Against);
        vm.stopPrank();

        (,,,,uint256 vF2, uint256 vA,,) = dao.getProposal(1);
        assertEq(vF2, 0);
        assertEq(vA, 1);
        assertEq(uint8(dao.getVoteOf(1, bob)), uint8(DAOVoting.VoteType.Against));
    }

    function test_Vote_Revert_NonexistentProposal() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.ProposalNotFound.selector, 999));
        dao.vote(999, DAOVoting.VoteType.For);
    }

    function test_Vote_Revert_AfterDeadline() public {
        uint256 deadline = block.timestamp + 1 hours;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        vm.warp(deadline + 1);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.VotingClosed.selector, deadline));
        dao.vote(1, DAOVoting.VoteType.For);
    }

    function test_Vote_Revert_NoBalance() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        vm.prank(dave);
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.InsufficientBalance.selector, 1, uint256(0)));
        dao.vote(1, DAOVoting.VoteType.For);
    }

    // ─── Execute Proposal ─────────────────────────────────

    function test_ExecuteProposal_Approved() public {
        uint256 deadline = block.timestamp + 1 hours;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        vm.deal(carol, 5 ether);
        vm.startPrank(carol);
        dao.fundDAO{value: 5 ether}();
        vm.stopPrank();

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.For);
        vm.prank(carol);
        dao.vote(1, DAOVoting.VoteType.For);
        vm.prank(bob);
        dao.vote(1, DAOVoting.VoteType.Against);

        vm.warp(deadline + SECURITY_PERIOD + 1);

        uint256 carolBalanceBefore = carol.balance;

        vm.prank(alice);
        dao.executeProposal(1);

        assertEq(carol.balance - carolBalanceBefore, 1 ether);
        assertEq(dao.totalFunds(), 19 ether);
        (,,,,,,,bool executed) = dao.getProposal(1);
        assertTrue(executed);
    }

    function test_ExecuteProposal_Defeated() public {
        uint256 deadline = block.timestamp + 1 hours;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.For);
        vm.prank(bob);
        dao.vote(1, DAOVoting.VoteType.For);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.Against);

        vm.warp(deadline + SECURITY_PERIOD + 1);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.NotExecutable.selector, 1));
        dao.executeProposal(1);
    }

    function test_ExecuteProposal_Revert_NotDeadlinePassed() public {
        uint256 deadline = block.timestamp + 1 hours;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.For);

        vm.warp(deadline - 1);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.NotExecutable.selector, 1));
        dao.executeProposal(1);
    }

    function test_ExecuteProposal_Revert_SecurityPeriodNotElapsed() public {
        uint256 deadline = block.timestamp + 1 hours;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.For);

        vm.warp(deadline + 1);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.NotExecutable.selector, 1));
        dao.executeProposal(1);
    }

    function test_ExecuteProposal_Revert_AlreadyExecuted() public {
        uint256 deadline = block.timestamp + 1 hours;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.For);

        vm.warp(deadline + SECURITY_PERIOD + 1);

        vm.prank(alice);
        dao.executeProposal(1);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.AlreadyExecuted.selector, 1));
        dao.executeProposal(1);
    }

    function test_ExecuteProposal_Revert_NonexistentProposal() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.ProposalNotFound.selector, 999));
        dao.executeProposal(999);
    }

    // ─── Gasless Voting (via MinimalForwarder) ─────────────

    function test_GaslessVote() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        bytes memory voteData = abi.encodeCall(DAOVoting.vote, (1, DAOVoting.VoteType.For));
        uint48 reqDeadline = uint48(block.timestamp + 1 hours);

        (MinimalForwarder.ForwardRequest memory req, bytes memory sig) =
            _buildAndSign(bobKey, bob, address(dao), voteData, reqDeadline);

        vm.prank(alice);
        (bool success,) = forwarder.execute(req, sig);
        assertTrue(success);

        assertTrue(dao.hasVoted(1, bob));
        assertEq(uint8(dao.getVoteOf(1, bob)), uint8(DAOVoting.VoteType.For));
        (,,,,uint256 votesFor,,,) = dao.getProposal(1);
        assertEq(votesFor, 1);
    }

    function test_GaslessVote_Revert_InvalidSignature() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        bytes memory voteData = abi.encodeCall(DAOVoting.vote, (1, DAOVoting.VoteType.For));
        uint48 reqDeadline = uint48(block.timestamp + 1 hours);

        (MinimalForwarder.ForwardRequest memory req, bytes memory sig) =
            _buildAndSign(aliceKey, bob, address(dao), voteData, reqDeadline);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(MinimalForwarder.InvalidSigner.selector, bob, alice));
        forwarder.execute(req, sig);
    }

    function test_GaslessVote_Revert_ExpiredRequest() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        bytes memory voteData = abi.encodeCall(DAOVoting.vote, (1, DAOVoting.VoteType.For));
        uint48 reqDeadline = uint48(block.timestamp + 1 hours);

        (MinimalForwarder.ForwardRequest memory req, bytes memory sig) =
            _buildAndSign(bobKey, bob, address(dao), voteData, reqDeadline);

        vm.warp(reqDeadline + 1);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(MinimalForwarder.ExpiredRequest.selector, reqDeadline));
        forwarder.execute(req, sig);
    }

    // ─── Nonces ───────────────────────────────────────────

    function test_NonceIncrement() public {
        assertEq(forwarder.getNonce(bob), 0);

        uint256 deadline = block.timestamp + 7 days;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        bytes memory voteData = abi.encodeCall(DAOVoting.vote, (1, DAOVoting.VoteType.For));
        uint48 reqDeadline = uint48(block.timestamp + 1 hours);

        (MinimalForwarder.ForwardRequest memory req, bytes memory sig) =
            _buildAndSign(bobKey, bob, address(dao), voteData, reqDeadline);

        vm.prank(alice);
        forwarder.execute(req, sig);

        assertEq(forwarder.getNonce(bob), 1);
    }

    // ─── Full Scenario ────────────────────────────────────

    function test_FullScenario() public {
        vm.deal(carol, 20 ether);
        vm.prank(carol);
        dao.fundDAO{value: 20 ether}();
        assertEq(dao.totalFunds(), 35 ether);

        uint256 deadline = block.timestamp + 7 days;
        vm.prank(alice);
        dao.createProposal(carol, 2 ether, deadline);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.For);

        vm.prank(bob);
        dao.vote(1, DAOVoting.VoteType.Against);

        vm.prank(carol);
        dao.vote(1, DAOVoting.VoteType.For);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.Against);

        (,,,,uint256 vF, uint256 vA,,) = dao.getProposal(1);
        assertEq(vF, 1);
        assertEq(vA, 2);

        vm.warp(deadline + SECURITY_PERIOD + 1);

        assertEq(uint8(dao.getProposalState(1)), uint8(DAOVoting.ProposalState.Defeated));

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DAOVoting.NotExecutable.selector, 1));
        dao.executeProposal(1);
    }

    function test_ExecutionAfterVoteChange_Approved() public {
        uint256 deadline = block.timestamp + 1 hours;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.For);
        vm.prank(bob);
        dao.vote(1, DAOVoting.VoteType.Against);
        vm.prank(bob);
        dao.vote(1, DAOVoting.VoteType.For);

        (,,,,uint256 vF, uint256 vA,,) = dao.getProposal(1);
        assertEq(vF, 2);
        assertEq(vA, 0);

        vm.warp(deadline + SECURITY_PERIOD + 1);

        uint256 carolBalanceBefore = carol.balance;
        vm.prank(alice);
        dao.executeProposal(1);
        assertEq(carol.balance - carolBalanceBefore, 1 ether);
    }

    // ─── View Functions ───────────────────────────────────

    function test_GetProposalState_Active() public {
        uint256 deadline = block.timestamp + 7 days;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);
        assertEq(uint8(dao.getProposalState(1)), uint8(DAOVoting.ProposalState.Active));
    }

    function test_GetProposalState_Defeated() public {
        uint256 deadline = block.timestamp + 1 hours;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        vm.prank(bob);
        dao.vote(1, DAOVoting.VoteType.Against);

        vm.warp(deadline + SECURITY_PERIOD + 1);
        assertEq(uint8(dao.getProposalState(1)), uint8(DAOVoting.ProposalState.Defeated));
    }

    function test_GetProposalState_Executable() public {
        uint256 deadline = block.timestamp + 1 hours;
        vm.prank(alice);
        dao.createProposal(carol, 1 ether, deadline);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.For);

        vm.warp(deadline + SECURITY_PERIOD + 1);
        assertEq(uint8(dao.getProposalState(1)), uint8(DAOVoting.ProposalState.Executed));
    }
}
