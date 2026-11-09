/**
 * Personal timer (plan FE-16 §5.2, FE-13; U1, A14, E32) against the LOCAL stack.
 *
 * Needs the new detail screen (`flags.detailRedesignEnabled`, flipped by
 * FE-INT in the W3 merge). While the flag is off the page shows the old
 * detail, so each test marks itself fixme instead of failing. The rail row
 * and the Time tab are mounted by FE-12 and FE-11; the steps that need them
 * mark themselves fixme until those land.
 *
 * Server state is checked through the local API; the UI is checked with
 * polling assertions only (RM8: no fixed sleeps).
 */
import { expect, test, type Browser, type Page } from "@playwright/test";
import { APP } from "./fixtures/env";
import { api, fx } from "./fixtures/board";
import { resetFixtures, signIn, type Who } from "./fixtures/session";

interface TimerState {
  running: { id: number; ticket_id: number } | null;
  my_total_seconds: number;
  total_seconds: number;
  entries: { id: number; is_running: boolean }[];
}
interface Current {
  running: { id: number; ticket_id: number } | null;
}

const timerOf = (ticketId: number, who: Who = "admin") => api<TimerState>("GET", `/api/tickets/${ticketId}/timer/`, undefined, who);
const currentOf = (who: Who = "admin") => api<Current>("GET", "/api/time-entries/current/", undefined, who);
/** Stop whatever timer `who` has running (409 when none: ignored). */
const stopAny = (who: Who) => api("POST", "/api/time-entries/current/stop/", {}, who).catch(() => undefined);

const ticketId = (key: string) => {
  const t = fx().tickets[key];
  if (!t) throw new Error(`fixture ticket ${key} missing`);
  return t.id;
};

async function openDetail(browser: Browser, who: Who, id: number, locale: "en" | "ka" = "en") {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await signIn(context, who, locale, { theme: "light" });
  const page = await context.newPage();
  await gotoDetail(page, id);
  return { context, page };
}

async function gotoDetail(page: Page, id: number) {
  await page.goto(`${APP}/tickets/${id}`);
  const found = await page
    .getByTestId("timer-button")
    .waitFor({ state: "visible", timeout: 45_000 })
    .then(() => true)
    .catch(() => false);
  test.fixme(!found, "the new detail screen is off (flags.detailRedesignEnabled): FE-INT turns it on in W3");
  await expect(page.getByTestId("timer-button")).toBeEnabled();
}

const timerButton = (page: Page) => page.getByTestId("timer-button");
const timerText = (page: Page) => page.getByTestId("timer-text");

test.describe("Personal timer", () => {
  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.beforeEach(async () => {
    await Promise.all([stopAny("admin"), stopAny("agent")]);
  });

  test("start (it ticks), stop, totals in the rail", async ({ browser }) => {
    const id = ticketId("E2E-004");
    const { context, page } = await openDetail(browser, "admin", id);
    try {
      await expect(timerButton(page)).toHaveAttribute("data-running", "false");
      const idle = (await timerText(page).textContent())?.trim();
      expect(idle).toMatch(/^\d{2}:\d{2}:\d{2}$/);

      await timerButton(page).click();
      await expect(timerButton(page)).toHaveAttribute("data-running", "true");
      await expect.poll(async () => (await currentOf()).running?.ticket_id).toBe(id);
      // It ticks: the text changes without a reload.
      const first = (await timerText(page).textContent())?.trim();
      await expect.poll(async () => (await timerText(page).textContent())?.trim(), { timeout: 5_000 }).not.toBe(first);

      await timerButton(page).click();
      await expect(timerButton(page)).toHaveAttribute("data-running", "false");
      await expect.poll(async () => (await currentOf()).running).toBeNull();
      const server = await timerOf(id);
      expect(server.my_total_seconds).toBeGreaterThan(0);
      expect(server.entries.length).toBeGreaterThan(0);

      // Rail Time row (FE-12 mounts it).
      const row = page.getByTestId("time-row");
      test.fixme((await row.count()) === 0, "the rail Time row is mounted by FE-12");
      await expect(row).toContainText("Mine");
      await expect(row).toContainText("Total");
      await expect(row).not.toContainText("Mine 0s");
    } finally {
      await context.close();
    }
  });

  test("start on a second ticket: the 409 dialog, then switch", async ({ browser }) => {
    const first = ticketId("E2E-004");
    const second = ticketId("E2E-005");
    await api("POST", `/api/tickets/${first}/timer/start/`, {}, "admin");
    const { context, page } = await openDetail(browser, "admin", second);
    try {
      await timerButton(page).click();
      const dialog = page.getByTestId("timer-switch-dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(`#${first}`);
      await expect(dialog).toContainText("Onboard the new branch");

      // Cancel keeps the other timer.
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();
      expect((await currentOf()).running?.ticket_id).toBe(first);

      await timerButton(page).click();
      await expect(dialog).toBeVisible();
      await dialog.getByTestId("timer-switch-here").click();
      await expect(dialog).toBeHidden();
      await expect(timerButton(page)).toHaveAttribute("data-running", "true");
      await expect.poll(async () => (await currentOf()).running?.ticket_id).toBe(second);
      expect((await timerOf(first)).running).toBeNull();
    } finally {
      await context.close();
    }
  });

  test("Time tab shows entries and time in status", async ({ browser }) => {
    const id = ticketId("E2E-006");
    await api("POST", `/api/tickets/${id}/timer/start/`, {}, "admin");
    await api("POST", `/api/tickets/${id}/timer/stop/`, {}, "admin");
    const { context, page } = await openDetail(browser, "admin", id);
    try {
      // FE-11's activity feed renders the Time tab.
      const tab = page.getByRole("tab", { name: /^Time/ }).or(page.getByRole("button", { name: /^Time\b/ })).first();
      test.fixme((await tab.count()) === 0, "the activity feed's Time tab is mounted by FE-11");
      await tab.click();
      const panel = page.getByTestId("time-tab");
      await expect(panel).toBeVisible();
      await expect(panel.getByTestId("time-entry").first()).toBeVisible();
      await expect(panel.getByTestId("time-by-user")).toBeVisible();
      await expect(panel.getByTestId("time-in-status")).toBeVisible();
      await expect(panel.getByTestId("time-in-status")).toContainText("Time in status");
    } finally {
      await context.close();
    }
  });

  test("moving the ticket to a closed column stops the timer", async ({ browser }) => {
    const id = ticketId("E2E-004");
    const { context, page } = await openDetail(browser, "admin", id);
    try {
      await timerButton(page).click();
      await expect(timerButton(page)).toHaveAttribute("data-running", "true");
      await expect.poll(async () => (await currentOf()).running?.ticket_id).toBe(id);

      // Own move through the status track: the server stops the timer (E32)
      // and the button follows even though the broadcast is this tab's echo.
      await page.locator('[data-slot="status-step"]', { hasText: "Resolved" }).click();
      await expect(page.locator('[data-slot="status-step"][aria-current="step"]')).toContainText("Resolved");
      await expect.poll(async () => (await currentOf()).running).toBeNull();
      await expect(timerButton(page)).toHaveAttribute("data-running", "false");

      // Starting again on the closed ticket is refused with a toast.
      await timerButton(page).click();
      await expect(page.getByText("The timer can't run on a closed ticket")).toBeVisible();
      await expect(timerButton(page)).toHaveAttribute("data-running", "false");
    } finally {
      await context.close();
    }
  });

  test("a stuck timer on a transferred ticket can be stopped via the switch", async ({ browser }) => {
    const lost = ticketId("E2E-012"); // open board, unassigned, created by admin
    const here = ticketId("E2E-003");
    await api("POST", `/api/tickets/${lost}/timer/start/`, {}, "agent");
    // Admin moves it to the restricted board: the agent can no longer see it.
    await api("PATCH", `/api/tickets/${lost}/move_to_column/`, { column_id: fx().boards.restricted.columns.todo }, "admin");
    await expect(api("GET", `/api/tickets/${lost}/`, undefined, "agent")).rejects.toThrow(/HTTP 404/);

    const { context, page } = await openDetail(browser, "agent", here);
    try {
      await timerButton(page).click();
      const dialog = page.getByTestId("timer-switch-dialog");
      await expect(dialog).toBeVisible();
      // The title is hidden from the agent now: only the number shows.
      await expect(dialog).toContainText(`#${lost}`);
      await expect(dialog).not.toContainText("Open board ticket");
      await dialog.getByTestId("timer-switch-here").click();
      await expect(timerButton(page)).toHaveAttribute("data-running", "true");
      await expect.poll(async () => (await currentOf("agent")).running?.ticket_id).toBe(here);
      const lostState = await timerOf(lost, "admin");
      expect(lostState.entries.every((e) => !e.is_running)).toBe(true);
    } finally {
      await context.close();
      await stopAny("agent");
    }
  });
});
