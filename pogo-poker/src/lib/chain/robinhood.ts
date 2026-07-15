/**
 * Robinhood Chain definitions (EVM, Arbitrum Orbit L2 settling on Ethereum).
 *
 * SAFE FOR THE CLIENT BUNDLE: this module reads only NEXT_PUBLIC_ env (inlined
 * at build time) and has no server-only imports, so the Privy tree and other
 * client components can share the exact same chain object the server uses.
 * Server code that needs a private RPC URL builds its chain via
 * `robinhoodChain(env.robinhoodChainId, env.robinhoodRpcUrl)` instead.
 *
 * Chain facts:
 *  - Mainnet: chain id 4663, RPC https://rpc.mainnet.chain.robinhood.com,
 *    native gas token ETH, ~100ms blocks.
 *  - Testnet: chain id 46630 (faucet at faucet.testnet.chain.robinhood.com).
 *  - Explorer: https://robinhoodchain.blockscout.com (Blockscout).
 */

import { defineChain, type Chain } from "viem";

export const ROBINHOOD_MAINNET_ID = 4663;
export const ROBINHOOD_TESTNET_ID = 46630;

export const ROBINHOOD_MAINNET_RPC = "https://rpc.mainnet.chain.robinhood.com";
// TODO: confirm the public testnet RPC URL once published; this follows the
// mainnet naming convention.
export const ROBINHOOD_TESTNET_RPC = "https://rpc.testnet.chain.robinhood.com";

export const ROBINHOOD_MAINNET_EXPLORER =
  "https://robinhoodchain.blockscout.com";

function defaultRpcFor(chainId: number): string {
  return chainId === ROBINHOOD_TESTNET_ID
    ? ROBINHOOD_TESTNET_RPC
    : ROBINHOOD_MAINNET_RPC;
}

/** Build the viem Chain object for Robinhood Chain (mainnet or testnet). */
export function robinhoodChain(chainId?: number, rpcUrl?: string): Chain {
  const id = chainId ?? ROBINHOOD_MAINNET_ID;
  const rpc = rpcUrl && rpcUrl.length > 0 ? rpcUrl : defaultRpcFor(id);
  const testnet = id !== ROBINHOOD_MAINNET_ID;
  return defineChain({
    id,
    name: testnet ? "Robinhood Chain Testnet" : "Robinhood Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
    blockExplorers: {
      default: { name: "Blockscout", url: ROBINHOOD_MAINNET_EXPLORER },
    },
    testnet,
  });
}

/**
 * The chain object for CLIENT code (Privy wallet config, etc.). Uses
 * NEXT_PUBLIC_ overrides so a testnet deploy can point the browser wallets at
 * testnet; defaults to mainnet.
 */
export const clientRobinhoodChain: Chain = robinhoodChain(
  Number(process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID ?? "") ||
    ROBINHOOD_MAINNET_ID,
  process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL,
);
