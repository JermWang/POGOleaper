# 🐸 POGO THE LEAPER — Pogo's Leap Pad

Spinoff of Paco the Chicken, rebranded top-to-bottom for **POGO THE LEAPER** ($POGO).
A cute green frog with a gold crown; lime/green/gold pond palette from `mock-up.png`.

## What's here

| Piece | Where | What it is |
|---|---|---|
| Landing site | `index.html` + `script.js` / `styles.css` | Tabbed SPA: PFP Generator + Pogo Leap + Pogo Poker link |
| PFP Generator | `assets/` (base / hat / item layers) | Build-your-frog with 11 headgear + 7 loot layers, download/copy |
| Pogo Leap | `game.js`, `game-assets.js`, `game-physics.js`, `game/` sprites | Doodle-jump style game (port of Paco Jump) |
| Local shims | `pogo-shims.js` | Replaces the old Twitter-auth/Supabase leaderboard with a localStorage leaderboard |
| Pogo Poker | `pogo-poker/` | Full Next.js real-money poker room on Robinhood Chain (EVM; rebranded Velvet Poker) |

## Run the site locally

Any static server from this folder, e.g.:

```
npx http-server . -p 8123
```

(There's also `.claude/launch.json` with a `pogo-site` config.)

## Run Pogo Poker

```
cd pogo-poker
copy .env.example .env    # fill in DATABASE_URL, REDIS_URL, Privy keys, Robinhood Chain RPC, token addresses
npm install
npm run dev
```

Pogo Poker settles on **Robinhood Chain** (EVM Arbitrum Orbit L2 — mainnet chain ID 4663,
testnet 46630, ETH gas, Blockscout explorer). Wallet secrets and `.env` were **deliberately
not copied** from the Velvet Poker repo — Pogo Poker should get its own database, EVM hot
wallet, and Privy app before going live. See `pogo-poker/DEPLOY.md` for production deployment.

The site's nav links to `/pogo-poker/` — in production, deploy the poker app and point
that link (in `index.html`, both desktop nav and mobile menu) at its real URL.

## TODOs before launch

- Real `$POGO` contract address: `copyContract()` in `script.js` + Pond Info card in `index.html`
- Social links: `openDiscord()` / `openTelegram()` / `openDexScreener()` in `script.js` are "coming soon" placeholders; Twitter points at `x.com/PogoTheLeaper`
- Pogo Poker's landing X link is also set to `x.com/pogotheleaper` — confirm handle
- Domain in meta tags is `PogoTheLeaper.com` — update if different

## Asset sources

- `assets for generator/` — original layered art drops (base / top / bottom)
- `assets/` — the same art arranged for the generator (`base/POGO.png`, `hat/*`, `item/*`)
- `game/` sprites, `bg 2048.png`, `POGO-BANNER.png` — generated from the base art + mock-up palette
