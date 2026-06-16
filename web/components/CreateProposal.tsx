"use client";

import { useState } from "react";
import { useWeb3 } from "@/lib/web3";
import { parseEther, formatEther } from "ethers";

export default function CreateProposal() {
  const { account, daoContract, userBalance, totalFunds, refreshBalances } = useWeb3();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("7");
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const canCreate = totalFunds > BigInt(0) && userBalance >= totalFunds / BigInt(10);

  const handleCreate = async () => {
    if (!daoContract || !recipient || !amount) return;

    setLoading(true);
    setTxStatus("pending");
    setErrorMsg("");
    try {
      const deadline = Math.floor(Date.now() / 1000) + Number(deadlineDays) * 86400;
      const tx = await daoContract.createProposal(recipient, parseEther(amount), deadline);
      await tx.wait();
      setTxStatus("success");
      setRecipient("");
      setAmount("");
      setDeadlineDays("7");
    } catch (e: any) {
      console.error(e);
      setTxStatus("error");
      if (e.reason?.includes("NotProposer")) {
        setErrorMsg("Necesitas al menos el 10% del balance total para crear propuestas");
      } else {
        setErrorMsg(e.reason || e.message || "Error al crear propuesta");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!account) return null;

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
      <h2 className="text-xl font-bold mb-4">Crear Propuesta</h2>

      {!canCreate && totalFunds > BigInt(0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-yellow-800 text-sm">
            Necesitas al menos el 10% del balance total ({formatEther(totalFunds / BigInt(10))} ETH) para crear propuestas.
            Tu balance: {formatEther(userBalance)} ETH
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección del beneficiario</label>
          <input
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad (ETH)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plazo (días)</label>
            <input
              type="number"
              min="1"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading || !recipient || !amount || !canCreate}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer"
        >
          {loading ? "Creando..." : "Crear Propuesta"}
        </button>
      </div>

      {txStatus === "success" && (
        <p className="text-green-600 text-sm mt-2">Propuesta creada correctamente</p>
      )}
      {txStatus === "error" && (
        <p className="text-red-600 text-sm mt-2">{errorMsg}</p>
      )}
    </div>
  );
}
