"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BrowserProvider, JsonRpcProvider, Contract, parseEther, formatEther } from "ethers";
import { DAO_ADDRESS, DAO_ABI, FORWARDER_ADDRESS, FORWARDER_ABI, RPC_URL, CHAIN_ID } from "./contracts";

interface Web3State {
  account: string | null;
  provider: BrowserProvider | null;
  signer: any;
  daoContract: Contract | null;
  forwarderContract: Contract | null;
  userBalance: bigint;
  totalFunds: bigint;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  refreshBalances: (addr: string) => Promise<void>;
}

const Web3Context = createContext<Web3State>({} as Web3State);

export function useWeb3() {
  return useContext(Web3Context);
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<any>(null);
  const [daoContract, setDaoContract] = useState<Contract | null>(null);
  const [forwarderContract, setForwarderContract] = useState<Contract | null>(null);
  const [userBalance, setUserBalance] = useState<bigint>(BigInt(0));
  const [totalFunds, setTotalFunds] = useState<bigint>(BigInt(0));
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalances = useCallback(async (addr: string) => {
    try {
      const readProvider = new JsonRpcProvider(RPC_URL);
      const daoRead = new Contract(DAO_ADDRESS, DAO_ABI, readProvider);
      const [bal, total] = await Promise.all([
        daoRead.getUserBalance(addr),
        daoRead.totalFunds(),
      ]);
      setUserBalance(bal);
      setTotalFunds(total);
    } catch (e) {
      console.error("Failed to refresh balances:", e);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask not installed");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);

      const network = await browserProvider.getNetwork();
      if (Number(network.chainId) !== CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
          });
        } catch {
          setError(`Please switch to chain ID ${CHAIN_ID}`);
          setIsConnecting(false);
          return;
        }
      }

      const sig = await browserProvider.getSigner();
      const addr = await sig.getAddress();

      const dao = new Contract(DAO_ADDRESS, DAO_ABI, sig);
      const fwd = new Contract(FORWARDER_ADDRESS, FORWARDER_ABI, sig);

      setProvider(browserProvider);
      setSigner(sig);
      setAccount(addr);
      setDaoContract(dao);
      setForwarderContract(fwd);

      await refreshBalances(addr);
    } catch (e: any) {
      setError(e.message || "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  }, [refreshBalances]);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAccount(null);
        setProvider(null);
        setSigner(null);
        setDaoContract(null);
        setForwarderContract(null);
      } else if (accounts[0] !== account) {
        connect();
      }
    };

    const handleChainChanged = () => {
      connect();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [account, connect]);

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        daoContract,
        forwarderContract,
        userBalance,
        totalFunds,
        isConnecting,
        error,
        connect,
        refreshBalances,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}
