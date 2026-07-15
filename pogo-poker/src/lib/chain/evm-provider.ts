/**
 * Production Robinhood Chain (EVM) provider backed by viem.
 *
 * Implements deposit detection (native ETH + ERC-20 USDC/TOKEN) and outbound
 * transfers from the hot wallet. This is the real chain integration that
 * replaces the mock when a hot wallet + RPC are configured.
 *
 * SECURITY: this signs with a raw private key read from the environment. That is
 * acceptable for testnet / small floats, but production must move signing behind
 * a KMS/HSM or MPC signer and add velocity limits + allow-listing. See
 * PRODUCTION_TODO.md. Private keys never leave the server.
 */

import {
  createWalletClient,
  erc20Abi,
  getAddress,
  http,
  isAddress,
  stringToHex,
  type Hex,
  type PublicClient,
  type WalletClient,
  type Account,
  type Chain as ViemChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Asset } from "@prisma/client";
import { env } from "@/lib/env";
import { robinhoodChain } from "./robinhood";
import type { IncomingTransfer, SendResult, ChainProvider } from "./provider";

/** Confirmation count we report for txs beyond the finality window. */
const FINALIZED = 1_000_000;
/** Blocks scanned per poll at most (Robinhood Chain blocks are ~100ms, but the
 * chain only produces blocks when there are txs). Hitting the cap logs a
 * backlog warning; the remainder is drained on subsequent polls. */
const MAX_SCAN_BLOCKS = 5_000n;
/** Baseline lookback when there is no cursor yet (first ever scan). */
const BASELINE_LOOKBACK_BLOCKS = 2_000n;
/** Gas limit for a native ETH transfer. */
const NATIVE_TRANSFER_GAS = 21_000n;

const TRANSFER_EVENT = {
  type: "event",
  name: "Transfer",
  inputs: [
    { indexed: true, name: "from", type: "address" },
    { indexed: true, name: "to", type: "address" },
    { indexed: false, name: "value", type: "uint256" },
  ],
} as const;

export class EvmChainProvider implements ChainProvider {
  readonly name = "evm";
  private client: PublicClient;
  private chain: ViemChain;
  /** ERC-20 contracts we watch/transfer, keyed by asset. ETH is native. */
  private erc20s: Partial<Record<Asset, Hex>>;
  /** Reverse lookup: lowercase contract address -> asset, for deposit detection. */
  private assetByContract: Map<string, Asset>;
  private hotWallet: Account | null;
  private walletClient: WalletClient | null;
  /** Serializes hot-wallet sends so concurrent loops never race on the nonce. */
  private sendLock: Promise<unknown> = Promise.resolve();

  constructor(client: PublicClient) {
    this.client = client;
    this.chain = robinhoodChain(env.robinhoodChainId, env.robinhoodRpcUrl);
    this.erc20s = {};
    if (env.usdcTokenAddress && isAddress(env.usdcTokenAddress)) {
      this.erc20s.USDC = getAddress(env.usdcTokenAddress);
    }
    // The house token is optional until its contract address is configured.
    if (env.pogoTokenAddress && isAddress(env.pogoTokenAddress)) {
      this.erc20s.TOKEN = getAddress(env.pogoTokenAddress);
    }
    this.assetByContract = new Map(
      Object.entries(this.erc20s).map(([asset, addr]) => [
        addr.toLowerCase(),
        asset as Asset,
      ]),
    );
    this.hotWallet = loadHotWallet();
    this.walletClient = this.hotWallet
      ? createWalletClient({
          account: this.hotWallet,
          chain: this.chain,
          transport: http(env.robinhoodRpcUrl),
        })
      : null;
  }

  async getOnChainBalance(address: string, asset: Asset): Promise<bigint> {
    const owner = getAddress(address);
    if (asset === "ETH") {
      return this.client.getBalance({ address: owner });
    }
    const token = this.erc20s[asset];
    if (!token) return 0n;
    return this.client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    });
  }

  async getConfirmations(txHash: string): Promise<number> {
    try {
      const receipt = await this.client.getTransactionReceipt({
        hash: txHash as Hex,
      });
      if (receipt.status !== "success") return 0; // reverted — never credit
      const latest = await this.client.getBlockNumber();
      const depth = latest - receipt.blockNumber + 1n;
      if (depth <= 0n) return 0;
      return depth > BigInt(FINALIZED) ? FINALIZED : Number(depth);
    } catch {
      // Unknown / dropped tx.
      return 0;
    }
  }

  async getIncomingTransfers(
    address: string,
    sinceTxHash?: string,
  ): Promise<IncomingTransfer[]> {
    const watched = getAddress(address);
    const watchedLower = watched.toLowerCase();
    const latest = await this.client.getBlockNumber();

    // Resolve the scan window. The cursor tx's own block is re-scanned on
    // purpose (several deposits can share a block); ingestTransfer is
    // idempotent on txHash so re-observing the cursor tx is harmless.
    let fromBlock: bigint;
    if (sinceTxHash) {
      try {
        const receipt = await this.client.getTransactionReceipt({
          hash: sinceTxHash as Hex,
        });
        fromBlock = receipt.blockNumber;
      } catch {
        // Cursor tx not found on this RPC (mock-era hash / pruned node) — fall
        // back to the baseline window rather than scanning from genesis.
        fromBlock =
          latest > BASELINE_LOOKBACK_BLOCKS
            ? latest - BASELINE_LOOKBACK_BLOCKS
            : 0n;
      }
    } else {
      fromBlock =
        latest > BASELINE_LOOKBACK_BLOCKS
          ? latest - BASELINE_LOOKBACK_BLOCKS
          : 0n;
    }

    let toBlock = latest;
    if (toBlock - fromBlock + 1n > MAX_SCAN_BLOCKS) {
      toBlock = fromBlock + MAX_SCAN_BLOCKS - 1n;
      console.warn(
        `[chain] deposit scan for ${address} hit the ${MAX_SCAN_BLOCKS}-block cap — possible backlog, will continue next poll`,
      );
    }

    const transfers: IncomingTransfer[] = [];
    const confirmationsFor = (blockNumber: bigint): number => {
      const depth = latest - blockNumber + 1n;
      if (depth <= 0n) return 0;
      return depth > BigInt(FINALIZED) ? FINALIZED : Number(depth);
    };

    // --- Native ETH: inspect every tx in the window addressed to the watched
    //     account with value > 0. Reverted txs move no value, so each candidate
    //     is confirmed via its receipt before being reported. (Contract-internal
    //     transfers are NOT detected — deposits must be plain ETH sends, which
    //     is what wallets do.)
    for (let bn = fromBlock; bn <= toBlock; bn++) {
      const block = await this.client.getBlock({
        blockNumber: bn,
        includeTransactions: true,
      });
      for (const tx of block.transactions) {
        if (typeof tx === "string") continue;
        if (!tx.to || tx.to.toLowerCase() !== watchedLower) continue;
        if (tx.value <= 0n) continue;
        const receipt = await this.client
          .getTransactionReceipt({ hash: tx.hash })
          .catch(() => null);
        if (!receipt || receipt.status !== "success") continue;
        transfers.push({
          txHash: tx.hash,
          toAddress: watched,
          fromAddress: tx.from,
          asset: "ETH",
          amount: tx.value,
          confirmations: confirmationsFor(bn),
          blockNumber: Number(bn),
        });
      }
    }

    // --- ERC-20 (USDC + house TOKEN): Transfer(from, to=watched, value) logs,
    //     matched to the asset by contract address. Reverted txs emit no logs,
    //     so no receipt check is needed.
    const tokenContracts = Object.values(this.erc20s);
    if (tokenContracts.length > 0) {
      const logs = await this.client.getLogs({
        address: tokenContracts,
        event: TRANSFER_EVENT,
        args: { to: watched },
        fromBlock,
        toBlock,
      });
      for (const log of logs) {
        const asset = this.assetByContract.get(log.address.toLowerCase());
        if (!asset) continue;
        const amount = log.args.value ?? 0n;
        if (amount <= 0n) continue;
        transfers.push({
          txHash: log.transactionHash,
          toAddress: watched,
          fromAddress: log.args.from ?? null,
          asset,
          amount,
          confirmations: confirmationsFor(log.blockNumber),
          blockNumber: Number(log.blockNumber),
        });
      }
    }

    transfers.sort((a, b) => a.blockNumber - b.blockNumber);
    return transfers;
  }

  async sendTransfer(params: {
    asset: Asset;
    toAddress: string;
    amount: bigint;
    idempotencyKey: string;
  }): Promise<SendResult> {
    const { walletClient, hotWallet } = this.requireHotWallet();
    const to = getAddress(params.toAddress);

    return this.withSendLock(async () => {
      if (params.asset === "ETH") {
        // The withdrawer pays their own network fee: deduct the (max) gas cost
        // from the amount sent so the treasury's total on-chain outflow never
        // exceeds the requested amount. No operator gas subsidy is needed for
        // ETH cash-outs (treasury asset down == user liability down; any
        // unspent maxFee headroom stays in the treasury as dust in the user's
        // favor of the house — tracked by the reconcile tolerance).
        const fees = await this.client.estimateFeesPerGas();
        const maxFeePerGas = fees.maxFeePerGas ?? 1_000_000_000n; // 1 gwei floor
        const fee = NATIVE_TRANSFER_GAS * maxFeePerGas;
        const sendWei = params.amount - fee;
        if (sendWei <= 0n) {
          throw new Error(
            `Withdrawal amount (${params.amount} wei) is too small to cover the network fee (${fee} wei)`,
          );
        }
        const hash = await walletClient.sendTransaction({
          account: hotWallet,
          chain: this.chain,
          to,
          value: sendWei,
          gas: NATIVE_TRANSFER_GAS,
          maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas ?? maxFeePerGas,
        });
        await this.waitForSuccess(hash);
        return { txHash: hash };
      }

      // ERC-20 transfer (USDC or the house TOKEN). Gas is paid in ETH by the
      // hot wallet, so the treasury needs a small ETH float for token sends
      // (covered by the reconcile tolerance).
      const token = this.erc20s[params.asset];
      if (!token) {
        throw new Error(
          `No ERC-20 contract configured for asset ${params.asset}`,
        );
      }
      const hash = await walletClient.writeContract({
        account: hotWallet,
        chain: this.chain,
        address: token,
        abi: erc20Abi,
        functionName: "transfer",
        args: [to, params.amount],
      });
      await this.waitForSuccess(hash);
      return { txHash: hash };
    });
  }

  async postAnchor(payload: string): Promise<SendResult> {
    const { walletClient, hotWallet } = this.requireHotWallet();
    return this.withSendLock(async () => {
      // 0-value self-transaction carrying the anchor payload in calldata —
      // permanent, cheap, and independently verifiable on Blockscout.
      const hash = await walletClient.sendTransaction({
        account: hotWallet,
        chain: this.chain,
        to: hotWallet.address,
        value: 0n,
        data: stringToHex(payload),
      });
      await this.waitForSuccess(hash);
      return { txHash: hash };
    });
  }

  private requireHotWallet(): {
    walletClient: WalletClient;
    hotWallet: Account;
  } {
    if (!this.walletClient || !this.hotWallet) {
      throw new Error("Hot wallet is not configured (HOT_WALLET_PRIVATE_KEY)");
    }
    return { walletClient: this.walletClient, hotWallet: this.hotWallet };
  }

  /** Serialize hot-wallet broadcasts (nonce safety across concurrent loops). */
  private withSendLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.sendLock.then(fn, fn);
    this.sendLock = run.catch(() => undefined);
    return run;
  }

  private async waitForSuccess(hash: Hex): Promise<void> {
    const receipt = await this.client.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error(`Transaction ${hash} reverted`);
    }
  }
}

function loadHotWallet(): Account | null {
  const key = env.hotWalletPrivateKey;
  if (!key) return null;
  try {
    // 0x-prefixed 32-byte hex private key (standard EVM export format).
    const hex = key.trim();
    return privateKeyToAccount(
      (hex.startsWith("0x") ? hex : `0x${hex}`) as Hex,
    );
  } catch (err) {
    console.error("[chain] failed to load hot wallet key", err);
    return null;
  }
}
