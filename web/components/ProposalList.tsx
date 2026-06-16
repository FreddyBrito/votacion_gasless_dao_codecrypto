"use client";

import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "@/lib/web3";
import { Contract, JsonRpcProvider } from "ethers";
import { DAO_ADDRESS, DAO_ABI, Proposal, RPC_URL } from "@/lib/contracts";
import ProposalCard from "./ProposalCard";

export default function ProposalList() {
  const { account, daoContract } = useWeb3();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProposals = useCallback(async () => {
    try {
      const provider = new JsonRpcProvider(RPC_URL);
      const dao = new Contract(DAO_ADDRESS, DAO_ABI, provider);
      const count = await dao.proposalCount();
      const n = Number(count);

      const items: Proposal[] = [];
      for (let i = 1; i <= n; i++) {
        const p = await dao.getProposal(i);
        items.push({
          id: p.id,
          title: p.title,
          description: p.description,
          recipient: p.recipient,
          amount: p.amount,
          deadline: p.deadline,
          votesFor: p.votesFor,
          votesAgainst: p.votesAgainst,
          votesAbstain: p.votesAbstain,
          executed: p.executed,
        });
      }

      setProposals(items.reverse());
    } catch (e) {
      console.error("Failed to fetch proposals:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  if (loading) {
    return (
      <div className="text-center py-8 text-[16px] text-[#afafaf]">
        Loading proposals...
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="text-center py-8 text-[16px] text-[#afafaf]">
        No proposals created yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-[24px] font-bold">Proposals ({proposals.length})</h2>
      {proposals.map((p) => (
        <ProposalCard key={Number(p.id)} proposal={p} onRefresh={fetchProposals} />
      ))}
    </div>
  );
}
