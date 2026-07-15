/**
 * READ-ONLY: list recent incoming SOL transfers to an address (sender + amount +
 * signature), so we can see who deposited to the wrong cashier address and
 * refund them precisely. No keys, no sends — getSignaturesForAddress + parse.
 *
 * Run: npx tsx --env-file=.env scripts/inspect-incoming.ts <address>
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

async function main() {
  const addr = process.argv[2];
  if (!addr) {
    console.error("usage: inspect-incoming.ts <address>");
    process.exit(1);
  }
  const rpc = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const conn = new Connection(rpc, "confirmed");
  const pk = new PublicKey(addr);

  const sigs = await conn.getSignaturesForAddress(pk, { limit: 15 });
  console.log(`\nIncoming SOL transfers to ${addr} (last ${sigs.length} txs):\n`);

  let total = 0n;
  for (const s of sigs) {
    const tx = await conn.getParsedTransaction(s.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    if (!tx?.meta) continue;
    const keys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58());
    const idx = keys.indexOf(addr);
    if (idx < 0) continue;
    const delta = BigInt(tx.meta.postBalances[idx] ?? 0) - BigInt(tx.meta.preBalances[idx] ?? 0);
    if (delta <= 0n) continue;

    let senderIdx = -1;
    let maxOut = 0n;
    for (let j = 0; j < keys.length; j++) {
      if (j === idx) continue;
      const out = BigInt(tx.meta.preBalances[j] ?? 0) - BigInt(tx.meta.postBalances[j] ?? 0);
      if (out > maxOut) {
        maxOut = out;
        senderIdx = j;
      }
    }
    total += delta;
    const sol = (Number(delta) / LAMPORTS_PER_SOL).toFixed(4);
    const when = s.blockTime ? new Date(s.blockTime * 1000).toISOString() : "?";
    console.log(`  +${sol} SOL  from ${senderIdx >= 0 ? keys[senderIdx] : "?"}`);
    console.log(`      tx ${s.signature}  (${when})`);
  }
  console.log(`\n  TOTAL received: ${(Number(total) / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
