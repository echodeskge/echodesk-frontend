"use client";

import { useEffect, useState } from "react";

/** Tailwind `sm` breakpoint: "below sm" is `max-width: 639px`. */
export const BELOW_SM = "(max-width: 639px)";

/**
 * `matchMedia` as state. Without `matchMedia` (SSR, jsdom) it reports false,
 * so the desktop rendering is the default. Plain React hooks only, so it is
 * safe inside header slot content.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener?.("change", update);
    return () => mql.removeEventListener?.("change", update);
  }, [query]);
  return matches;
}
