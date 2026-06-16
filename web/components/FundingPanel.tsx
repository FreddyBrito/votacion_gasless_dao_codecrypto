"use client";

import { useState } from "react";
import { useWeb3 } from "@/lib/web3";
import { parseEther, formatEther } from "ethers";

export default function FundingPanel() {
  const { account, daoContract, userBalance, totalFunds, refreshBalances } = useWeb3();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");

  const handleFund = async () => {
    if (!daoContract || !amount) return;

    setLoading(true);
    setTxStatus("pending");
    try {
      const tx = await daoContract.fundDAO({ value: parseEther(amount) });
      await tx.wait();
      setTxStatus("success");
      setAmount("");
      await refreshBalances(account!);
    } catch (e: any) {
      console.error(e);
      setTxStatus("error");
    } finally {
      setLoading(false);
    }
  };

  if (!account) return null;

  return (
    <div className="bg-white rounded-2xl p-6">
      <h2 className="text-[24px] font-bold mb-4">Fund DAO</h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-[#efefef] rounded-xl p-4">
          <p className="text-[12px] text-[#5e5e5e] uppercase tracking-wide">Your balance</p>
          <p className="text-[18px] font-bold mt-1">{formatEther(userBalance)} ETH</p>
        </div>
        <div className="bg-[#efefef] rounded-xl p-4">
          <p className="text-[12px] text-[#5e5e5e] uppercase tracking-wide">DAO total</p>
          <p className="text-[18px] font-bold mt-1">{formatEther(totalFunds)} ETH</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="ETH amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 bg-[#efefef] rounded-lg px-4 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          onClick={handleFund}
          disabled={loading || !amount || Number(amount) <= 0}
          className="bg-black hover:bg-[#282828] disabled:bg-[#afafaf] text-white text-[16px] font-medium py-2.5 px-5 rounded-full transition-colors cursor-pointer"
        >
          {loading ? "Sending..." : "Deposit"}
        </button>
      </div>

      {txStatus === "success" && (
        <p className="text-[14px] text-[#5e5e5e] mt-2">Funds deposited successfully</p>
      )}
      {txStatus === "error" && (
        <p className="text-[14px] text-[#5e5e5e] mt-2">Error depositing funds</p>
      )}
    </div>
  );
}
