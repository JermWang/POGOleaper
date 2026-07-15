/**
 * One-off admin attribution: credit a specific UNATTRIBUTED treasury deposit to
 * a user (the on-chain sender wasn't their linked wallet, so the monitor couldn't
 * auto-match it). Uses the app's own assignUnattributedDeposit so the ledger
 * stays consistent + idempotent. DB credit + RPC read only — no on-chain send.
 *
 * Run: npx tsx --env-file=.env scripts/attribute-deposit.ts <txSignature> <userId>
 */

import { prisma } from "../src/lib/db/prisma";
import { assignUnattributedDeposit } from "../src/lib/solana/deposits";

const TX = process.argv[2];
const USER = process.argv[3];

async function main() {
  if (!TX || !USER) {
    console.error("usage: attribute-deposit.ts <txSignature> <userId>");
    process.exit(1);
  }
  const dep = await prisma.deposit.findUnique({ where: { txSignature: TX } });
  if (!dep) {
    console.error("No deposit with that txSignature");
    process.exit(1);
  }
  console.log(
    `Deposit ${dep.id}: ${dep.status} ${dep.amount.toString()} ${dep.asset} from ${dep.fromAddress}`,
  );
  if (dep.status === "CREDITED") {
    console.log("Already CREDITED — nothing to do.");
    process.exit(0);
  }
  const before = await prisma.balance.findFirst({ where: { userId: USER, asset: dep.asset } });
  console.log("User balance before:", before?.availableAmount?.toString() ?? "0");

  const res = await assignUnattributedDeposit({ depositId: dep.id, userId: USER });
  console.log("Attribution result:", JSON.stringify(res));

  const after = await prisma.balance.findFirst({ where: { userId: USER, asset: dep.asset } });
  console.log("User balance after: ", after?.availableAmount?.toString() ?? "0");

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
