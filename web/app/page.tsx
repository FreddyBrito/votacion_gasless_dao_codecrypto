"use client";

import { Web3Provider } from "@/lib/web3";
import ConnectWallet from "@/components/ConnectWallet";
import FundingPanel from "@/components/FundingPanel";
import CreateProposal from "@/components/CreateProposal";
import ProposalList from "@/components/ProposalList";

export default function Home() {
  return (
    <Web3Provider>
      <header className="bg-black text-white px-8 py-8">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-[36px] font-bold leading-[44px]">
              DAO Voting
            </h1>
            <p className="text-[16px] text-[#afafaf] mt-1">
              Gasless voting with EIP-2771 meta-transactions
            </p>
          </div>
          <ConnectWallet />
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <FundingPanel />
            <CreateProposal />
          </div>
          <div className="lg:col-span-2">
            <ProposalList />
          </div>
        </div>
      </main>

      <footer className="bg-black text-white px-8 py-12 text-center">
        <p className="text-[14px] text-[#afafaf]">
          DAO Gasless Voting — CodeCrypto
        </p>
      </footer>
    </Web3Provider>
  );
}
