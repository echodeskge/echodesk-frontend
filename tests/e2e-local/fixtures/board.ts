/**
 * Board helpers for the e2e-local suite (W1 specs): typed access to the
 * `prepare_tickets_e2e` ids, a small local API client for setup and server
 * assertions, page openers and the keyboard DnD driver (RM8: keyboard DnD for
 * @hello-pangea, waits instead of sleeps wherever there is something to wait on).
 */
import http from "node:http";
import type { Browser, BrowserContext, Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { API_HOST, API_PORT, APP } from "./env";
import { ids, signIn, tokenFor, waitForWs, type Locale, type Who } from "./session";

// ---------------------------------------------------------------------------
// fixture ids
// ---------------------------------------------------------------------------

export interface FixtureBoard {
  id: number;
  name: string;
  color: string;
  access: string;
  columns: Record<string, number>;
}
export interface FixtureTicket {
  id: number;
  board: string;
  column: string;
  role: string;
  title: string;
}
export interface FixtureIds {
  boards: Record<"support" | "sales" | "open" | "restricted" | "empty", FixtureBoard>;
  tickets: Record<string, FixtureTicket>;
  roles: Record<string, number>;
  tags: Record<string, number>;
  users: Record<"admin" | "agent" | "agent2", { id: number; email: string; is_staff: boolean }>;
  today: string;
}

/** The ids of the most recent `resetFixtures()`. */
export function fx(): FixtureIds {
  return ids as unknown as FixtureIds;
}

// ---------------------------------------------------------------------------
// local API
// ---------------------------------------------------------------------------

export function api<T = unknown>(method: string, path: string, body?: unknown, who: Who = "admin"): Promise<T> {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const req = http.request(
      {
        host: "127.0.0.1",
        port: Number(API_PORT),
        path,
        method,
        headers: {
          Host: API_HOST,
          Authorization: `Token ${tokenFor(who)}`,
          Accept: "application/json",
          ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
        },
        timeout: 20_000,
      },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => {
          if ((res.statusCode ?? 500) >= 400) {
            reject(new Error(`${method} ${path}: HTTP ${res.statusCode} ${buf.slice(0, 300)}`));
            return;
          }
          try {
            resolve((buf ? JSON.parse(buf) : null) as T);
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error(`${method} ${path}: timeout`)));
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

export interface LiteCard {
  id: number;
  title: string;
  priority: string;
  position_in_column: number;
}
export interface KanbanPayload {
  board: { id: number; name: string };
  columns: { id: number; name: string; position: number; is_closed_status: boolean; track_time: boolean; is_default: boolean }[];
  tickets_by_column: Record<string, LiteCard[]>;
}
export interface BoardLiteRow {
  id: number;
  name: string;
  color: string;
  is_default: boolean;
  open_count: number;
}

export const kanban = (boardId: number, qs = "", who: Who = "admin") =>
  api<KanbanPayload>("GET", `/api/boards/${boardId}/kanban_board/?lite=1${qs}`, undefined, who);

export async function boardsLite(who: Who = "admin"): Promise<BoardLiteRow[]> {
  const res = await api<BoardLiteRow[] | { results: BoardLiteRow[] }>("GET", "/api/boards/?lite=1", undefined, who);
  return Array.isArray(res) ? res : res.results;
}

export const serverColumn = (k: KanbanPayload, columnId: number) =>
  (k.tickets_by_column[String(columnId)] ?? []).map((c) => c.id);

/** A board with its own columns and tickets, for tests that change board structure. */
export async function createScratchBoard(
  name: string,
  columns: string[],
  tickets: { title: string; priority?: string; column: number }[] = [],
  opts: { closedColumns?: number[] } = {},
) {
  const board = await api<{ id: number; name: string }>("POST", "/api/boards/", { name, description: "e2e-local scratch", color: "#0ea5e9" });
  const cols: { id: number; name: string }[] = [];
  for (const [i, colName] of columns.entries()) {
    cols.push(
      await api("POST", "/api/columns/", {
        name: colName,
        board: board.id,
        position: i,
        color: "#64748b",
        is_default: i === 0,
        is_closed_status: opts.closedColumns?.includes(i) ?? false,
        track_time: false,
      }),
    );
  }
  const created: { id: number; title: string }[] = [];
  for (const t of tickets) {
    created.push(await api("POST", "/api/tickets/", { title: t.title, priority: t.priority ?? "medium", column_id: cols[t.column].id }));
  }
  return { board, cols, tickets: created };
}

export async function deleteBoardQuietly(id: number | undefined) {
  if (!id) return;
  await api("DELETE", `/api/boards/${id}/`).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// pages
// ---------------------------------------------------------------------------

export interface OpenOptions {
  locale?: Locale;
  theme?: "light" | "dark";
  /** Extra query string, e.g. "&priority=high". */
  query?: string;
  /** Wait for at least one card (default) or only for the screen root. */
  waitFor?: "card" | "screen";
  viewport?: { width: number; height: number };
}

/** Sign in on an existing context and open `/tickets?board=<id>`. */
export async function openBoardIn(context: BrowserContext, who: Who, boardId: number, opts: OpenOptions = {}) {
  await signIn(context, who, opts.locale ?? "en", { theme: opts.theme ?? "light" });
  const page = await context.newPage();
  await gotoBoard(page, boardId, opts);
  return page;
}

/** A fresh context (for two-user checks) with the board open. */
export async function openBoard(browser: Browser, who: Who, boardId: number, opts: OpenOptions = {}) {
  const context = await browser.newContext({ viewport: opts.viewport ?? { width: 1440, height: 900 } });
  const page = await openBoardIn(context, who, boardId, opts);
  return { context, page };
}

export async function gotoBoard(page: Page, boardId: number, opts: OpenOptions = {}) {
  await page.goto(`${APP}/tickets?board=${boardId}${opts.query ?? ""}`);
  await expect(page.getByTestId("tickets-screen")).toBeVisible({ timeout: 45_000 });
  if ((opts.waitFor ?? "card") === "card") {
    await expect(page.getByTestId("ticket-card").first()).toBeVisible({ timeout: 45_000 });
  }
}

export const cardSel = (id: number) => `[data-testid="ticket-card"][data-ticket-id="${id}"]`;
export const card = (page: Page, id: number) => page.locator(cardSel(id));
export const column = (page: Page, id: number) => page.locator(`[data-testid="kanban-column"][data-column-id="${id}"]`);
export const domColumn = (page: Page, columnId: number) =>
  column(page, columnId)
    .getByTestId("ticket-card")
    .evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.ticketId)));

/** Waits until no @hello-pangea drag or drop animation is in progress. */
export async function waitDragIdle(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () => !document.querySelector('[data-rfd-drag-handle-context-id][data-dragging="true"], [data-rfd-placeholder-context-id]'),
        ),
      { timeout: 5_000 },
    )
    .toBe(true);
}

/**
 * Keyboard DnD: focus the card's drag handle, Space to lift, the arrow keys,
 * Space to drop. @hello-pangea ignores keys sent faster than it can animate,
 * so each press waits a frame-ish beat (it exposes nothing to wait on).
 */
export async function keyboardMove(page: Page, ticketId: number, presses: string[]) {
  await card(page, ticketId).focus();
  await page.keyboard.press("Space");
  await expect(card(page, ticketId)).toHaveAttribute("data-dragging", "true");
  for (const key of presses) {
    await page.keyboard.press(key);
    await page.waitForTimeout(120);
  }
  await page.keyboard.press("Space");
  await waitDragIdle(page);
}

export async function waitBoardWs(page: Page) {
  await waitForWs(page, 20_000);
}

/** Horizontal page overflow at the current viewport. */
export function pageOverflowX(page: Page) {
  return page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    return el.scrollWidth - window.innerWidth;
  });
}

/** True when the element's box lies inside the viewport. */
export async function insideViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const vp = page.viewportSize();
  if (!box || !vp) return false;
  return box.x >= -1 && box.y >= -1 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1;
}
