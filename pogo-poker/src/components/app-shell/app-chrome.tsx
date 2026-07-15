"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Whether the desktop nav is currently collapsed. The table view reads this to
 * hand the freed width to the chat / hand-history panel for players who've
 * collapsed the menu to focus on their table.
 */
const NavCollapsedContext = createContext(false);
export function useNavCollapsed(): boolean {
  return useContext(NavCollapsedContext);
}

/**
 * App shell with a collapsible nav. Desktop: the sidebar is in-flow and the
 * toggle collapses its width (so a table can use the freed space). Mobile: the
 * sidebar is a slide-in drawer over the content (the menu is otherwise hidden).
 */
export function AppChrome({
  wordmark,
  headerRight,
  sidebar,
  children,
}: {
  wordmark: React.ReactNode;
  headerRight: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  // Start collapsed on phones; expanded on desktop.
  useEffect(() => {
    setOpen(window.matchMedia("(min-width: 768px)").matches);
  }, []);

  const closeOnMobile = () => {
    if (window.matchMedia("(max-width: 767px)").matches) setOpen(false);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b-2 border-pogo-gold/70 bg-[#0b1728] shadow-[0_8px_28px_rgba(0,0,0,0.28)]">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Collapse menu" : "Open menu"}
              aria-expanded={open}
              className="h-9 shrink-0 rounded-lg border border-white/15 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-ivory transition-colors hover:border-pogo/60 hover:text-pogo-soft"
            >
              Menu
            </button>
            {wordmark}
          </div>
          {headerRight}
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-3 px-3 py-4 sm:px-5 sm:py-6 lg:gap-5">
        {/* Mobile backdrop */}
        {open && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm md:hidden"
          />
        )}

        <aside
          onClick={closeOnMobile}
          className={cn(
            "shrink-0 transition-all duration-200 ease-out",
            // Mobile: fixed slide-in drawer.
            "fixed inset-y-0 left-0 z-50 w-60 -translate-x-full border-r border-white/8 bg-charcoal-900 px-4 pt-20",
            open && "translate-x-0",
            // Desktop: in-flow, collapsible width, no drawer chrome.
            "md:static md:z-auto md:translate-x-0 md:border-0 md:bg-transparent md:px-0 md:pt-0",
            open ? "md:w-44 md:opacity-100" : "md:w-0 md:overflow-hidden md:opacity-0",
          )}
        >
          <div className="md:sticky md:top-24 md:rounded-2xl md:border md:border-white/10 md:bg-charcoal-800/70 md:p-2 md:shadow-elevated">{sidebar}</div>
        </aside>

        <main className="min-w-0 flex-1">
          <NavCollapsedContext.Provider value={!open}>
            {children}
          </NavCollapsedContext.Provider>
        </main>
      </div>
    </div>
  );
}
