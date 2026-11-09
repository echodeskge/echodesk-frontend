/**
 * Create-sheet helpers for the e2e-local suite (FE-14): fill the sheet the way
 * a person does and read the created ticket id from the success toast.
 */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { api, boardsLite, kanban } from "./board";

export const createSheet = (page: Page) => page.getByTestId("ticket-create-sheet");

export interface ServerTicket {
  id: number;
  title: string;
  priority: string;
  due_date: string | null;
  column: { id: number; name: string } | null;
  board: { id: number; name: string } | null;
  tags: { id: number; name: string }[];
  assignments?: { user: { id: number }; role: string }[];
  assigned_users?: { id: number }[];
  customer: { id: number; name: string } | null;
  attachments: unknown[];
  rich_description?: unknown;
  description: string;
}

export const getTicket = (id: number) => api<ServerTicket>("GET", `/api/tickets/${id}/`);

/** Waits until the sheet has resolved a board and a status (columns loaded). */
export async function waitSheetReady(page: Page, columnName?: string) {
  const sheet = createSheet(page);
  await expect(sheet).toBeVisible();
  const status = sheet.locator(".create-column-picker");
  if (columnName) await expect(status).toContainText(columnName, { timeout: 20_000 });
  else await expect(status.locator('[data-slot="property-pill"]')).toBeVisible({ timeout: 20_000 });
}

/** Picks one option of a PropertyPicker by its visible text; closes multi pickers. */
export async function pick(page: Page, trigger: Locator, optionText: string | RegExp, multi = false) {
  await trigger.click();
  const option = page.locator('[data-slot="property-picker-option"]').filter({ hasText: optionText }).first();
  await expect(option).toBeVisible();
  await option.click();
  if (multi) await page.keyboard.press("Escape");
}

/** Submits and returns the new ticket id from the "Ticket #N created" toast. */
export async function submitAndGetId(page: Page): Promise<number> {
  await createSheet(page).getByTestId("create-submit").click();
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: /#\d+/ }).first();
  await expect(toast).toBeVisible({ timeout: 20_000 });
  const m = /#(\d+)/.exec((await toast.textContent()) ?? "");
  if (!m) throw new Error("no ticket id in the success toast");
  await expect(createSheet(page)).toBeHidden();
  return Number(m[1]);
}

/** The first social client of the tenant, or null when the demo has none. */
export async function anySocialClient(): Promise<{ id: number; name: string } | null> {
  const res = await api<{ results: { id: number; name: string; full_name?: string }[] }>(
    "GET",
    "/api/social/clients/?page_size=5",
  ).catch(() => null);
  const c = res?.results?.find((r) => (r.name || r.full_name || "").trim().length > 0);
  return c ? { id: c.id, name: (c.name || c.full_name || "").trim() } : null;
}

/**
 * A fixture board looked up by name at test time, with its columns by name.
 * Other local agents re-seed the shared demo data while this suite runs, which
 * renumbers boards and columns; names are stable.
 */
export async function liveBoard(name: string): Promise<{ id: number; name: string; columns: Record<string, number> }> {
  const board = (await boardsLite("admin")).find((b) => b.name === name);
  if (!board) throw new Error(`board "${name}" not found (run prepare_tickets_e2e)`);
  const k = await kanban(board.id);
  return { id: board.id, name: board.name, columns: Object.fromEntries(k.columns.map((c) => [c.name, c.id])) };
}
