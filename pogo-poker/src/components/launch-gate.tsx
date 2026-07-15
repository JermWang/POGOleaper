"use client";

import { useEffect, useState } from "react";
import { BYPASS_KEY, LAUNCH_AT, LAUNCH_DISABLED } from "@/lib/launch";

/**
 * Soft pre-launch gate for Pogo Poker. Shows a blurred backdrop + live
 * countdown and blocks interaction until the launch time passes, so the
 * room can be tested privately before release. Config lives in @/lib/launch.
 */
const disabled = LAUNCH_DISABLED;

const pad = (n: number) => String(n).padStart(2, "0");

export function LaunchGate({ initialLocked }: { initialLocked: boolean }) {
  const [open, setOpen] = useState(!initialLocked);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (disabled) {
      setOpen(true);
      return;
    }
    // Dev/tester bypass: ?unlock=<key> or a prior unlock in this browser.
    try {
      const unlock = new URLSearchParams(window.location.search).get("unlock");
      if (unlock && unlock === BYPASS_KEY) {
        localStorage.setItem("pogo_launch_ok", "1");
      }
      if (localStorage.getItem("pogo_launch_ok") === "1") {
        setOpen(true);
        return;
      }
    } catch {
      /* localStorage/URL unavailable — fall through to the timed gate */
    }

    const tick = () => {
      const r = LAUNCH_AT - Date.now();
      setRemaining(r);
      if (r <= 0) setOpen(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Lock body scroll while the gate is up.
  useEffect(() => {
    if (open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (open) return null;

  const hasDigits = remaining !== null && remaining > 0;
  const secs = hasDigits ? Math.floor(remaining! / 1000) : 0;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const clock = hasDigits ? `${pad(h)}:${pad(m)}:${pad(s)}` : "··:··:··";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pogo Poker opens soon"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background:
          "radial-gradient(120% 120% at 50% 30%, rgba(9,20,12,0.62), rgba(6,14,10,0.82))",
        backdropFilter: "blur(9px) saturate(118%)",
        WebkitBackdropFilter: "blur(9px) saturate(118%)",
      }}
    >
      <div
        style={{
          width: "min(440px, 100%)",
          textAlign: "center",
          color: "#f4f2e7",
          background: "linear-gradient(180deg, rgba(18,30,22,0.96), rgba(12,22,16,0.96))",
          border: "3px solid #12210d",
          borderRadius: 22,
          boxShadow: "0 10px 0 rgba(8,16,10,0.85), 0 30px 70px rgba(4,12,8,0.55)",
          padding: "34px 28px 30px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pogo-poker-chip.png"
          alt=""
          width={72}
          height={72}
          style={{ width: 72, height: 72, filter: "drop-shadow(0 4px 10px rgba(34,197,94,0.35))" }}
        />
        <div
          style={{
            marginTop: 14,
            fontSize: "0.72rem",
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#dbfd52",
          }}
        >
          Opens Soon
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: "var(--font-poster), 'Bungee', system-ui, sans-serif",
            fontSize: "clamp(2rem, 8vw, 2.7rem)",
            lineHeight: 1,
            textTransform: "uppercase",
            color: "#fbbf24",
            WebkitTextStroke: "3px #12210d",
            paintOrder: "stroke fill",
            filter: "drop-shadow(4px 5px 0 rgba(8,16,10,0.5))",
          }}
        >
          Pogo Poker
        </div>

        <div
          style={{
            margin: "22px auto 6px",
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "clamp(2.2rem, 11vw, 3.2rem)",
            fontWeight: 700,
            letterSpacing: "0.04em",
            fontVariantNumeric: "tabular-nums",
            color: "#f4f2e7",
          }}
          aria-live="off"
        >
          {clock}
        </div>
        <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8fb79a" }}>
          Hours &nbsp; Minutes &nbsp; Seconds
        </div>

        <p style={{ margin: "20px 0 0", fontSize: "0.95rem", lineHeight: 1.5, color: "#c7d6cb" }}>
          The felt&rsquo;s getting dealt in. We&rsquo;re running final checks on the
          pond&rsquo;s private cardroom &mdash; pull up a lily pad at launch.
        </p>
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#7fae8b",
          }}
        >
          $POGO &bull; Robinhood Chain
        </div>
      </div>
    </div>
  );
}
