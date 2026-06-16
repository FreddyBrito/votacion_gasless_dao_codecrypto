"use client";

import { useState } from "react";
import { useWeb3 } from "@/lib/web3";
import { buildAndSignVote, submitToRelayer } from "@/lib/eip712";
import { VoteType } from "@/lib/contracts";

interface VoteButtonsProps {
  proposalId: number;
  hasVoted: boolean;
  currentVote: number;
  isActive: boolean;
  onVoted: () => void;
}

export default function VoteButtons({ proposalId, hasVoted, currentVote, isActive, onVoted }: VoteButtonsProps) {
  const { account, provider } = useWeb3();
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!account || !isActive) return null;

  const handleVote = async (voteType: number) => {
    if (!provider) return;
    setLoading(voteType);
    setError(null);

    try {
      const { request, signature } = await buildAndSignVote(provider, account, proposalId, voteType);
      const result = await submitToRelayer(request, signature);

      if (result.success) {
        onVoted();
      } else {
        setError("Transaction failed in the relayer");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error voting");
    } finally {
      setLoading(null);
    }
  };

  const buttons = [
    { type: VoteType.For, label: "For" },
    { type: VoteType.Against, label: "Against" },
    { type: VoteType.Abstain, label: "Abstain" },
  ];

  return (
    <div>
      <div className="flex gap-2">
        {buttons.map((btn) => {
          const isSelected = hasVoted && currentVote === btn.type;
          return (
            <button
              key={btn.type}
              onClick={() => handleVote(btn.type)}
              disabled={loading !== null}
              className={`text-[14px] font-medium py-2 px-4 rounded-full transition-colors cursor-pointer disabled:bg-[#efefef] disabled:text-[#afafaf] ${
                isSelected
                  ? "bg-black text-white"
                  : "bg-[#efefef] text-black hover:bg-[#e2e2e2]"
              }`}
            >
              {loading === btn.type ? (
                <span className="animate-spin inline-block">...</span>
              ) : (
                btn.label
              )}
              {isSelected && <span className="ml-1 text-[12px]">(current)</span>}
            </button>
          );
        })}
      </div>
      <p className="text-[12px] text-[#afafaf] mt-1.5">Gasless voting — no gas fees</p>
      {error && <p className="text-[14px] text-[#5e5e5e] mt-1">{error}</p>}
    </div>
  );
}
