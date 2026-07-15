/**
 * UNIFY the withdrawal/hot-wallet key onto the funded treasury (2dbUM2Uj) on a
 * given platform. Reads the treasury keypair out of .treasury-secret.txt, re-
 * encodes it as a clean base58 secret key, and pipes it straight into the target
 * platform's CLI as HOT_WALLET_PRIVATE_KEY. The key is held only in memory and
 * written only to the CLI's stdin — NEVER to disk, NEVER printed.
 *
 * Run:
 *   npx tsx --env-file=.env scripts/set-hot-wallet-from-treasury.ts            # railway ws (default)
 *   npx tsx --env-file=.env scripts/set-hot-wallet-from-treasury.ts vercel     # vercel production
 */

import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

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

function keypairFromBytes(bytes: Uint8Array): Keypair | null {
  if (bytes.length === 64) return Keypair.fromSecretKey(bytes);
  if (bytes.length === 32) return Keypair.fromSeed(bytes);
  return null;
}

function extractTokens(raw: string): string[] {
  let s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  const toks = new Set<string>([s]);
  for (const a of s.match(/\[[\d,\s]+\]/g) ?? []) toks.add(a);
  for (const m of s.match(/[1-9A-HJ-NP-Za-km-z]{40,}/g) ?? []) toks.add(m);
  for (const m of s.match(/[A-Za-z0-9+/]{60,}={0,2}/g) ?? []) toks.add(m);
  for (const line of s.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    toks.add(t);
    const eq = t.indexOf("=");
    if (eq > 0) toks.add(t.slice(eq + 1).trim());
    const colon = t.indexOf(":");
    if (colon > 0) toks.add(t.slice(colon + 1).trim());
  }
  return [...toks];
}

const platform = (process.argv[2] || "railway-ws").toLowerCase();
const target = (process.env.TREASURY_WALLET_ADDRESS || "").trim();
if (!target) {
  console.error("TREASURY_WALLET_ADDRESS not set in env");
  process.exit(1);
}

const raw = readFileSync(".treasury-secret.txt", "utf8");
let kp: Keypair | null = null;
for (const t of extractTokens(raw)) {
  for (const bytes of decodeCandidates(t)) {
    const k = keypairFromBytes(bytes);
    if (k && k.publicKey.toBase58() === target) { kp = k; break; }
  }
  if (kp) break;
}
if (!kp) {
  console.error(`Could not find a key for ${target} inside .treasury-secret.txt`);
  process.exit(1);
}

const b58 = bs58.encode(kp.secretKey);
if (Keypair.fromSecretKey(bs58.decode(b58)).publicKey.toBase58() !== target) {
  console.error("internal round-trip check failed — aborting");
  process.exit(1);
}

function run(cmd: string, args: string[], input?: string) {
  return spawnSync(cmd, args, { input, encoding: "utf8", shell: true, timeout: 120000 });
}

console.log(`Unifying HOT_WALLET_PRIVATE_KEY -> ${target} on ${platform} ...`);

let res;
if (platform === "vercel") {
  // Vercel can't overwrite in place; remove then re-add from stdin.
  run("npx", ["--yes", "vercel", "env", "rm", "HOT_WALLET_PRIVATE_KEY", "production", "-y"]);
  res = run("npx", ["--yes", "vercel", "env", "add", "HOT_WALLET_PRIVATE_KEY", "production"], b58);
} else {
  res = run("railway", ["variable", "set", "HOT_WALLET_PRIVATE_KEY", "--stdin", "--service", "ws"], b58);
}

if (res.error) {
  console.error("Failed to launch CLI:", res.error.message);
  process.exit(1);
}
if (res.status !== 0) {
  console.error(`set FAILED (exit ${res.status})`);
  if (res.stderr) console.error(res.stderr.trim());
  process.exit(res.status ?? 1);
}

console.log(`✅ Done. ${platform} HOT_WALLET_PRIVATE_KEY now = the ${target} key.`);
process.exit(0);
