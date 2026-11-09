/**
 * Shared helpers for the FE-09 detail tests.
 *
 * - `messages`: the en/ka catalogs with `src/i18n/pending/fe-09.json` merged
 *   in (FE-INT merges it into the catalogs later).
 * - `nav` / `navigationMock`: `next/navigation` with a settable search string
 *   and spies for push / replace; `useParams` returns `nav.params`.
 * - `rt` / `realtimeMock`: a controllable tickets realtime context; the last
 *   `useBoardEvents` handler is kept in `rt.handler`.
 * - `api`: routes the mocked axios instance by method + URL.
 * - `HeaderOutlet`: the tenant header stand-in. It renders the slots OUTSIDE
 *   the intl provider, as the real header renders outside the route layout.
 */
import React, { useSyncExternalStore } from "react";
import { vi } from "vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
// fe-09 keys are merged into en/ka (W3 FE-INT); kept as an empty overlay.
const pending = { en: {}, ka: {} };
import { HeaderActionsProvider, useHeaderSlot } from "@/contexts/HeaderActionsContext";
import type { TicketDetail } from "@/app/(tenant)/tickets/_lib/types";

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
  en: deepMerge(en as Json, (pending as { en: Json }).en),
  ka: deepMerge(ka as Json, (pending as { ka: Json }).ka),
};

// ---------------------------------------------------------------------------
// next/navigation
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();
const spCache = new Map<string, URLSearchParams>();

export const nav = {
  pathname: "/tickets/10",
  search: "",
  params: { id: "10" } as Record<string, string>,
  push: vi.fn(),
  replace: vi.fn(),
};

export function setSearch(search: string) {
  nav.search = search.replace(/^\?/, "");
  listeners.forEach((l) => l());
}

export function resetNav(search = "", id = "10") {
  nav.pathname = `/tickets/${id}`;
  nav.search = search.replace(/^\?/, "");
  nav.params = { id };
  nav.push.mockClear();
  nav.replace.mockClear();
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
  useRouter: () => ({ push: nav.push, replace: nav.replace, prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => nav.pathname,
  useParams: () => nav.params,
  useSearchParams: () => {
    const s = useSearch();
    let sp = spCache.get(s);
    if (!sp) {
      sp = new URLSearchParams(s);
      spCache.set(s, sp);
    }
    return sp;
  },
};

// ---------------------------------------------------------------------------
// Realtime context
// ---------------------------------------------------------------------------

type Handler = (e: unknown) => void;

export const rt = {
  wsReady: true,
  boardId: null as number | null,
  setBoardId: vi.fn(),
  beingEdited: new Map<number, { userId: number; userName: string }>(),
  activeUsers: [] as unknown[],
  handler: null as Handler | null,
};

export function resetRealtime() {
  rt.wsReady = true;
  rt.boardId = null;
  rt.setBoardId.mockClear();
  rt.beingEdited = new Map();
  rt.activeUsers = [];
  rt.handler = null;
}

export const realtimeMock = {
  useTicketsRealtime: () => ({
    wsReady: rt.wsReady,
    boardId: rt.boardId,
    setBoardId: rt.setBoardId,
    beingEdited: rt.beingEdited,
    beingMoved: new Map(),
    activeUsers: rt.activeUsers,
    accessDenied: false,
    subscribe: () => () => {},
    sendTicketMoving: () => {},
    sendTicketEditing: () => {},
    sendTicketEditingStopped: () => {},
  }),
  useBoardEvents: (handler: Handler) => {
    rt.handler = handler;
  },
};

// ---------------------------------------------------------------------------
// axios routing
// ---------------------------------------------------------------------------

export type Route = (url: string, bodyOrConfig?: unknown, config?: unknown) => unknown;

export function httpError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status, data: {} } });
}

export function page<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results };
}

/**
 * Install method handlers on the mocked axios instance. A handler returns the
 * response `data`, or throws (use `httpError`). Unmatched GETs reject 404.
 */
export function routeAxios(
  axios: { get: unknown; post: unknown; patch: unknown; delete: unknown },
  routes: { get?: Record<string, Route>; patch?: Record<string, Route>; post?: Record<string, Route>; delete?: Record<string, Route> },
) {
  const install = (method: "get" | "post" | "patch" | "delete") => {
    const table = routes[method] ?? {};
    (axios[method] as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, a?: unknown, b?: unknown) => {
      const key = Object.keys(table)
        .sort((x, y) => y.length - x.length)
        .find((k) => url === k || url.startsWith(k));
      if (!key) throw httpError(404);
      return { data: await table[key](url, a, b) };
    });
  };
  install("get");
  install("post");
  install("patch");
  install("delete");
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
}

export function IntlProvider({ children, locale = "en" }: { children: React.ReactNode; locale?: "en" | "ka" }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Asia/Tbilisi">
      {children}
    </NextIntlClientProvider>
  );
}

export function HeaderOutlet() {
  const slot = useHeaderSlot();
  return (
    <header>
      <div data-testid="slot-breadcrumb">{slot?.breadcrumb}</div>
      <div data-testid="slot-meta">{slot?.meta}</div>
      <div data-testid="slot-primary">{slot?.primary}</div>
      <div data-testid="slot-icons">{slot?.icons}</div>
    </header>
  );
}

export function renderDetail(
  ui: React.ReactElement,
  { locale = "en" as "en" | "ka", client = newClient() }: { locale?: "en" | "ka"; client?: QueryClient } = {},
) {
  const utils = render(
    <QueryClientProvider client={client}>
      <HeaderActionsProvider>
        <HeaderOutlet />
        <IntlProvider locale={locale}>{ui}</IntlProvider>
      </HeaderActionsProvider>
    </QueryClientProvider>,
  );
  return { ...utils, client };
}

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
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const PERMS_ALL = {
  can_edit: true,
  can_delete: true,
  can_move_to_closed: true,
  can_assign: true,
  can_change_groups: true,
  can_transfer: true,
  can_manage_payments: true,
  can_view_customer: true,
};

export const PERMS_AGENT = {
  ...PERMS_ALL,
  can_delete: false,
  can_move_to_closed: false,
  can_assign: false,
  can_change_groups: false,
  can_transfer: false,
  can_manage_payments: false,
};

export const COLUMNS = [
  { id: 11, name: "To do", color: "#6b7280", position: 0, is_closed_status: false, board: 1 },
  { id: 12, name: "In progress", color: "#f59e0b", position: 1, is_closed_status: false, board: 1 },
  { id: 13, name: "Done", color: "#22c55e", position: 2, is_closed_status: true, board: 1 },
];

export const BOARDS = [
  { id: 1, name: "Support", color: "#3b82f6", position: 0, is_default: true, open_count: 7, columns_count: 3 },
  { id: 2, name: "Sales", color: "#f59e0b", position: 1, is_default: false, open_count: 4, columns_count: 2 },
  { id: 3, name: "Internal", color: "#a855f7", position: 2, is_default: false, open_count: 1, columns_count: 0 },
];

export function makeTicket(over: Partial<TicketDetail> = {}): TicketDetail {
  return {
    id: 10,
    title: "Calls dropping after 30 seconds",
    description: "",
    status: "In progress",
    priority: "high",
    is_closed: false,
    column: { ...COLUMNS[1] } as unknown as TicketDetail["column"],
    created_at: "2026-11-05T10:00:00Z",
    updated_at: "2026-11-08T10:00:00Z",
    created_by: null,
    assigned_to: null,
    assigned_users: [],
    assignments: [],
    assigned_groups: [],
    assigned_department: null,
    tags: [],
    comments: [],
    comments_count: 0,
    checklist_items: [],
    checklist_items_count: 0,
    completed_checklist_items_count: 0,
    payments: [],
    remaining_balance: "0",
    payment_status: "unpaid",
    is_overdue: false,
    form_submissions: [],
    attachments: [],
    due_date: null,
    is_overdue_task: false,
    customer: null,
    board: { id: 1, name: "Support", color: "#3b82f6" },
    reporter: null,
    viewer_permissions: PERMS_ALL,
    ...over,
  };
}

/**
 * Section stand-ins for the shell tests (W3 FE-INT). The real FE-10..FE-13
 * sections now replace FE-09's stubs and fetch their own data; the shell
 * tests only check placement, so they mock the sections back to markers.
 */
export const sectionMocks = {
  main: { DetailMain: ({ ticket }: { ticket: { title: string } }) => <div data-slot="detail-main"><h2>{ticket.title}</h2></div> },
  feed: { ActivityFeed: ({ ticketId }: { ticketId: number }) => <section data-slot="activity-feed" data-ticket-id={ticketId} /> },
  composer: { Composer: ({ ticket }: { ticket: { id: number } }) => <div data-slot="composer" data-ticket-id={ticket.id} /> },
  rail: { PropertiesRail: ({ ticket }: { ticket: { id: number } }) => <div data-slot="properties-rail" data-ticket-id={ticket.id} /> },
  timer: { TimerButton: ({ ticketId }: { ticketId: number }) => <span data-slot="timer-button" data-ticket-id={ticketId} aria-hidden="true" /> },
};
