"use client";

import { Web3Provider } from "@/lib/web3";
import ConnectWallet from "@/components/ConnectWallet";
import FundingPanel from "@/components/FundingPanel";
import CreateProposal from "@/components/CreateProposal";
import ProposalList from "@/components/ProposalList";

export default function Home() {
  return (
    <Web3Provider>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DAO Voting</h1>
            <p className="text-sm text-gray-500">Votación gasless con EIP-2771</p>
          </div>
          <ConnectWallet />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
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

      <footer className="bg-white border-t border-gray-200 px-6 py-3 text-center text-xs text-gray-400">
        DAO Gasless Voting — CodeCrypto
      </footer>
    </Web3Provider>
  );
}
