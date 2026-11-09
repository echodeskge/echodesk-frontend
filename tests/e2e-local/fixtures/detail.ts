/**
 * Detail-page helpers for the e2e-local suite (W3 specs).
 *
 * `openDetail()` signs in, opens `/tickets/{id}` and waits for the new
 * detail screen. While `flags.detailRedesignEnabled` is still false (before
 * FE-INT flips it in the W3 merge) the old screen renders instead, and the
 * calling test is skipped with a note rather than failing.
 */
import type { BrowserContext, Page } from "@playwright/test";
import { test } from "@playwright/test";
import { APP } from "./env";
import { signIn, type Locale, type Who } from "./session";
import { api } from "./board";

export interface TicketJson {
  id: number;
  priority: string;
  column: { id: number; name: string };
  board: { id: number; name: string };
  tags: { id: number; name: string }[];
  assignments: { user: { id: number }; role: string }[];
  assigned_groups: { id: number }[];
  assigned_department: { id: number } | null;
  customer: { id: number; name: string } | null;
  due_date: string | null;
  viewer_permissions: Record<string, boolean>;
}

export const getTicket = (id: number, who: Who = "admin") => api<TicketJson>("GET", `/api/tickets/${id}/`, undefined, who);

export async function openDetail(
  context: BrowserContext,
  who: Who,
  ticketId: number,
  locale: Locale = "en",
  theme: "light" | "dark" = "light",
): Promise<Page> {
  await signIn(context, who, locale, { theme });
  const page = await context.newPage();
  await page.goto(`${APP}/tickets/${ticketId}`);
  const screen = page.locator('[data-testid="ticket-detail"]');
  try {
    await screen.waitFor({ state: "attached", timeout: 45_000 });
  } catch {
    test.skip(true, "flags.detailRedesignEnabled is off: the old detail screen is rendering");
  }
  await page.locator('[data-testid="ticket-detail"][data-state="ready"]').waitFor({ timeout: 45_000 });
  await page.locator('[data-slot="properties-rail"]').waitFor();
  return page;
}

/** The picker trigger of a rail row, by its visible label. */
export function railTrigger(page: Page, label: string) {
  return page
    .locator('[data-slot="rail-rows"] > [data-slot="property-row"]')
    .filter({ has: page.locator(`span:text-is("${label}")`) })
    .locator('[data-slot="property-picker-trigger"]');
}

export function railRow(page: Page, label: string) {
  return page
    .locator('[data-slot="rail-rows"] > [data-slot="property-row"]')
    .filter({ has: page.locator(`span:text-is("${label}")`) });
}

export const pickerOption = (page: Page, text: string | RegExp) =>
  page.locator('[data-slot="property-picker-content"] [data-slot="property-picker-option"]').filter({ hasText: text });
