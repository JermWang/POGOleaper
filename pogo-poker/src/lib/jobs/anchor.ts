/**
 * Outcome-anchoring job. Batches completed-but-unanchored hands into a Merkle
 * tree and posts the root on-chain in the calldata of a single 0-value
 * hot-wallet self-transaction (see anchoring.ts), then links the hands to the
 * resulting HandAnchor row.
 *
 * Batching policy (fee-efficient — anchor "important stuff", not every hand):
 * anchor when at least ANCHOR_MIN_BATCH hands are waiting, OR when the oldest
 * waiting hand is older than ANCHOR_MAX_AGE_MS (so quiet tables still anchor in
 * bounded time). One tx covers the whole batch.
 *
 * Idempotency: the HandAnchor row is created PENDING and the hands are only
 * linked after the anchor tx confirms. If posting fails, the row is marked
 * FAILED and the hands stay unanchored for the next run.
 */

import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { getChainProvider } from "@/lib/chain/connection";
import { explorerTxUrl } from "@/lib/chain/explorer";
import {
  ANCHOR_ALGORITHM,
  buildAnchorPayload,
  buildMerkleTree,
  canonicalHandRecord,
  encodeRecord,
  leafHash,
  merkleProof,
  merkleRoot,
  rootFromProof,
  type AnchorHandRecord,
  type ProofStep,
} from "@/lib/chain/anchoring";

export async function runAnchorOnce(): Promise<{
  anchored: number;
  txHash?: string;
}> {
  if (!env.anchorEnabled) return { anchored: 0 };

  const candidates = await prisma.hand.findMany({
    where: { status: "COMPLETE", anchorId: null },
    orderBy: { completedAt: "asc" },
    take: env.anchorMaxBatch,
    include: { results: true },
  });
  if (candidates.length === 0) return { anchored: 0 };

  // Only anchor once a batch is worthwhile or the oldest hand is aging out.
  const oldest = candidates[0]!.completedAt ?? candidates[0]!.startedAt;
  const ageMs = Date.now() - oldest.getTime();
  const enough = candidates.length >= env.anchorMinBatch;
  const stale = ageMs >= env.anchorMaxAgeMs;
  if (!enough && !stale) return { anchored: 0 };

  // Deterministic leaf ordering (by id). The verify endpoint rebuilds the tree
  // the same way, so proofs line up.
  const batch = [...candidates].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  const leaves = batch.map((h) => leafHash(canonicalHandRecord(h)));
  const rootHex = merkleRoot(leaves).toString("hex");
  const payload = buildAnchorPayload(rootHex, batch.length);

  // Reserve the anchor row before posting; link hands only after confirmation.
  const anchor = await prisma.handAnchor.create({
    data: {
      merkleRoot: rootHex,
      handCount: batch.length,
      algorithm: ANCHOR_ALGORITHM,
      status: "PENDING",
    },
  });

  let txHash: string;
  try {
    const res = await getChainProvider().postAnchor(payload);
    txHash = res.txHash;
  } catch (err) {
    await prisma.handAnchor.update({
      where: { id: anchor.id },
      data: { status: "FAILED" },
    });
    throw err;
  }

  await prisma.$transaction([
    prisma.handAnchor.update({
      where: { id: anchor.id },
      data: { status: "CONFIRMED", txHash, confirmedAt: new Date() },
    }),
    prisma.hand.updateMany({
      where: { id: { in: batch.map((h) => h.id) }, anchorId: null },
      data: { anchorId: anchor.id },
    }),
  ]);

  return { anchored: batch.length, txHash };
}

export async function runAnchorLoop(intervalMs = env.anchorIntervalMs): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const r = await runAnchorOnce();
      if (r.anchored > 0)
        console.log(`[anchor] anchored ${r.anchored} hand(s) · tx ${r.txHash}`);
    } catch (err) {
      console.error("[anchor] error", err);
    }
    await new Promise((res) => setTimeout(res, intervalMs));
  }
}

export interface HandAnchorProof {
  anchored: boolean;
  status?: string;
  algorithm?: string;
  /** The canonical record whose hash is the leaf (recompute to verify). */
  record?: AnchorHandRecord;
  leafHash?: string;
  proof?: ProofStep[];
  /** Root recomputed from the record + proof (what the verifier derives). */
  computedRoot?: string;
  /** Root stored at anchor time / posted on-chain. */
  merkleRoot?: string;
  rootMatches?: boolean;
  handCount?: number;
  chain?: string;
  txHash?: string | null;
  explorerUrl?: string | null;
  confirmedAt?: string | null;
}

/**
 * Build the on-chain anchor proof for a single hand: its canonical record, the
 * Merkle inclusion proof, and the anchored root + tx. Anyone can recompute
 * leafHash(record), fold the proof to a root, and check it equals the root in
 * the linked on-chain anchor tx's calldata.
 */
export async function buildHandAnchorProof(
  handId: string,
): Promise<HandAnchorProof> {
  const hand = await prisma.hand.findUnique({
    where: { id: handId },
    include: { anchor: true },
  });
  if (!hand || !hand.anchorId || !hand.anchor) {
    return { anchored: false };
  }

  // Rebuild the batch exactly as the anchor job did: all hands in this anchor,
  // ordered by id, with their results.
  const batch = await prisma.hand.findMany({
    where: { anchorId: hand.anchorId },
    orderBy: { id: "asc" },
    include: { results: true },
  });
  const index = batch.findIndex((h) => h.id === handId);
  if (index < 0) return { anchored: false };

  const records = batch.map((h) => canonicalHandRecord(h));
  const leaves = records.map((r) => leafHash(r));
  const layers = buildMerkleTree(leaves);
  const proof = merkleProof(layers, index);
  const leaf = leaves[index]!;
  const computedRoot = rootFromProof(leaf, proof);

  const explorerUrl = hand.anchor.txHash
    ? explorerTxUrl(hand.anchor.txHash)
    : null;

  return {
    anchored: true,
    status: hand.anchor.status,
    algorithm: hand.anchor.algorithm,
    record: records[index]!,
    leafHash: leaf.toString("hex"),
    proof,
    computedRoot,
    merkleRoot: hand.anchor.merkleRoot,
    rootMatches: computedRoot === hand.anchor.merkleRoot,
    handCount: hand.anchor.handCount,
    chain: hand.anchor.chain,
    txHash: hand.anchor.txHash,
    explorerUrl,
    confirmedAt: hand.anchor.confirmedAt
      ? hand.anchor.confirmedAt.toISOString()
      : null,
  };
}

// Expose encodeRecord for clients that want the exact leaf preimage bytes.
export { encodeRecord };

if (process.argv[1] && process.argv[1].includes("anchor")) {
  void runAnchorLoop();
}
