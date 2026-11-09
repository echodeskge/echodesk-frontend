/**
 * Shared helpers for the FE-13 timer tests.
 *
 * - `messages`: the en/ka catalogs with the FE-09 and FE-13 pending files
 *   merged in (FE-INT merges them into the catalogs later).
 * - `snapshot` / `entry`: timer payloads (A14) in the server's shape.
 * - `renderTimer`: QueryClient + intl provider; returns the client.
 */
import React from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
// fe-09 keys are merged into en/ka (W3 FE-INT); kept as an empty overlay.
const fe09 = { en: {}, ka: {} };
// fe-13 keys are merged into en/ka (W3 FE-INT); kept as an empty overlay.
const fe13 = { en: {}, ka: {} };
import type { TimeEntry, TimerState, TimeSummary } from "@/app/(tenant)/tickets/_lib/types";

type Json = Record<string, unknown>;

function deepMerge(base: Json, extra: Json): Json {
  const out: Json = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    const cur = out[k];
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && cur && typeof cur === "object"
        ? deepMerge(cur as Json, v as Json)
        : v;
  }
  return out;
}

export const messages = {
  en: deepMerge(deepMerge(en as Json, (fe09 as { en: Json }).en), (fe13 as { en: Json }).en),
  ka: deepMerge(deepMerge(ka as Json, (fe09 as { ka: Json }).ka), (fe13 as { ka: Json }).ka),
};

export const ME = { id: 4, name: "Giorgi G.", initials: "GG" };
export const NINO = { id: 7, name: "Nino Beridze", initials: "NB" };

/** The server clock in every test; client clocks are set elsewhere on purpose. */
export const SERVER_NOW = "2026-11-09T10:00:00Z";

export function entry(over: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 1,
    ticket_id: 10,
    user: ME,
    started_at: "2026-11-09T08:00:00Z",
    ended_at: "2026-11-09T09:00:00Z",
    duration_seconds: 3600,
    is_running: false,
    ...over,
  };
}

export function snapshot(over: Partial<TimerState> = {}): TimerState {
  return {
    running: null,
    my_total_seconds: 0,
    total_seconds: 0,
    server_now: SERVER_NOW,
    by_user: [],
    entries: [],
    ...over,
  };
}

export function summary(over: Partial<TimeSummary> = {}): TimeSummary {
  return { ticket_id: 10, total_seconds: 0, active: null, by_column: [], logs: [], ...over };
}

export function httpError(status: number, data: unknown = {}) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });
}

export function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
}

export function renderTimer(ui: React.ReactElement, opts: { locale?: "en" | "ka"; client?: QueryClient } = {}) {
  const client = opts.client ?? newClient();
  const locale = opts.locale ?? "en";
  const utils = render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Asia/Tbilisi">
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return { ...utils, client };
}

export type Handler = (url: string, body?: unknown) => unknown;

/** Route the mocked axios instance by method + URL prefix (longest wins). */
export function routeAxios(
  axios: { get: unknown; post: unknown },
  routes: { get?: Record<string, Handler>; post?: Record<string, Handler> },
) {
  for (const method of ["get", "post"] as const) {
    const table = routes[method] ?? {};
    (axios[method] as { mockImplementation: (f: unknown) => void }).mockImplementation(
      async (url: string, body?: unknown) => {
        const key = Object.keys(table)
          .sort((x, y) => y.length - x.length)
          .find((k) => url === k || url.startsWith(k));
        if (!key) throw httpError(404);
        return { data: await table[key](url, body) };
      },
    );
  }
}
