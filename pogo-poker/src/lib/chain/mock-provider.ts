/**
 * In-memory mock chain provider for development. Lets tests / the deposit
 * monitor simulate incoming transfers and outbound sends deterministically,
 * with no live chain.
 */

import { randomBytes } from "node:crypto";
import type { Asset } from "@prisma/client";
import type { IncomingTransfer, SendResult, ChainProvider } from "./provider";

export class MockChainProvider implements ChainProvider {
  readonly name = "mock";
  private pending = new Map<string, IncomingTransfer[]>();
  private confirmations = new Map<string, number>();

  /** Test helper: queue a simulated incoming deposit. */
  simulateDeposit(
    t: Omit<IncomingTransfer, "confirmations" | "blockNumber">,
  ): void {
    const list = this.pending.get(t.toAddress) ?? [];
    const full: IncomingTransfer = {
      ...t,
      confirmations: 64,
      blockNumber: Date.now(),
    };
    list.push(full);
    this.pending.set(t.toAddress, list);
    this.confirmations.set(t.txHash, 64);
  }

  async getConfirmations(txHash: string): Promise<number> {
    return this.confirmations.get(txHash) ?? 0;
  }

  async getOnChainBalance(_address: string, _asset: Asset): Promise<bigint> {
    // The mock holds no real chain balance; treasury reconciliation is gated to
    // the real provider, so this is only ever a placeholder in dev/tests.
    return 0n;
  }

  async getIncomingTransfers(
    address: string,
    _sinceTxHash?: string,
  ): Promise<IncomingTransfer[]> {
    return this.pending.get(address) ?? [];
  }

  async sendTransfer(params: {
    asset: Asset;
    toAddress: string;
    amount: bigint;
    idempotencyKey: string;
  }): Promise<SendResult> {
    // Deterministic-ish fake hash; in real life this is the chain's tx hash.
    const hash = `mock_${params.idempotencyKey}_${randomBytes(6).toString(
      "hex",
    )}`;
    this.confirmations.set(hash, 64);
    return { txHash: hash };
  }

  async postAnchor(_payload: string): Promise<SendResult> {
    const hash = `mock_anchor_${randomBytes(8).toString("hex")}`;
    this.confirmations.set(hash, 64);
    return { txHash: hash };
  }
}
