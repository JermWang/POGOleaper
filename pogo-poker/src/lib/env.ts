/**
 * Centralized, validated environment access. Server-only values must never be
 * imported into client components. Anything prefixed NEXT_PUBLIC_ is safe.
 */

function optional(key: string): string | undefined {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

function required(key: string): string {
  const v = optional(key);
  if (v === undefined) {
    // Defer hard failure to first use so the app can build without a full env
    // (e.g. during static generation / CI typecheck).
    return "";
  }
  return v;
}

export const env = {
  // Public
  privyAppId: optional("NEXT_PUBLIC_PRIVY_APP_ID") ?? "",
  wsUrl: optional("NEXT_PUBLIC_WS_URL") ?? "ws://localhost:3001",
  // LiveKit (table voice/video). URL is public (wss://…); key+secret are
  // server-only (used to mint join tokens). Empty = voice/video disabled.
  livekitUrl: optional("NEXT_PUBLIC_LIVEKIT_URL") ?? "",
  livekitApiKey: optional("LIVEKIT_API_KEY") ?? "",
  livekitApiSecret: optional("LIVEKIT_API_SECRET") ?? "",
  // Robinhood Chain (EVM, Arbitrum Orbit L2). 4663 = mainnet, 46630 = testnet.
  robinhoodChainId: Number(optional("ROBINHOOD_CHAIN_ID") ?? "4663"),

  // Server-only
  databaseUrl: required("DATABASE_URL"),
  redisUrl: optional("REDIS_URL") ?? "redis://localhost:6379",
  privyAppSecret: optional("PRIVY_APP_SECRET") ?? "",
  robinhoodRpcUrl:
    optional("ROBINHOOD_RPC_URL") ?? "https://rpc.mainnet.chain.robinhood.com",
  // Blockscout explorer base URL for tx/address links.
  robinhoodExplorerUrl:
    optional("ROBINHOOD_EXPLORER_URL") ??
    "https://robinhoodchain.blockscout.com",
  hotWalletPrivateKey: optional("HOT_WALLET_PRIVATE_KEY") ?? "",
  treasuryWalletAddress: optional("TREASURY_WALLET_ADDRESS") ?? "",
  // ERC-20 contract address for USDC on Robinhood Chain (0x…). Empty = USDC
  // deposits/withdrawals are effectively disabled until it's set.
  usdcTokenAddress: optional("USDC_TOKEN_ADDRESS") ?? "",
  // The house ERC-20 token (POGO). The ADDRESS is server-only; decimals and
  // symbol are NEXT_PUBLIC_ so the client can format/display token amounts.
  // Empty address = token not configured yet (public/token tables are disabled
  // until it's set). Public (non-demo) tables may only use this token.
  pogoTokenAddress: optional("POGO_TOKEN_ADDRESS") ?? "",
  tokenDecimals: Number(optional("NEXT_PUBLIC_TOKEN_DECIMALS") ?? "18"),
  tokenSymbol: optional("NEXT_PUBLIC_TOKEN_SYMBOL") ?? "TOKEN",
  adminEmails: (optional("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  // EVM addresses are case-insensitive — store and compare lowercase.
  adminWallets: (optional("ADMIN_WALLETS") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  enableDevComplianceApproval:
    optional("ENABLE_DEV_COMPLIANCE_APPROVAL") === "true",
  minWithdrawalReviewWei: BigInt(
    optional("MIN_WITHDRAWAL_REVIEW_WEI") ?? "100000000000000000", // 0.1 ETH
  ),
  // Per-user withdrawal velocity. Exceeding the rolling-24h count OR the
  // per-asset amount cap forces the request into manual review (it never
  // hard-blocks the user). Tune for your float; defaults are conservative.
  withdrawalDailyMaxCount: Number(optional("WITHDRAWAL_DAILY_MAX_COUNT") ?? "20"),
  withdrawalDailyMaxWei: BigInt(
    optional("WITHDRAWAL_DAILY_MAX_WEI") ?? "1000000000000000000", // 1 ETH
  ),
  withdrawalDailyMaxUsdc: BigInt(
    optional("WITHDRAWAL_DAILY_MAX_USDC") ?? "5000000000", // 5000 USDC (6dp)
  ),
  // Custom token withdrawal gating (base units). Defaults are deliberately
  // permissive on amount (token value is unknown); the per-day count still
  // applies. Tune once the token's market value is known.
  minWithdrawalReviewToken: BigInt(
    optional("MIN_WITHDRAWAL_REVIEW_TOKEN") ?? "0", // 0 = never force review on amount alone
  ),
  withdrawalDailyMaxToken: BigInt(
    optional("WITHDRAWAL_DAILY_MAX_TOKEN") ?? "0", // 0 = no per-asset amount cap
  ),
  // Optional outbound webhook for HIGH/CRITICAL risk alerts (Slack/Discord/
  // generic JSON). Unset = alerts are recorded to the DB only.
  alertWebhookUrl: optional("ALERT_WEBHOOK_URL"),
  depositConfirmations: Number(optional("DEPOSIT_CONFIRMATIONS") ?? "32"),
  // Tolerance for the on-chain treasury reconciliation. A SHORTFALL beyond this
  // (chain balance < ledger liabilities) fires a CRITICAL alert. ETH needs a
  // buffer because gas for ERC-20 sends + anchor txs drains wei that the ledger
  // doesn't track; ERC-20 (USDC/TOKEN) has no such drift so its tolerance is ~0.
  reconcileToleranceWei: BigInt(
    optional("RECONCILE_TOLERANCE_WEI") ?? "10000000000000000", // 0.01 ETH
  ),
  reconcileToleranceErc20: BigInt(
    optional("RECONCILE_TOLERANCE_ERC20") ?? "0",
  ),
  // Cap on concurrent private tables (server-overload guard). Hosting is blocked
  // with a "wait" message once this many private games are live.
  maxPrivateTables: Number(optional("MAX_PRIVATE_TABLES") ?? "50"),
  wsPort: Number(optional("WS_PORT") ?? "3001"),
  isProduction: process.env.NODE_ENV === "production",

  // Outcome anchoring. Hands are batched into a Merkle root and posted on-chain
  // in the calldata of one 0-value hot-wallet self-transaction. Anchor when a
  // batch reaches minBatch, OR when the oldest
  // unanchored hand exceeds maxAge (so low-traffic tables still anchor in
  // bounded time). Set ANCHOR_ENABLED=false to disable.
  anchorEnabled: optional("ANCHOR_ENABLED") !== "false",
  anchorMinBatch: Number(optional("ANCHOR_MIN_BATCH") ?? "10"),
  anchorMaxBatch: Number(optional("ANCHOR_MAX_BATCH") ?? "200"),
  anchorMaxAgeMs: Number(optional("ANCHOR_MAX_AGE_MS") ?? "600000"),
  anchorIntervalMs: Number(optional("ANCHOR_INTERVAL_MS") ?? "60000"),
};

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return env.adminEmails.includes(email.toLowerCase());
}

export function isAdminWallet(address: string | null | undefined): boolean {
  if (!address) return false;
  return env.adminWallets.includes(address.toLowerCase());
}

/** True once the house ERC-20 token address is configured (token play enabled). */
export function isTokenConfigured(): boolean {
  return env.pogoTokenAddress.length > 0;
}

/** True once LiveKit is configured (table voice/video enabled). */
export function isLiveKitConfigured(): boolean {
  return (
    env.livekitUrl.length > 0 &&
    env.livekitApiKey.length > 0 &&
    env.livekitApiSecret.length > 0
  );
}
