"use client";

import { useWeb3 } from "@/lib/web3";
import { formatEther } from "ethers";

export default function ConnectWallet() {
  const { account, userBalance, isConnecting, error, connect } = useWeb3();

  if (account) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-[12px] text-[#afafaf]">DAO balance</p>
          <p className="text-[16px] font-bold">{formatEther(userBalance)} ETH</p>
        </div>
        <div className="bg-[#efefef] text-black px-4 py-1.5 rounded-full text-[14px] font-medium">
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
        className="bg-black hover:bg-[#282828] disabled:bg-[#afafaf] text-white text-[16px] font-medium py-2.5 px-6 rounded-full transition-colors cursor-pointer"
      >
        {isConnecting ? "Connecting..." : "Connect MetaMask"}
      </button>
      {error && <p className="text-[#5e5e5e] text-[14px] mt-1">{error}</p>}
    </div>
  );
}
