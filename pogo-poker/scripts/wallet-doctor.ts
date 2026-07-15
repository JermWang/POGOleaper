/**
 * Wallet doctor — READ-ONLY. Figures out which key controls which wallet, so we
 * can unify the deposit destination (TREASURY_WALLET_ADDRESS) and the withdrawal
 * signer (HOT_WALLET_PRIVATE_KEY) onto one funded, controlled wallet.
 *
 * It prints ONLY public addresses + on-chain SOL balances. It NEVER prints any
 * private key. It only reads (getBalance); it never sends anything.
 *
 * Run:  npx tsx --env-file=.env scripts/wallet-doctor.ts
 */

import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import { readFileSync, existsSync } from "node:fs";

function decodeCandidates(s: string): Uint8Array[] {
  const out: Uint8Array[] = [];
  if (s.startsWith("[")) {
    try { out.push(Uint8Array.from(JSON.parse(s))); } catch {}
  }
  try { out.push(bs58.decode(s)); } catch {}
  try { out.push(Uint8Array.from(Buffer.from(s, "base64"))); } catch {}
  if (/^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0) {
    try { out.push(Uint8Array.from(Buffer.from(s, "hex"))); } catch {}
  }
  return out;
}

function keypairFromBytes(bytes: Uint8Array) {
  if (bytes.length === 64) return Keypair.fromSecretKey(bytes);
  if (bytes.length === 32) return Keypair.fromSeed(bytes);
  return null;
}

/** Pull every plausible key-shaped token out of arbitrary file text. */
function extractTokens(raw: string): string[] {
  let s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  const toks = new Set<string>();
  toks.add(s);
  const arr = s.match(/\[[\d,\s]+\]/g);
  if (arr) for (const a of arr) toks.add(a);
  for (const m of s.match(/[1-9A-HJ-NP-Za-km-z]{40,}/g) ?? []) toks.add(m);
  for (const m of s.match(/[A-Za-z0-9+/]{60,}={0,2}/g) ?? []) toks.add(m);
  for (const line of s.split(/\r?\n/)) {
    const t = line.trim();
    if (t) {
      toks.add(t);
      const eq = t.indexOf("=");
      if (eq > 0) toks.add(t.slice(eq + 1).trim());
      const colon = t.indexOf(":");
      if (colon > 0) toks.add(t.slice(colon + 1).trim());
    }
  }
  return [...toks];
}

/** All distinct on-chain addresses derivable as a keypair from a file's text. */
function addrsFromSecretText(raw: string): string[] {
  const addrs = new Set<string>();
  for (const t of extractTokens(raw)) {
    for (const bytes of decodeCandidates(t)) {
      const kp = keypairFromBytes(bytes);
      if (kp) addrs.add(kp.publicKey.toBase58());
    }
  }
  return [...addrs];
}

function readFileMaybe(path: string): string | null {
  try {
    return existsSync(path) ? readFileSync(path, "utf8").trim() : null;
  } catch {
    return null;
  }
}

async function balOf(conn: Connection, addr: string): Promise<string> {
  try {
    const lamports = await conn.getBalance(new PublicKey(addr));
    return (lamports / LAMPORTS_PER_SOL).toFixed(4) + " SOL";
  } catch (e) {
    return "ERR " + (e as Error).message;
  }
}

async function main() {
  const rpc = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const conn = new Connection(rpc, "confirmed");
  const treasuryAddr = (process.env.TREASURY_WALLET_ADDRESS || "").trim();

  console.log("\n=== Pogo Poker wallet doctor (read-only; prints NO private keys) ===\n");
  console.log("RPC:", rpc);
  console.log("\nConfigured deposit destination — TREASURY_WALLET_ADDRESS:");
  if (treasuryAddr) {
    console.log(`   ${treasuryAddr}   [${await balOf(conn, treasuryAddr)}]`);
  } else {
    console.log("   (not set)");
  }

  const sources: { label: string; addrs: string[] }[] = [];

  const envHot = (process.env.HOT_WALLET_PRIVATE_KEY || "").trim();
  sources.push({ label: "env HOT_WALLET_PRIVATE_KEY (local .env)", addrs: envHot ? addrsFromSecretText(envHot) : [] });

  for (const f of [".hot-wallet-secret.txt", ".treasury-secret.txt"]) {
    const raw = readFileMaybe(f);
    sources.push({ label: f, addrs: raw == null ? [] : addrsFromSecretText(raw) });
  }

  console.log("\nKeys we hold → every derivable address [on-chain balance]:");
  let winner: { label: string; addr: string } | null = null;
  for (const src of sources) {
    if (src.addrs.length === 0) {
      console.log(`   • ${src.label}: (no usable key found)`);
      continue;
    }
    console.log(`   • ${src.label}:`);
    for (const a of src.addrs) {
      const b = await balOf(conn, a);
      const isTreasury = treasuryAddr && a === treasuryAddr;
      if (isTreasury && !winner) winner = { label: src.label, addr: a };
      console.log(`        ${a}   [${b}]${isTreasury ? "   ✅ CONTROLS THE TREASURY" : ""}`);
    }
  }

  console.log("\n--- Conclusion ---");
  if (winner) {
    console.log(`The key in "${winner.label}" controls the funded treasury ${winner.addr}.`);
    console.log("Set HOT_WALLET_PRIVATE_KEY (Railway ws + local .env) to that key, then withdrawals work.");
  } else {
    console.log("NONE of the keys we hold control the funded treasury 2dbUM2Uj.");
    console.log("Its key is not on this machine — recover it, or repoint the treasury to a wallet we do control.");
  }
  console.log();

  await Promise.resolve();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
