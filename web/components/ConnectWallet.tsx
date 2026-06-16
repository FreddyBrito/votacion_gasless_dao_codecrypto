"use client";

import { useWeb3 } from "@/lib/web3";
import { formatEther } from "ethers";

export default function ConnectWallet() {
  const { account, userBalance, isConnecting, error, connect } = useWeb3();

  if (account) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm text-gray-500">Balance en DAO</p>
          <p className="font-mono font-bold">{formatEther(userBalance)} ETH</p>
        </div>
        <div className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm font-mono">
          {account.slice(0, 6)}...{account.slice(-4)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={connect}
        disabled={isConnecting}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors cursor-pointer"
      >
        {isConnecting ? "Conectando..." : "Conectar MetaMask"}
      </button>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
