# Velvet table — gameplay re-skin (drop-in)

This folder ports the prototype look into your real Next.js app. It only changes
the **visual layer** — every socket message, prop, type, and the action clock are
untouched, so betting logic still works.

## What changed

| File | Change |
|------|--------|
| `src/components/poker/poker-table-view.tsx` | Leather **rail + layered felt + crest watermark**; pot shown as a **chip pill**; community cards switched to flat `PlayingCard` (2D table, per the deep-dive); **live bets rendered as chips on the felt** in front of each player. |
| `src/components/poker/seat.tsx` | Tactile pod: velvet **active glow** + depleting timer ring, **dealer button**, name/stack pill, `YOU` avatar, **Fold** tag, ALL-IN. (Bets now drawn by the table, not the seat.) |
| `src/components/poker/action-bar.tsx` | Commercial-grade bar: **bet slider** + presets + Max, restyled Fold / Check-Call / Raise / All-in. Same `onAction` wiring and preset math. |
| `globals-additions.css` | Slider-thumb styling (`.vp-range`). |

## Install (3 steps)

1. Copy these three files over the existing ones in `src/components/poker/`:
   - `poker-table-view.tsx`
   - `seat.tsx`
   - `action-bar.tsx`
2. Append the contents of `globals-additions.css` to `src/app/globals.css`.
3. Run the app — no new dependencies, no token changes.

> Tip: hand this whole folder to **Claude Code** with "apply this port to my repo"
> and it'll copy the files and the CSS for you.

## Not wired (needs server/state, by design)

- **Per-player action verbs** ("Raise", "Check") under each pod. Your `WireSeat`
  carries `committedThisStreet`, `hasFolded`, `isAllIn` — which drive the bet
  chip, Fold tag and ALL-IN — but not a last-action string. If you want the verb
  labels, broadcast a `lastAction` per seat from the server and I'll surface it.
- **3D hole cards at showdown.** The prototype flips your winning hand to `Card3D`.
  Your `Card3D` component is ready; wiring it on `state.lastShowdown` is a small
  follow-up if you want it.

Everything else matches the prototype (`Velvet Table.dc.html`) one-to-one.
