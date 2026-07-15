import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/require-user";
import { getDepositDestination } from "@/lib/chain/wallets";
import { env } from "@/lib/env";
import { tooMany } from "@/lib/security/rate-limit";

/**
 * Prep for an in-app (at-the-table) deposit: returns the treasury address the
 * client should send to, plus the expected chain id so the wallet can be
 * switched to Robinhood Chain before signing. The client signs the transfer
 * with the connected wallet (Privy), then calls /api/cashier/scan-deposits to
 * credit it. Public address + chain id only — nothing secret.
 */
export async function GET(req: Request) {
  const limited = tooMany(req, "deposit-prep", { capacity: 20, refillPerSec: 1 });
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { address: treasury } = getDepositDestination();
    return NextResponse.json({ treasury, chainId: env.robinhoodChainId });
  } catch {
    return NextResponse.json({ error: "Could not prepare deposit" }, { status: 500 });
  }
}
