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
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
      <h2 className="text-xl font-bold mb-4">Financiar DAO</h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase">Tu balance</p>
          <p className="text-lg font-bold font-mono">{formatEther(userBalance)} ETH</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase">Total DAO</p>
          <p className="text-lg font-bold font-mono">{formatEther(totalFunds)} ETH</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Cantidad ETH"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleFund}
          disabled={loading || !amount || Number(amount) <= 0}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer"
        >
          {loading ? "Enviando..." : "Depositar"}
        </button>
      </div>

      {txStatus === "success" && (
        <p className="text-green-600 text-sm mt-2">Fondos depositados correctamente</p>
      )}
      {txStatus === "error" && (
        <p className="text-red-600 text-sm mt-2">Error al depositar fondos</p>
      )}
    </div>
  );
}
