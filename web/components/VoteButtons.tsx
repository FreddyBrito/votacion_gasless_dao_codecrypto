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
        setError("La transacción falló en el relayer");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error al votar");
    } finally {
      setLoading(null);
    }
  };

  const buttons = [
    { type: VoteType.For, label: "A Favor", color: "bg-green-600 hover:bg-green-700", icon: "+" },
    { type: VoteType.Against, label: "En Contra", color: "bg-red-600 hover:bg-red-700", icon: "-" },
    { type: VoteType.Abstain, label: "Abstención", color: "bg-gray-500 hover:bg-gray-600", icon: "—" },
  ];

  return (
    <div>
      <div className="flex gap-2">
        {buttons.map((btn) => (
          <button
            key={btn.type}
            onClick={() => handleVote(btn.type)}
            disabled={loading !== null}
            className={`${btn.color} disabled:bg-gray-300 text-white text-sm font-semibold py-1.5 px-3 rounded-lg transition-colors cursor-pointer flex items-center gap-1`}
          >
            {loading === btn.type ? (
              <span className="animate-spin">⟳</span>
            ) : (
              <span>{btn.icon}</span>
            )}
            {btn.label}
            {hasVoted && currentVote === btn.type && (
              <span className="text-xs">(actual)</span>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1">Votación gasless — no pagas gas</p>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
