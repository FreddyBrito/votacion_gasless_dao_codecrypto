"use client";

import { useState } from "react";
import { useWeb3 } from "@/lib/web3";
import { parseEther, formatEther } from "ethers";

export default function CreateProposal({ onCreated }: { onCreated?: () => void }) {
  const { account, daoContract, userBalance, totalFunds, refreshBalances } = useWeb3();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("7");
  const [useGasless, setUseGasless] = useState(true);
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const canCreate = totalFunds > BigInt(0) && userBalance >= totalFunds / BigInt(10);

  const handleCreate = async () => {
    if (!daoContract || !title || !recipient || !amount) return;

    setLoading(true);
    setTxStatus("pending");
    setErrorMsg("");
    try {
      const deadline = Math.floor(Date.now() / 1000) + Number(deadlineDays) * 86400;
      const tx = await daoContract.createProposal(title, description, recipient, parseEther(amount), deadline);
      await tx.wait();
      setTxStatus("success");
      onCreated?.();
      setTitle("");
      setDescription("");
      setRecipient("");
      setAmount("");
      setDeadlineDays("7");
    } catch (e: any) {
      console.error(e);
      setTxStatus("error");
      if (e.reason?.includes("NotProposer")) {
        setErrorMsg("You need at least 10% of the total balance to create proposals");
      } else {
        setErrorMsg(e.reason || e.message || "Error creating proposal");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!account) return null;

  return (
    <div className="bg-white rounded-2xl p-6">
      <h2 className="text-[24px] font-bold mb-4">Create proposal</h2>

      {!canCreate && totalFunds > BigInt(0) && (
        <div className="bg-[#f3f3f3] rounded-xl p-4 mb-4">
          <p className="text-[14px] text-[#5e5e5e]">
            You need at least 10% of the total balance ({formatEther(totalFunds / BigInt(10))} ETH) to create proposals.
            Your balance: {formatEther(userBalance)} ETH
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-[14px] font-medium text-[#5e5e5e] mb-1">Title</label>
          <input
            type="text"
            placeholder="Proposal title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#efefef] rounded-lg px-4 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-[14px] font-medium text-[#5e5e5e] mb-1">Description</label>
          <textarea
            placeholder="Describe the proposal..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-[#efefef] rounded-lg px-4 py-2.5 text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-[14px] font-medium text-[#5e5e5e] mb-1">Recipient address</label>
          <input
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full bg-[#efefef] rounded-lg px-4 py-2.5 text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[14px] font-medium text-[#5e5e5e] mb-1">Amount (ETH)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#efefef] rounded-lg px-4 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-[14px] font-medium text-[#5e5e5e] mb-1">Deadline (days)</label>
            <input
              type="number"
              min="1"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
              className="w-full bg-[#efefef] rounded-lg px-4 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        <div className="flex items-center justify-between bg-[#f3f3f3] rounded-xl px-4 py-3">
          <div>
            <p className="text-[14px] font-medium text-black">Pay gas fee</p>
            <p className="text-[12px] text-[#afafaf]">Turn off for gasless voting</p>
          </div>
          <button
            type="button"
            onClick={() => setUseGasless(!useGasless)}
            className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
              useGasless ? "bg-[#afafaf]" : "bg-black"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                useGasless ? "translate-x-0" : "translate-x-5"
              }`}
            />
          </button>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading || !title || !recipient || !amount || !canCreate}
          className="w-full bg-black hover:bg-[#282828] disabled:bg-[#afafaf] text-white text-[16px] font-medium py-2.5 px-4 rounded-full transition-colors cursor-pointer"
        >
          {loading ? "Creating..." : useGasless ? "Create proposal (gasless)" : "Create proposal (pay gas)"}
        </button>
      </div>

      {txStatus === "success" && (
        <p className="text-[14px] text-[#5e5e5e] mt-2">Proposal created successfully</p>
      )}
      {txStatus === "error" && (
        <p className="text-[14px] text-[#5e5e5e] mt-2">{errorMsg}</p>
      )}
    </div>
  );
}
