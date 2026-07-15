import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Player initials for elegant avatar circles (no cartoon avatars). */
export function initials(name: string | null | undefined): string {
  if (!name) return "··";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function shortAddress(addr: string | null | undefined): string {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  // 0x addresses keep the prefix + 4 hex chars (0x1234…abcd).
  const head = addr.startsWith("0x") ? 6 : 4;
  return `${addr.slice(0, head)}…${addr.slice(-4)}`;
}
