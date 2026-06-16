"use client";

import { useState, useEffect } from "react";
import { useWeb3 } from "@/lib/web3";
import { formatEther } from "ethers";
import { Proposal, ProposalState, VoteType } from "@/lib/contracts";
import VoteButtons from "./VoteButtons";

interface ProposalCardProps {
  proposal: Proposal;
  onRefresh: () => void;
}

const STATE_LABELS: Record<number, { label: string; bg: string; text: string }> = {
  [ProposalState.Active]: { label: "Active", bg: "#efefef", text: "#000000" },
  [ProposalState.Defeated]: { label: "Defeated", bg: "#efefef", text: "#5e5e5e" },
  [ProposalState.Executed]: { label: "Executed", bg: "#000000", text: "#ffffff" },
};

const VOTE_LABELS: Record<number, string> = {
  [VoteType.Against]: "Against",
  [VoteType.For]: "For",
  [VoteType.Abstain]: "Abstain",
};

export default function ProposalCard({ proposal, onRefresh }: ProposalCardProps) {
  const { account, daoContract, refreshBalances } = useWeb3();
  const [state, setState] = useState<number>(ProposalState.Active);
  const [userVote, setUserVote] = useState<number>(VoteType.Against);
  const [hasVoted, setHasVoted] = useState(false);
  const [executing, setExecuting] = useState(false);

  const id = Number(proposal.id);

  useEffect(() => {
    if (!daoContract || !account) return;

    const load = async () => {
      const [s, hv, uv] = await Promise.all([
        daoContract.getProposalState(id),
        daoContract.hasVoted(id, account),
        daoContract.getVoteOf(id, account),
      ]);
      setState(Number(s));
      setHasVoted(hv);
      setUserVote(Number(uv));
    };

    load();
  }, [daoContract, account, id]);

  const handleExecute = async () => {
    if (!daoContract) return;
    setExecuting(true);
    try {
      const tx = await daoContract.executeProposal(id);
      await tx.wait();
      if (account) await refreshBalances(account);
      onRefresh();
    } catch (e: any) {
      console.error(e);
    } finally {
      setExecuting(false);
    }
  };

  const isExecutable = state === ProposalState.Active && Number(proposal.deadline) < Date.now() / 1000;

  const deadlineDate = new Date(Number(proposal.deadline) * 1000);
  const isVotingOpen = state === ProposalState.Active && new Date() < deadlineDate;

  const stateInfo = STATE_LABELS[state] || STATE_LABELS[ProposalState.Active];

  return (
    <div className="bg-white rounded-2xl p-6">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-[12px] text-[#afafaf]">#{id}</span>
          <h3 className="text-[20px] font-bold">{proposal.title || `Proposal ${id}`}</h3>
        </div>
        <span
          className="text-[12px] font-medium px-3 py-1 rounded-full"
          style={{ backgroundColor: stateInfo.bg, color: stateInfo.text }}
        >
          {stateInfo.label}
        </span>
      </div>

      {proposal.description && (
        <p className="text-[14px] text-[#5e5e5e] mb-3 leading-relaxed">
          {proposal.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3 text-[14px]">
        <div>
          <p className="text-[#afafaf]">Recipient</p>
          <p className="font-mono text-[12px] break-all">{proposal.recipient}</p>
        </div>
        <div>
          <p className="text-[#afafaf]">Amount</p>
          <p className="font-bold">{formatEther(proposal.amount)} ETH</p>
        </div>
        <div>
          <p className="text-[#afafaf]">Deadline</p>
          <p className="text-[12px]">{deadlineDate.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[#afafaf]">Status</p>
          <p className="text-[12px]">{proposal.executed ? "Executed" : "Pending"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[14px] mb-3">
        <div className="bg-[#dcfce7] rounded-xl p-3">
          <p className="font-bold text-[18px] text-[#16a34a]">{Number(proposal.votesFor)}</p>
          <p className="text-[12px] text-[#15803d]">For</p>
        </div>
        <div className="bg-[#fee2e2] rounded-xl p-3">
          <p className="font-bold text-[18px] text-[#dc2626]">{Number(proposal.votesAgainst)}</p>
          <p className="text-[12px] text-[#b91c1c]">Against</p>
        </div>
        <div className="bg-[#fef3c7] rounded-xl p-3">
          <p className="font-bold text-[18px] text-[#d97706]">{Number(proposal.votesAbstain)}</p>
          <p className="text-[12px] text-[#b45309]">Abstain</p>
        </div>
      </div>

      {hasVoted && (
        <p className="text-[12px] text-[#afafaf] mb-2">
          Your vote:{" "}
          <span
            className="font-medium px-2 py-0.5 rounded-full text-[12px]"
            style={{
              backgroundColor: userVote === VoteType.For ? "#dcfce7" : userVote === VoteType.Against ? "#fee2e2" : "#fef3c7",
              color: userVote === VoteType.For ? "#16a34a" : userVote === VoteType.Against ? "#dc2626" : "#d97706",
            }}
          >
            {VOTE_LABELS[userVote]}
          </span>
        </p>
      )}

      {isVotingOpen && (
        <VoteButtons
          proposalId={id}
          hasVoted={hasVoted}
          currentVote={userVote}
          isActive={isVotingOpen}
          onVoted={onRefresh}
        />
      )}

      {isExecutable && !proposal.executed && (
        <button
          onClick={handleExecute}
          disabled={executing}
          className="mt-3 w-full bg-black hover:bg-[#282828] disabled:bg-[#afafaf] text-white text-[16px] font-medium py-2.5 px-4 rounded-full transition-colors cursor-pointer"
        >
          {executing ? "Executing..." : "Execute proposal"}
        </button>
      )}
    </div>
  );
}
