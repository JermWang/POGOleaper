/**
 * Deposit service. Users deposit from their connected Robinhood Chain wallet to
 * the shared treasury address; the monitor attributes each incoming transfer to
 * the user by matching the SENDER address to their linked wallet, waits for
 * confirmations, and credits the internal ledger exactly once per tx hash
 * (idempotent). Funds land directly in the treasury — no per-user deposit
 * addresses, no key custody, no sweeping.
 */

import type { Asset } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { creditDeposit } from "@/lib/ledger/ledger";
import { recordRiskEvent } from "@/lib/risk/risk-events";
import { getChainProvider } from "./connection";
import type { IncomingTransfer } from "./provider";

/**
 * Record a treasury transfer whose sender maps to no user (e.g. an exchange
 * withdrawal, where the on-chain sender is the exchange, not the player). It is
 * persisted once (idempotent on txHash) as an UNATTRIBUTED deposit and raised
 * as a HIGH risk event so an admin can attribute it — never silently dropped.
 * Recording it also advances the deposit-scan cursor past it.
 */
async function recordUnattributedDeposit(t: IncomingTransfer): Promise<void> {
  const existing = await prisma.deposit.findUnique({
    where: { txHash: t.txHash },
  });
  if (existing) return; // already recorded — no duplicate, no repeat alert
  try {
    await prisma.deposit.create({
      data: {
        userId: null,
        asset: t.asset,
        chain: "ROBINHOOD",
        fromAddress: t.fromAddress,
        toAddress: t.toAddress,
        txHash: t.txHash,
        amount: t.amount,
        confirmations: t.confirmations,
        status: "UNATTRIBUTED",
      },
    });
  } catch {
    // A concurrent poll already inserted it (unique txHash) — fine.
    return;
  }
  await recordRiskEvent({
    type: "ADMIN_ACTION",
    severity: "HIGH",
    metadata: {
      kind: "unattributed_deposit",
      txHash: t.txHash,
      asset: t.asset,
      amount: t.amount.toString(),
      fromAddress: t.fromAddress,
    },
  });
}

/**
 * Admin action: attribute a previously UNATTRIBUTED deposit to a user and credit
 * it (idempotent). Use after manually confirming the off-chain sender (e.g. an
 * exchange withdrawal) belongs to that user.
 */
export async function assignUnattributedDeposit(params: {
  depositId: string;
  userId: string;
}): Promise<{ credited: boolean }> {
  const deposit = await prisma.deposit.findUnique({
    where: { id: params.depositId },
  });
  if (!deposit) throw new Error("Deposit not found");
  if (deposit.status === "CREDITED") return { credited: false };
  if (deposit.userId && deposit.userId !== params.userId) {
    throw new Error("Deposit is already attributed to another user");
  }
  // Re-check confirmations live so a long-pending deposit credits immediately.
  const confirmations = await getChainProvider().getConfirmations(
    deposit.txHash,
  );
  return ingestTransfer({
    userId: params.userId,
    asset: deposit.asset,
    toAddress: deposit.toAddress,
    fromAddress: deposit.fromAddress,
    txHash: deposit.txHash,
    amount: deposit.amount,
    confirmations,
  });
}

/**
 * Process a single observed transfer. Idempotent on txHash: if a Deposit row
 * already exists for this hash it is updated, never duplicated, and crediting
 * happens at most once.
 */
export async function ingestTransfer(params: {
  userId: string;
  asset: Asset;
  toAddress: string;
  fromAddress: string | null;
  txHash: string;
  amount: bigint;
  confirmations: number;
}): Promise<{ credited: boolean }> {
  const confirmed = params.confirmations >= env.depositConfirmations;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.deposit.findUnique({
      where: { txHash: params.txHash },
    });

    // Already credited — nothing to do (idempotent guard).
    if (existing?.status === "CREDITED") {
      return { credited: false };
    }

    const deposit = existing
      ? await tx.deposit.update({
          where: { txHash: params.txHash },
          data: {
            // Attribute (or re-attribute) to the resolved user — this is how an
            // UNATTRIBUTED row becomes owned when an admin assigns it.
            userId: params.userId,
            confirmations: params.confirmations,
            status: confirmed ? "CONFIRMED" : "DETECTED",
          },
        })
      : await tx.deposit.create({
          data: {
            userId: params.userId,
            asset: params.asset,
            chain: "ROBINHOOD",
            fromAddress: params.fromAddress,
            toAddress: params.toAddress,
            txHash: params.txHash,
            amount: params.amount,
            confirmations: params.confirmations,
            status: confirmed ? "CONFIRMED" : "DETECTED",
          },
        });

    if (!confirmed) return { credited: false };

    // Credit the ledger and flip to CREDITED within the same transaction. Use
    // the resolved userId param (deposit.userId is nullable in the schema).
    await creditDeposit(
      {
        userId: params.userId,
        asset: deposit.asset,
        amount: deposit.amount,
        correlationId: `deposit:${deposit.txHash}`,
        metadata: { txHash: deposit.txHash },
      },
      tx,
    );

    await tx.deposit.update({
      where: { id: deposit.id },
      data: { status: "CREDITED", creditedAt: new Date() },
    });

    return { credited: true };
  });
}

/**
 * Re-check every recorded-but-uncredited deposit by its tx hash and credit it
 * once it reaches the confirmation threshold. This is INDEPENDENT of the treasury
 * scan window: once a deposit has been recorded (status DETECTED/CONFIRMED), it is
 * polled directly by hash until credited, so a deposit can never be lost just
 * because its block scrolled out of the recent-blocks scan under load.
 */
export async function recheckPendingDeposits(): Promise<{ credited: number }> {
  const provider = getChainProvider();
  const pending = await prisma.deposit.findMany({
    where: { chain: "ROBINHOOD", status: { in: ["DETECTED", "CONFIRMED"] } },
  });

  let credited = 0;
  for (const d of pending) {
    // DETECTED/CONFIRMED deposits are always attributed; skip any without a user
    // (would be an UNATTRIBUTED row, which this query excludes) to satisfy types.
    if (!d.userId) continue;
    const confirmations = await provider.getConfirmations(d.txHash);
    if (confirmations <= 0) continue;
    const res = await ingestTransfer({
      userId: d.userId,
      asset: d.asset,
      toAddress: d.toAddress,
      fromAddress: d.fromAddress,
      txHash: d.txHash,
      amount: d.amount,
      confirmations,
    });
    if (res.credited) credited++;
  }
  return { credited };
}

/**
 * Scan the treasury address for incoming transfers and credit each to the user
 * whose linked wallet sent it. Transfers from unknown wallets are skipped (left
 * for manual review). Used by the deposit-monitor job and on-demand.
 *
 * Uses the most recently recorded deposit as a chain-side cursor so only NEW
 * blocks are scanned each poll, and always re-checks already-recorded pending
 * deposits so none are lost to the scan window.
 */
export async function scanTreasuryDeposits(): Promise<{ credited: number; unattributed: number }> {
  const treasury = env.treasuryWalletAddress;
  if (!treasury) return { credited: 0, unattributed: 0 };

  const provider = getChainProvider();

  // Cursor: the newest deposit we've already recorded for this treasury. The
  // provider scans forward only from its block, so we never re-parse the whole
  // history and never miss a tx newer than it.
  const newest = await prisma.deposit.findFirst({
    where: { chain: "ROBINHOOD", toAddress: treasury },
    orderBy: { createdAt: "desc" },
    select: { txHash: true },
  });

  const transfers = await provider.getIncomingTransfers(
    treasury,
    newest?.txHash,
  );
  let credited = 0;
  let unattributed = 0;

  for (const t of transfers) {
    // EVM addresses are case-insensitive (checksum casing varies by source), so
    // linked wallets are stored lowercase and matched lowercase.
    const wallet = t.fromAddress
      ? await prisma.wallet.findUnique({
          where: {
            chain_address: {
              chain: "ROBINHOOD",
              address: t.fromAddress.toLowerCase(),
            },
          },
        })
      : null;
    if (!wallet?.userId) {
      // Sender maps to no linked wallet — record for manual attribution instead
      // of dropping it (the funds are really in the treasury).
      unattributed++;
      await recordUnattributedDeposit(t);
      continue;
    }
    const res = await ingestTransfer({
      userId: wallet.userId,
      asset: t.asset,
      toAddress: t.toAddress,
      fromAddress: t.fromAddress,
      txHash: t.txHash,
      amount: t.amount,
      confirmations: t.confirmations,
    });
    if (res.credited) credited++;
  }

  // Independently advance any recorded-but-uncredited deposits toward CREDITED.
  const recheck = await recheckPendingDeposits();
  credited += recheck.credited;

  return { credited, unattributed };
}
