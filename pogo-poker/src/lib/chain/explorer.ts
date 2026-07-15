/**
 * Block-explorer link helpers. We standardize on Blockscout (the Robinhood
 * Chain explorer) for all on-chain transaction links so players can
 * independently confirm every deposit, withdrawal, and outcome anchor.
 *
 * Server-only: reads env.robinhoodExplorerUrl (not a NEXT_PUBLIC value). For
 * client components, build the URL server-side and pass it down.
 */

import { env } from "@/lib/env";

function base(): string {
  return env.robinhoodExplorerUrl.replace(/\/+$/, "");
}

/** Blockscout URL for a transaction hash. */
export function explorerTxUrl(txHash: string): string {
  return `${base()}/tx/${txHash}`;
}

/** Blockscout URL for an account/address. */
export function explorerAddressUrl(address: string): string {
  return `${base()}/address/${address}`;
}
