/**
 * Chain provider abstraction for Robinhood Chain (EVM). Deposit monitoring and
 * withdrawal sending depend on this interface, never on viem directly, so the
 * chain can be mocked in development and swapped for a hardened signing service
 * in prod.
 *
 * Amounts are bigint base units (wei for ETH, token base units for ERC-20s).
 */

import type { Asset } from "@prisma/client";

export interface IncomingTransfer {
  txHash: string;
  toAddress: string;
  fromAddress: string | null;
  asset: Asset;
  amount: bigint;
  confirmations: number;
  blockNumber: number;
}

export interface SendResult {
  txHash: string;
}

export interface ChainProvider {
  readonly name: string;
  /** Confirmations for a given tx hash (0 if unknown / dropped / reverted). */
  getConfirmations(txHash: string): Promise<number>;
  /**
   * Current on-chain balance of an address for an asset, in base units (wei for
   * ETH, token base units for ERC-20). Returns 0 if the token is not configured.
   * Used to reconcile custodial liabilities against real chain holdings.
   */
  getOnChainBalance(address: string, asset: Asset): Promise<bigint>;
  /**
   * Incoming transfers to a watched address (native ETH transfers + ERC-20
   * Transfer logs). Scans ALL blocks newer than the block containing
   * `sinceTxHash` (a chain-side cursor — the last tx already processed), so no
   * transfer is missed under load. Omit the cursor to scan a recent-blocks
   * baseline window.
   */
  getIncomingTransfers(
    address: string,
    sinceTxHash?: string,
  ): Promise<IncomingTransfer[]>;
  /** Send an outbound transfer from the hot wallet. SERVER ONLY. */
  sendTransfer(params: {
    asset: Asset;
    toAddress: string;
    amount: bigint;
    /** Idempotency key so a retried withdrawal is never double-sent. */
    idempotencyKey: string;
  }): Promise<SendResult>;
  /**
   * Post an anchor transaction signed by the hot wallet: a 0-value tx to itself
   * carrying `payload` (utf-8) in calldata. Used to anchor outcome Merkle roots
   * on-chain. SERVER ONLY.
   */
  postAnchor(payload: string): Promise<SendResult>;
}
