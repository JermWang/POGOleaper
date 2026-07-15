import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Brand name — Pogo Poker, a POGO THE LEAPER ($POGO) utility. Kept in one place so the product is easy to rename. */
export const APP_NAME = "Pogo";
export const APP_NAME_FULL = "Pogo Poker";

export function Wordmark({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <Image
        src="/pogo-poker-chip.png"
        alt={APP_NAME}
        width={36}
        height={36}
        className="h-8 w-8 drop-shadow-[0_2px_8px_rgba(34,197,94,0.35)]"
        priority
      />
      <span className="font-display text-lg tracking-wide text-ivory">
        {APP_NAME}
        <span className="text-pogo">.</span>
      </span>
    </Link>
  );
}
