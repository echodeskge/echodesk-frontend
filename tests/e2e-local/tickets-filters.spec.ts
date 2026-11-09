/**
 * Filters, sort and views (plan FE-16 §5.2), against the local B2 backend.
 * The board part is turned on by FE-INT in W1 (FE-06 toolbar, FE-07 board);
 * the saved-view rows ship with the list view in W2 (FE-08 + the views flag).
 *
 * Each filter is checked two ways: the cards on screen are exactly the ones
 * the filtered kanban response returned, and they make sense for the filter.
 */
import { expect, test, type Page, type Response } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";
import { fx, openBoardIn } from "./fixtures/board";

type KanbanBody = { tickets_by_column: Record<string, { id: number; priority: string }[]> };

const isKanban = (r: Response) => /\/api\/boards\/\d+\/kanban_board\/\?/.test(r.url()) && r.request().method() === "GET";

async function responseIds(res: Response) {
  const body = (await res.json()) as KanbanBody;
  return Object.values(body.tickets_by_column)
    .flat()
    .map((c) => c.id)
    .sort((a, b) => a - b);
}

async function visibleIds(page: Page) {
  const ids = await page
    .getByTestId("ticket-card")
    .evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.ticketId)));
  return ids.sort((a, b) => a - b);
}

/** Runs `act`, waits for the kanban request whose URL matches `param`, and returns its ids. */
async function filtered(page: Page, param: RegExp, act: () => Promise<void>) {
  const wait = page.waitForResponse((r) => isKanban(r) && param.test(decodeURIComponent(r.url())));
  await act();
  const res = await wait;
  expect(res.status()).toBe(200);
  return responseIds(res);
}

async function expectBoardShows(page: Page, ids: number[]) {
  if (ids.length === 0) {
    await expect(page.getByTestId("tickets-screen")).toHaveAttribute("data-state", "no-matches");
  } else {
    await expect.poll(() => visibleIds(page)).toEqual(ids);
  }
}

const chip = (page: Page, id: string) => page.locator(`button[data-filter="${id}"]`);
const option = (page: Page, menu: string, value: string) =>
  page.locator(`[data-filter-menu="${menu}"] [data-option="${value}"]`);

test.describe("Filters, sort and views", () => {
  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(() => {
    resetFixtures();
  });

  test("Assignee=Me, Priority, Label and Due chips, search, sort cycle and clear", async ({ context }) => {
    const { support } = fx().boards;
    const t = fx().tickets;
    const page = await openBoardIn(context, "agent", support.id);
    const all = await visibleIds(page);

    // Assignee = Me
    let ids = await filtered(page, /[?&]assignee=/, async () => {
      await chip(page, "assignee").click();
      await option(page, "assignee", "me").click();
    });
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/[?&]assignee=me(&|$)/);
    await expect(chip(page, "assignee")).toHaveAttribute("data-active", "true");
    await expect(chip(page, "assignee").locator('[data-slot="filter-chip-value"]')).toHaveText("Me");
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThan(all.length);
    await expectBoardShows(page, ids);
    await page.getByTestId("toolbar-clear").click();
    await expect.poll(() => visibleIds(page)).toEqual(all);

    // Priority = high: every visible pill says High
    ids = await filtered(page, /[?&]priority__in=high/, async () => {
      await chip(page, "priority").click();
      await option(page, "priority", "high").click();
    });
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/[?&]priority=high(&|$)/);
    await expectBoardShows(page, ids);
    for (const pill of await page.locator('[data-testid="ticket-card"] [data-slot="priority-pill"]').all()) {
      await expect(pill).toHaveAttribute("data-priority", "high");
    }
    await page.getByTestId("toolbar-clear").click();

    // Label = VIP
    const vip = fx().tags.VIP;
    ids = await filtered(page, new RegExp(`[?&]tags__in=${vip}`), async () => {
      await chip(page, "label").click();
      await option(page, "label", String(vip)).click();
    });
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(new RegExp(`[?&]label=${vip}(&|$)`));
    await expectBoardShows(page, ids);
    for (const c of await page.getByTestId("ticket-card").all()) {
      await expect(c.locator('[data-slot="label-chip"]', { hasText: "VIP" })).toHaveCount(1);
    }
    await page.getByTestId("toolbar-clear").click();

    // Due = Overdue, added through the Assignee popover's "More filters" (DC2)
    await expect(chip(page, "due")).toHaveCount(0);
    ids = await filtered(page, /[?&]due=overdue/, async () => {
      await chip(page, "assignee").click();
      await page.getByTestId("more-filters").click();
      await option(page, "due", "overdue").click();
    });
    await expect(page).toHaveURL(/[?&]due=overdue(&|$)/);
    expect(ids).toContain(t["E2E-002"].id);
    expect(ids).not.toContain(t["E2E-009"].id);
    await expectBoardShows(page, ids);
    await expect(page.locator(`[data-ticket-id="${t["E2E-002"].id}"] [data-slot="due-chip"]`)).toHaveAttribute("data-overdue", "true");
    await page.getByTestId("toolbar-clear").click();
    await expect(page).not.toHaveURL(/[?&]due=/);

    // Search
    ids = await filtered(page, /[?&](q|search)=Invoice/, async () => {
      await page.getByTestId("toolbar-search-input").fill("Invoice");
    });
    await expect(page).toHaveURL(/[?&]q=Invoice(&|$)/);
    expect(ids).toEqual([t["E2E-002"].id]);
    await expectBoardShows(page, ids);

    // Sort cycle: Manual → Created → Updated → Priority → Due → Manual
    const sort = page.getByTestId("toolbar-sort");
    await expect(sort).toHaveAttribute("data-sort", "manual");
    for (const [next, label] of [
      ["created", "Created"],
      ["updated", "Updated"],
      ["priority", "Priority"],
      ["due", "Due date"],
    ] as const) {
      await sort.click();
      await expect(sort).toHaveAttribute("data-sort", next);
      await expect(sort).toContainText(label);
      await expect(page).toHaveURL(new RegExp(`[?&]sort=${next}(&|$)`));
    }
    await sort.click();
    await expect(sort).toHaveAttribute("data-sort", "manual");

    // Clear keeps board (and view) but drops the rest
    await page.getByTestId("toolbar-clear").click();
    await expect(page).toHaveURL(new RegExp(`[?&]board=${support.id}(&|$)`));
    await expect(page).not.toHaveURL(/[?&](q|priority|assignee|label|due)=/);
    await expect(page.getByTestId("toolbar-clear")).toBeDisabled();
    await expect.poll(() => visibleIds(page)).toEqual(all);
  });

  test("the URL reflects the state and a reload restores it", async ({ context }) => {
    const { support } = fx().boards;
    const page = await openBoardIn(context, "admin", support.id);

    await chip(page, "priority").click();
    await option(page, "priority", "high").click();
    // Each pick writes the URL; wait for it before the next one reads the selection.
    await expect(option(page, "priority", "high")).toHaveAttribute("data-checked", "true");
    await option(page, "priority", "medium").click();
    await expect(option(page, "priority", "medium")).toHaveAttribute("data-checked", "true");
    await page.keyboard.press("Escape");
    await page.getByTestId("toolbar-search-input").fill("E2E");
    await page.getByTestId("toolbar-sort").click();
    await expect(page).toHaveURL(/[?&]q=E2E(&|$)/);
    const url = new URL(page.url());
    expect(url.searchParams.get("priority")?.split(",").sort()).toEqual(["high", "medium"]);
    expect(url.searchParams.get("sort")).toBe("created");
    const before = await visibleIds(page);

    await page.reload();
    await expect(page.getByTestId("ticket-card").first()).toBeVisible({ timeout: 45_000 });
    await expect(chip(page, "priority")).toHaveAttribute("data-active", "true");
    await expect(chip(page, "priority")).toContainText("+1");
    await expect(page.getByTestId("toolbar-search-input")).toHaveValue("E2E");
    await expect(page.getByTestId("toolbar-sort")).toHaveAttribute("data-sort", "created");
    await expect.poll(() => visibleIds(page)).toEqual(before);
  });

  test("the ticket count updates and header counts match the visible cards", async ({ context }) => {
    const { support } = fx().boards;
    const page = await openBoardIn(context, "admin", support.id);

    const check = async () => {
      const total = await page.getByTestId("ticket-card").count();
      await expect(page.getByTestId("toolbar-count")).toHaveText(total === 1 ? "1 ticket" : `${total} tickets`);
      for (const col of await page.getByTestId("kanban-column").all()) {
        const n = await col.getByTestId("ticket-card").count();
        await expect(col.getByTestId("kanban-column-count")).toHaveText(String(n));
      }
      return total;
    };

    const all = await check();
    await filtered(page, /[?&]priority__in=high/, async () => {
      await chip(page, "priority").click();
      await option(page, "priority", "high").click();
    });
    await page.keyboard.press("Escape");
    await expect.poll(() => page.getByTestId("ticket-card").count()).toBeLessThan(all);
    await check();
  });

  // W2: the saved-view rows render only with flags.listViewEnabled and open the list view (FE-08).
  test.fixme("sidebar view Urgent opens the list view with chips active and matching count", async () => {});
  test.fixme("the active view row is highlighted", async () => {});
});
