import { NextRequest, NextResponse } from "next/server";
import { JsonRpcProvider, Wallet, Contract, Interface } from "ethers";

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const RELAYER_KEY = process.env.RELAYER_PRIVATE_KEY;
const FORWARDER_ADDRESS = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS;
const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS;

const FORWARDER_ABI = [
  "function execute(tuple(address from, address to, uint256 value, uint256 gas, uint48 deadline, bytes data) req, bytes signature) payable returns (bool, bytes)",
  "function verify(tuple(address from, address to, uint256 value, uint256 gas, uint48 deadline, bytes data) req, bytes signature) view returns (bool)",
];

export async function POST(req: NextRequest) {
  try {
    if (!RELAYER_KEY || !FORWARDER_ADDRESS || !DAO_ADDRESS) {
      return NextResponse.json({ error: "Missing environment variables" }, { status: 500 });
    }

    const body = await req.json();
    const { request, signature } = body;

    if (!request || !signature) {
      return NextResponse.json({ error: "Missing request or signature" }, { status: 400 });
    }

    const provider = new JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(RELAYER_KEY, provider);
    const forwarder = new Contract(FORWARDER_ADDRESS, FORWARDER_ABI, wallet);

    console.log(`[Relayer] Processing vote from ${request.from}`);

    const isValid = await forwarder.verify(request, signature);
    if (!isValid) {
      console.log(`[Relayer] Invalid signature from ${request.from}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const tx = await forwarder.execute(request, signature, {
      gasLimit: 500000,
    });

    console.log(`[Relayer] TX submitted: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`[Relayer] TX confirmed in block ${receipt.blockNumber}`);

    return NextResponse.json({
      txHash: receipt.hash,
      success: true,
      blockNumber: receipt.blockNumber,
    });
  } catch (error: any) {
    console.error("[Relayer] Error:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Relayer error" },
      { status: 500 }
    );
  }
}
