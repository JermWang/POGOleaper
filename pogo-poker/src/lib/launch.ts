// Launch-gate config — shared by the server layout and the client gate.
// NO "use client": this module must stay server-safe so the layout can call
// launchInitiallyLocked() during render. NEXT_PUBLIC_* vars are inlined into
// both the server and client bundles, so reading them here works in both.
//
//   NEXT_PUBLIC_LAUNCH_AT     ISO timestamp the gate lifts at. Set to a past
//                             time (or "off") to disable the gate entirely.
//   NEXT_PUBLIC_LAUNCH_BYPASS unlock key for `?unlock=<key>` (persists in
//                             localStorage so testers skip the gate).

const LAUNCH_AT_FALLBACK = "2026-07-16T01:51:00Z"; // ~8h from the deploy that added this
const BYPASS_FALLBACK = "b1b813d5859a";

const launchIso = process.env.NEXT_PUBLIC_LAUNCH_AT || LAUNCH_AT_FALLBACK;

export const BYPASS_KEY = process.env.NEXT_PUBLIC_LAUNCH_BYPASS || BYPASS_FALLBACK;
export const LAUNCH_DISABLED =
  launchIso.toLowerCase() === "off" || Number.isNaN(Date.parse(launchIso));
export const LAUNCH_AT = LAUNCH_DISABLED ? 0 : Date.parse(launchIso);

/** Server-evaluated per request so the first paint is already gated (no
 *  unblurred flash) and post-launch renders nothing (no reverse flash). */
export function launchInitiallyLocked(): boolean {
  return !LAUNCH_DISABLED && Date.now() < LAUNCH_AT;
}
