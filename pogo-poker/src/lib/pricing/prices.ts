/**
 * Live USD prices for the assets we denominate tables in, via CoinGecko's
 * public simple-price API (no key). Used to show table stakes in USD with an
 * ETH reference.
 *
 * Resilient by design: any failure returns nulls and the UI falls back to the
 * native amount, so the lobby never breaks if the feed is down. USDC defaults
 * to $1 when the feed omits it.
 */

import type { Asset } from "@/lib/ledger/money";

const ETH_ID = "ethereum";
const USDC_ID = "usd-coin";

export interface AssetPrices {
  /** USD per 1 ETH. */
  ethUsd: number | null;
  /** USD per 1 USDC. */
  usdcUsd: number;
  /** USD per 1 token; null until the token has a market price feed. */
  tokenUsd: number | null;
}

/** Fetch USD prices for ETH and USDC (the house token has no feed yet). */
export async function getAssetPrices(): Promise<AssetPrices> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ETH_ID},${USDC_ID}&vs_currencies=usd`,
      // Cache across requests so we don't hit the feed on every lobby render.
      { next: { revalidate: 60 } },
    );
    if (!res.ok) throw new Error(`price feed ${res.status}`);
    const json = (await res.json()) as Record<
      string,
      { usd?: number } | undefined
    >;
    const priceOf = (id: string): number | null => {
      const n = json[id]?.usd;
      return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
    };
    return {
      ethUsd: priceOf(ETH_ID),
      usdcUsd: priceOf(USDC_ID) ?? 1,
      // TODO: wire a POGO price source once the token has a market (e.g. a DEX
      // pool on Robinhood Chain or a listed feed).
      tokenUsd: null,
    };
  } catch {
    return { ethUsd: null, usdcUsd: 1, tokenUsd: null };
  }
}

/** USD price for one unit of the given asset (null if unknown). */
export function usdPriceForAsset(asset: Asset, p: AssetPrices): number | null {
  switch (asset) {
    case "ETH":
      return p.ethUsd;
    case "USDC":
      return p.usdcUsd;
    case "TOKEN":
      return p.tokenUsd;
  }
}
