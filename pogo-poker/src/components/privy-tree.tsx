"use client";

import { useEffect, type ReactNode } from "react";
import {
  PrivyProvider,
  usePrivy,
  useWallets,
} from "@privy-io/react-auth";
import { numberToHex } from "viem";
import { PrivyConfiguredContext } from "./privy-context";
import { setTokenGetter, authedFetch } from "@/lib/auth/privy-token";
import { setWalletDepositor } from "@/lib/chain/wallet-deposit";
import { clientRobinhoodChain } from "@/lib/chain/robinhood";

/**
 * Bridges Privy's getAccessToken out to the SSR-safe token module so authedFetch
 * (which must not import the Privy SDK) can attach a fresh Bearer token to API
 * requests. Renders nothing.
 */
function TokenBridge() {
  const { getAccessToken } = usePrivy();
  useEffect(() => {
    setTokenGetter(getAccessToken);
    return () => setTokenGetter(null);
  }, [getAccessToken]);
  return null;
}

/**
 * Registers the connected wallet's "deposit ETH to the treasury" action via the
 * SSR-safe bridge, so the poker table can pull a buy-in straight from the wallet
 * (wallet popup) without the rest of the app importing the Privy SDK.
 */
function DepositBridge() {
  const { wallets } = useWallets();
  useEffect(() => {
    setWalletDepositor(async (wei: bigint) => {
      const wallet = wallets[0];
      if (!wallet) throw new Error("Connect your wallet to deposit");
      const res = await authedFetch("/api/chain/deposit-prep");
      const prep = (await res.json()) as {
        treasury?: string;
        chainId?: number;
        error?: string;
      };
      if (!res.ok || !prep.treasury) {
        throw new Error(prep.error ?? "Could not prepare deposit");
      }
      // Make sure the wallet is on Robinhood Chain before signing.
      const chainId = prep.chainId ?? clientRobinhoodChain.id;
      await wallet.switchChain(chainId);
      const provider = await wallet.getEthereumProvider();
      const txHash = (await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: wallet.address,
            to: prep.treasury,
            value: numberToHex(wei),
          },
        ],
      })) as string;
      return { txHash };
    });
    return () => setWalletDepositor(null);
  }, [wallets]);
  return null;
}

/**
 * The actual Privy provider tree. This is the ONLY module that imports the Privy
 * SDK, and it is loaded via `dynamic(..., { ssr: false })` from providers.tsx —
 * so the Privy import graph (with its webpack-stubbed optional deps) never
 * enters SSR / static prerender, which previously rendered an undefined
 * component and broke the production build.
 */
export default function PrivyTree({
  appId,
  children,
}: {
  appId: string;
  children: ReactNode;
}) {
  return (
    <PrivyConfiguredContext.Provider value={true}>
      <PrivyProvider
        appId={appId}
        config={{
          loginMethods: ["wallet"],
          // Robinhood Chain is a custom chain, so it must be BOTH the default
          // and in supportedChains for embedded + external wallets to use it.
          defaultChain: clientRobinhoodChain,
          supportedChains: [clientRobinhoodChain],
          appearance: {
            theme: "dark",
            accentColor: "#22c55e",
            walletChainType: "ethereum-only",
            // Curated list of dominant EVM wallets. We do NOT include
            // "detected_ethereum_wallets" on purpose — that auto-surfaces every
            // installed wallet, which we don't want.
            walletList: ["metamask", "coinbase_wallet", "rainbow"],
          },
        }}
      >
        <TokenBridge />
        <DepositBridge />
        {children}
      </PrivyProvider>
    </PrivyConfiguredContext.Provider>
  );
}
