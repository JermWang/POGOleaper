"use client";

/**
 * SSR-safe bridge to the connected wallet's "deposit ETH" action, WITHOUT
 * importing the Privy SDK here (the SDK is isolated behind the ssr:false Privy
 * tree — importing it elsewhere breaks the prerender build). The Privy tree
 * registers the real implementation at runtime via setWalletDepositor();
 * everything else (e.g. the poker table) calls through depositEthFromWallet().
 *
 * Mirrors the token-getter bridge in privy-token.ts.
 */

export type WalletDepositResult = { txHash: string };
export type WalletDepositor = (wei: bigint) => Promise<WalletDepositResult>;

let depositor: WalletDepositor | null = null;

/** Called by the Privy tree (client-only) to expose its signing-backed depositor. */
export function setWalletDepositor(fn: WalletDepositor | null): void {
  depositor = fn;
}

/** Whether an in-app wallet deposit is currently available (wallet connected). */
export function canDepositFromWallet(): boolean {
  return depositor != null;
}

/**
 * Sign + send an ETH transfer of `wei` from the connected wallet to the
 * treasury. Resolves with the on-chain transaction hash (0x…). Throws if no
 * wallet is connected or the user rejects the transaction.
 */
export async function depositEthFromWallet(
  wei: bigint,
): Promise<WalletDepositResult> {
  if (!depositor) throw new Error("Connect your wallet to deposit");
  return depositor(wei);
}
