/**
 * Shared helpers for the FE-06 tests (header bridge, toolbar, screen).
 *
 * - `navigationMock`: a stateful `next/navigation` stand-in. `router.replace`
 *   rewrites the search string and re-renders subscribers, so components using
 *   `useTicketFilters` see their own URL writes.
 * - `messages`: the en/ka catalogs with the FE-06 pending keys merged in.
 */
import React, { useSyncExternalStore } from "react";
import { vi } from "vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
import pending from "@/i18n/pending/fe-06.json";

type Json = Record<string, unknown>;

function deepMerge(base: Json, extra: Json): Json {
  const out: Json = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object"
        ? deepMerge(out[k] as Json, v as Json)
        : v;
  }
  return out;
}

export const messages = {
  en: deepMerge(en as Json, pending.en as Json),
  ka: deepMerge(ka as Json, pending.ka as Json),
};

// ---------------------------------------------------------------------------
// next/navigation
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();
const cache = new Map<string, URLSearchParams>();

export const nav = {
  pathname: "/tickets",
  search: "",
  replace: vi.fn((url: string) => {
    const i = url.indexOf("?");
    nav.search = i >= 0 ? url.slice(i + 1) : "";
    listeners.forEach((l) => l());
  }),
  push: vi.fn(),
};

export function setSearch(search: string) {
  nav.search = search.replace(/^\?/, "");
  listeners.forEach((l) => l());
}

export function lastReplace(): URLSearchParams | null {
  const call = nav.replace.mock.calls.at(-1);
  if (!call) return null;
  const url = String(call[0]);
  return new URLSearchParams(url.includes("?") ? url.slice(url.indexOf("?") + 1) : "");
}

function useSearch() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => nav.search,
  );
}

export const navigationMock = {
  useRouter: () => ({ replace: nav.replace, push: nav.push, prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => nav.pathname,
  useSearchParams: () => {
    const s = useSearch();
    let sp = cache.get(s);
    if (!sp) {
      sp = new URLSearchParams(s);
      cache.set(s, sp);
    }
    return sp;
  },
};

export function resetNav(search = "") {
  nav.pathname = "/tickets";
  nav.search = search;
  nav.replace.mockClear();
  nav.push.mockClear();
}

// ---------------------------------------------------------------------------
// matchMedia
// ---------------------------------------------------------------------------

export function mockMatchMedia(matches: (query: string) => boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: matches(query),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

export function clearMatchMedia() {
  // jsdom has no matchMedia by default.
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export function IntlProvider({ children, locale = "en" }: { children: React.ReactNode; locale?: "en" | "ka" }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Asia/Tbilisi">
      {children}
    </NextIntlClientProvider>
  );
}

export function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
}

export function renderScreen(ui: React.ReactElement, { locale = "en" as "en" | "ka", client = newClient() } = {}) {
  const utils = render(
    <QueryClientProvider client={client}>
      <IntlProvider locale={locale}>{ui}</IntlProvider>
    </QueryClientProvider>,
  );
  return { ...utils, client };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const BOARDS = [
  { id: 1, name: "Support", color: "#3b82f6", position: 0, is_default: true, open_count: 7, columns_count: 3 },
  { id: 2, name: "Sales", color: "#f59e0b", position: 1, is_default: false, open_count: 4, columns_count: 2 },
  { id: 3, name: "Internal", color: "#a855f7", position: 2, is_default: false, open_count: 12, columns_count: 0 },
];

export const STAFF_PROFILE = { id: 1, is_staff: true, is_superuser: false, permissions_list: [], feature_keys: [] };
export const AGENT_PROFILE = { id: 3, is_staff: false, is_superuser: false, permissions_list: [], feature_keys: [] };
