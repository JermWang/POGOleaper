/**
 * NFT read helpers backed by the Blockscout API v2 (the Robinhood Chain
 * explorer) — read the ERC-721s a wallet holds so a player can pick one as
 * their profile picture.
 *
 * Resilient by design: any API failure surfaces as an empty list / null to the
 * callers, so the avatar-NFT UI degrades gracefully instead of crashing when
 * the explorer is down or the endpoint shape changes.
 *
 * An NFT is identified app-wide as `"<contractAddress>:<tokenId>"`.
 */

import { env } from "@/lib/env";

export interface NftAsset {
  /** `"<contractAddress>:<tokenId>"` */
  id: string;
  name: string;
  image: string;
}

interface RawInstance {
  id?: string | number;
  image_url?: string | null;
  animation_url?: string | null;
  token?: { address?: string; address_hash?: string; name?: string | null };
  metadata?: { name?: string; image?: string } | null;
  owner?: { hash?: string } | null;
}

/**
 * Resolve a renderable HTTP(S) image URL for an instance. Returns null when no
 * web-renderable image is available — and never returns data:/javascript:/other
 * schemes, so it's safe to drop straight into an <img src>.
 */
function pickImage(a: RawInstance): string | null {
  const candidates: Array<string | null | undefined> = [
    a.image_url,
    a.metadata?.image,
  ];
  for (const u of candidates) {
    if (typeof u !== "string" || u.length === 0) continue;
    if (u.startsWith("https://") || u.startsWith("http://")) return u;
    if (u.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${u.slice(7)}`;
  }
  return null;
}

function contractOf(a: RawInstance): string | null {
  const addr = a.token?.address_hash ?? a.token?.address;
  return typeof addr === "string" && addr.length > 0 ? addr : null;
}

async function blockscout<T>(path: string): Promise<T> {
  const base = env.robinhoodExplorerUrl.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/v2${path}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`blockscout ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

/**
 * ERC-721s owned by `owner` that have a usable image. Empty list on ANY error
 * (explorer down, unsupported endpoint, etc.) — never throws to the UI path.
 */
export async function getOwnedNfts(
  owner: string,
  limit = 60,
): Promise<NftAsset[]> {
  try {
    const result = await blockscout<{ items?: RawInstance[] }>(
      `/addresses/${owner}/nft?type=ERC-721`,
    );
    const out: NftAsset[] = [];
    for (const a of result.items ?? []) {
      const image = pickImage(a);
      const contract = contractOf(a);
      if (!image || !contract || a.id === undefined || a.id === null) continue;
      out.push({
        id: `${contract}:${a.id}`,
        name: a.metadata?.name ?? a.token?.name ?? "NFT",
        image,
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Confirm one of `owners` currently holds the NFT `assetId`
 * (`"<contract>:<tokenId>"`), returning its image URL. Ownership is re-checked
 * against the chain indexer so a client can't set a picture from an NFT it
 * doesn't actually hold. Returns null if not owned or it has no image.
 */
export async function getAssetImageIfOwned(
  assetId: string,
  owners: string[],
): Promise<string | null> {
  const sep = assetId.indexOf(":");
  if (sep <= 0) return null;
  const contract = assetId.slice(0, sep);
  const tokenId = assetId.slice(sep + 1);
  if (!contract || !tokenId) return null;

  const a = await blockscout<RawInstance>(
    `/tokens/${contract}/instances/${tokenId}`,
  );
  const owner = a.owner?.hash;
  if (
    !owner ||
    !owners.some((o) => o.toLowerCase() === owner.toLowerCase())
  ) {
    return null;
  }
  return pickImage(a);
}
