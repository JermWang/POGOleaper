/**
 * Robinhood Chain RPC client + provider resolution.
 *
 * In development (or whenever no hot wallet is configured) we use an in-memory
 * MockChainProvider so deposit/withdrawal flows can be exercised end-to-end
 * without a live chain. Production wires a real provider backed by viem and
 * a secure signer.
 */

import { createPublicClient, http, type PublicClient } from "viem";
import { env } from "@/lib/env";
import { robinhoodChain } from "./robinhood";
import { MockChainProvider } from "./mock-provider";
import { EvmChainProvider } from "./evm-provider";
import type { ChainProvider } from "./provider";

let publicClient: PublicClient | null = null;

/** Server-side viem public client for Robinhood Chain (read-only RPC). */
export function getPublicClient(): PublicClient {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: robinhoodChain(env.robinhoodChainId, env.robinhoodRpcUrl),
      transport: http(env.robinhoodRpcUrl),
    });
  }
  return publicClient;
}

let provider: ChainProvider | null = null;

export function getChainProvider(): ChainProvider {
  if (provider) return provider;
  // Use the real chain provider once a hot wallet is configured (production /
  // testnet with real funds); otherwise the in-memory mock for local dev.
  provider = env.hotWalletPrivateKey
    ? new EvmChainProvider(getPublicClient())
    : new MockChainProvider();
  return provider;
}

/** Test/seed hook to inject a provider. */
export function setChainProvider(p: ChainProvider): void {
  provider = p;
}
