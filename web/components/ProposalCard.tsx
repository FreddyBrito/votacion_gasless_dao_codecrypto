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

const STATE_LABELS: Record<number, { label: string; color: string }> = {
  [ProposalState.Active]: { label: "Activa", color: "bg-blue-100 text-blue-800" },
  [ProposalState.Defeated]: { label: "Rechazada", color: "bg-red-100 text-red-800" },
  [ProposalState.Executed]: { label: "Ejecutada", color: "bg-green-100 text-green-800" },
};

const VOTE_LABELS: Record<number, string> = {
  [VoteType.Against]: "En Contra",
  [VoteType.For]: "A Favor",
  [VoteType.Abstain]: "Abstención",
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
    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-xs font-mono text-gray-400">#{id}</span>
          <h3 className="text-lg font-bold">Propuesta {id}</h3>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stateInfo.color}`}>
          {stateInfo.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div>
          <p className="text-gray-500">Beneficiario</p>
          <p className="font-mono text-xs break-all">{proposal.recipient}</p>
        </div>
        <div>
          <p className="text-gray-500">Monto</p>
          <p className="font-bold">{formatEther(proposal.amount)} ETH</p>
        </div>
        <div>
          <p className="text-gray-500">Fecha límite</p>
          <p className="text-xs">{deadlineDate.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-500">Estado</p>
          <p className="text-xs">{proposal.executed ? "Ya ejecutada" : "Pendiente"}</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-green-600 font-bold">{Number(proposal.votesFor)}</p>
            <p className="text-xs text-gray-500">A Favor</p>
          </div>
          <div>
            <p className="text-red-600 font-bold">{Number(proposal.votesAgainst)}</p>
            <p className="text-xs text-gray-500">En Contra</p>
          </div>
          <div>
            <p className="text-gray-600 font-bold">{Number(proposal.votesAbstain)}</p>
            <p className="text-xs text-gray-500">Abstención</p>
          </div>
        </div>
      </div>

      {hasVoted && (
        <p className="text-xs text-gray-500 mb-2">
          Tu voto: <span className="font-semibold">{VOTE_LABELS[userVote]}</span>
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
          className="mt-3 w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer"
        >
          {executing ? "Ejecutando..." : "Ejecutar Propuesta"}
        </button>
      )}
    </div>
  );
}
