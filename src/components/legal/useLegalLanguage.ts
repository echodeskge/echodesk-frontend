"use client";

import { useEffect, useState } from "react";

export type LegalLanguage = "ka" | "en";

/**
 * Language toggle for the public legal pages. Both versions are always in the
 * server-rendered HTML (the inactive one `hidden`); this only picks which one
 * is shown. `?lang=en` / `?lang=ka` deep-links a version (handy for the URL
 * given to Meta's app review).
 */
export function useLegalLanguage(defaultLanguage: LegalLanguage) {
  const [language, setLanguage] = useState<LegalLanguage>(defaultLanguage);

  useEffect(() => {
    try {
      const requested = new URLSearchParams(window.location.search).get("lang");
      if (requested === "en" || requested === "ka") setLanguage(requested);
    } catch {
      // No usable location (tests / unusual embeds) — keep the default.
    }
  }, []);

  return [language, setLanguage] as const;
}
