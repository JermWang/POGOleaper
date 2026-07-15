import type { Metadata } from "next";
import { Cormorant_Garamond, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { APP_NAME_FULL } from "@/components/brand";
import { Providers } from "@/components/providers";

// Design system type (from Claude Design): editorial serif display, clean sans
// UI, mono for figures.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME_FULL} — Private real-money poker on Robinhood Chain`,
    template: `%s · ${APP_NAME_FULL}`,
  },
  description:
    "The pond's private poker room — a POGO THE LEAPER utility. Real-money Texas Hold'em on Robinhood Chain: transparent hands, professional custody, instant crypto settlement.",
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/pogo-poker-chip.png", type: "image/png" }],
    shortcut: "/pogo-poker-chip.png",
    apple: "/pogo-poker-chip.png",
  },
  openGraph: {
    title: `${APP_NAME_FULL} — The pond's private poker room`,
    description:
      "Real-money Texas Hold'em on Robinhood Chain from POGO THE LEAPER ($POGO). Leap in, take a seat, ribbit.",
    siteName: APP_NAME_FULL,
    images: [{ url: "/banner.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME_FULL} — The pond's private poker room`,
    description:
      "Real-money Texas Hold'em on Robinhood Chain from POGO THE LEAPER ($POGO).",
    images: ["/banner.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
