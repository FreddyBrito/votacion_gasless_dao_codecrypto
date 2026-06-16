import { Contract, BrowserProvider } from "ethers";
import { FORWARDER_ADDRESS, DAO_ADDRESS, FORWARDER_ABI, DAO_ABI } from "./contracts";

const FORWARD_REQUEST_TYPE = {
  ForwardRequest: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint48" },
    { name: "data", type: "bytes" },
  ],
};

export async function buildAndSignVote(
  provider: BrowserProvider,
  account: string,
  proposalId: number,
  voteType: number,
): Promise<{ request: any; signature: string }> {
  const signer = await provider.getSigner();
  const forwarder = new Contract(FORWARDER_ADDRESS, FORWARDER_ABI, signer);

  const daoInterface = new Contract(DAO_ADDRESS, DAO_ABI, provider).interface;
  const voteData = daoInterface.encodeFunctionData("vote", [proposalId, voteType]);

  const nonce = await forwarder.getNonce(account);
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  const domain = {
    name: "MinimalForwarder",
    version: "1",
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || "31337"),
    verifyingContract: FORWARDER_ADDRESS,
  };

  const values = {
    from: account,
    to: DAO_ADDRESS,
    value: 0,
    gas: 500000,
    nonce: nonce.toString(),
    deadline,
    data: voteData,
  };

  const signature = await signer.signTypedData(domain, FORWARD_REQUEST_TYPE, values);

  const request = {
    from: account,
    to: DAO_ADDRESS,
    value: 0,
    gas: 500000,
    deadline,
    data: voteData,
  };

  return { request, signature };
}

export async function submitToRelayer(request: any, signature: string): Promise<{ txHash: string; success: boolean }> {
  const res = await fetch("/api/relay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request, signature }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Relayer failed");
  }

  return res.json();
}
