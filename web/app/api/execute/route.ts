import { NextRequest, NextResponse } from "next/server";
import { JsonRpcProvider, Wallet, Contract } from "ethers";

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const RELAYER_KEY = process.env.RELAYER_PRIVATE_KEY;
const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS;

const DAO_ABI = [
  "function executeProposal(uint256 proposalId) external",
  "function getProposalState(uint256 proposalId) view returns (uint8)",
  "function proposalCount() view returns (uint256)",
  "function getProposal(uint256 proposalId) view returns (uint256, address, uint256, uint256, uint256, uint256, uint256, bool)",
];

export async function POST(req: NextRequest) {
  try {
    if (!RELAYER_KEY || !DAO_ADDRESS) {
      return NextResponse.json({ error: "Missing environment variables" }, { status: 500 });
    }

    const provider = new JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(RELAYER_KEY, provider);
    const dao = new Contract(DAO_ADDRESS, DAO_ABI, wallet);

    const count = await dao.proposalCount();
    const n = Number(count);
    const executed: number[] = [];
    const failed: { id: number; error: string }[] = [];

    for (let i = 1; i <= n; i++) {
      try {
        const state = await dao.getProposalState(i);
        if (Number(state) === 0) {
          // Active and past deadline — try execute
          const tx = await dao.executeProposal(i, { gasLimit: 300000 });
          await tx.wait();
          executed.push(i);
          console.log(`[Daemon] Executed proposal #${i}`);
        }
      } catch (e: any) {
        failed.push({ id: i, error: e.reason || e.message });
      }
    }

    return NextResponse.json({
      scanned: n,
      executed,
      failed,
    });
  } catch (error: any) {
    console.error("[Daemon] Error:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Daemon error" },
      { status: 500 }
    );
  }
}
