import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CardFan } from "@/components/marketing/card-fan";
import { PayoutTicker } from "@/components/marketing/payout-ticker";

export default function StartScreen() {
  return (
    <div className="poker-landing min-h-screen">
      <PayoutTicker />

      <header className="poker-landing-nav">
        <div className="poker-landing-nav-inner">
          <Link href="/" className="poker-landing-brand" aria-label="Pogo Poker home">
            <Image
              src="/pogo-poker-chip.png"
              alt=""
              width={48}
              height={48}
              className="poker-landing-chip"
              priority
            />
            <span>
              <strong>Pogo Poker</strong>
              <small>Pond cardroom</small>
            </span>
          </Link>

          <nav className="poker-landing-links" aria-label="Poker navigation">
            <Link href="/app/lobby">Lobby</Link>
            <Link href="/app/host">Host</Link>
            <Link href="/legal/rules">Rules</Link>
          </nav>

          <Link href="/app/lobby" className="poker-nav-cta">
            Enter lobby
          </Link>
        </div>
      </header>

      <main className="poker-landing-main">
        <section className="poker-hero-copy">
          <span className="poker-eyebrow">Private Hold&apos;em on Robinhood Chain</span>
          <h1 className="poker-hero-title">Pogo Poker</h1>
          <p>
            Host a private table, join a live game, and settle every hand with a
            cardroom that feels focused from the first deal.
          </p>

          <div className="poker-hero-actions">
            <Link href="/app/lobby">
              <Button size="lg" className="poker-primary-action">
                Enter the lobby
              </Button>
            </Link>
            <Link href="/app/host">
              <Button size="lg" variant="ghost" className="poker-secondary-action">
                Host a private table
              </Button>
            </Link>
          </div>

        </section>

        <section className="poker-hero-visual" aria-label="Pogo Poker royal flush">
          <div className="poker-pond-details" aria-hidden="true">
            <span className="poker-water-ripple poker-water-ripple-one" />
            <span className="poker-water-ripple poker-water-ripple-two" />
            <span className="poker-lily-pad poker-lily-pad-one" />
            <span className="poker-lily-pad poker-lily-pad-two" />
            <span className="poker-pond-reeds poker-pond-reeds-one" />
            <span className="poker-pond-reeds poker-pond-reeds-two" />
          </div>
          <CardFan />
        </section>

        <dl className="poker-proof-grid">
          <div>
            <dt>Verified</dt>
            <dd>Transparent hands</dd>
          </div>
          <div>
            <dt>Private</dt>
            <dd>Invite-only tables</dd>
          </div>
          <div>
            <dt>Fast</dt>
            <dd>On-chain settlement</dd>
          </div>
        </dl>
      </main>

      <footer className="poker-landing-footer">
        <p>18+ where permitted. Real-money play is subject to geographic eligibility.</p>
        <nav aria-label="Legal links">
          <Link href="/legal/responsible-gaming">Responsible play</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <a href="https://x.com/pogotheleaper" target="_blank" rel="noopener noreferrer">X</a>
          <a href="https://discord.gg/JYFwCzmUK5" target="_blank" rel="noopener noreferrer">Discord</a>
        </nav>
      </footer>
    </div>
  );
}
