/**
 * List view (plan FE-16 §5.2, FE-08), against the local B2 backend.
 *
 * - toggle to list (segment, URL);
 * - one group per column in position order, empty columns included, with the
 *   column_counts total (DC17);
 * - a row opens the detail with the filters;
 * - a group's + opens the create sheet on that column;
 * - infinite scroll on a scratch board with 120 tickets: group totals stay
 *   constant while pages load and every row lands in its own group.
 */
import { expect, test, type Page } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";
import { api, createScratchBoard, deleteBoardQuietly, fx, kanban, openBoardIn } from "./fixtures/board";

type CountsBody = { counts: Record<string, number> };

const groups = (page: Page) => page.getByTestId("list-group");
const group = (page: Page, columnId: number) => page.locator(`[data-testid="list-group"][data-column-id="${columnId}"]`);
const groupOrder = (page: Page) =>
  groups(page).evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.columnId)));
const rowIds = (page: Page, columnId?: number) =>
  (columnId ? group(page, columnId) : page.getByTestId("ticket-list"))
    .getByTestId("list-row")
    .evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.ticketId)));
const groupCounts = (page: Page) =>
  page
    .getByTestId("list-group-count")
    .evaluateAll((els) => els.map((e) => Number(e.firstElementChild?.textContent ?? e.textContent)));

async function openList(page: Page, boardId: number, query = "") {
  await page.goto(`/tickets?board=${boardId}&view=list${query}`);
  await expect(page.getByTestId("ticket-list")).toBeVisible({ timeout: 45_000 });
}

test.describe("List view", () => {
  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(() => {
    resetFixtures();
  });

  test("toggle to list", async ({ context }) => {
    const { support } = fx().boards;
    const page = await openBoardIn(context, "admin", support.id);
    await page.getByTestId("tickets-toolbar").getByRole("radio", { name: "List" }).click();
    await expect(page).toHaveURL(/[?&]view=list(&|$)/);
    await expect(page.getByTestId("ticket-list")).toBeVisible();
    await expect(page.getByTestId("tickets-screen")).toHaveAttribute("data-state", "list");
    await expect(page.getByTestId("ticket-card")).toHaveCount(0);
    await expect(page.getByTestId("list-header")).toBeVisible();
    // The sort cycle offers no Manual in list view (E20).
    await expect(page.getByTestId("toolbar-sort")).toHaveAttribute("data-sort", "created");
    // And back.
    await page.getByTestId("tickets-toolbar").getByRole("radio", { name: "Board" }).click();
    await expect(page.getByTestId("ticket-card").first()).toBeVisible();
    await expect(page).not.toHaveURL(/[?&]view=list/);
  });

  test("groups per column including empty columns, with totals", async ({ context }) => {
    const { sales, support } = fx().boards;
    const page = await openBoardIn(context, "admin", support.id, { waitFor: "screen" });

    // Sales has an empty "won" column.
    const k = await kanban(sales.id);
    const ordered = [...k.columns].sort((a, b) => a.position - b.position || a.id - b.id).map((c) => c.id);
    const countsWait = page.waitForResponse((r) => r.url().includes(`/api/tickets/column_counts/?board=${sales.id}`));
    await openList(page, sales.id);
    const counts = ((await (await countsWait).json()) as CountsBody).counts;
    await expect.poll(() => groupOrder(page)).toEqual(ordered);
    await expect.poll(() => groupCounts(page)).toEqual(ordered.map((id) => counts[String(id)] ?? 0));
    expect(await rowIds(page, sales.columns.won)).toEqual([]);
    expect(counts[String(sales.columns.won)]).toBe(0);
    expect(await rowIds(page, sales.columns.new)).toContain(fx().tickets["E2E-010"].id);

    // Support, filtered: the totals follow the filter, the empty groups stay.
    const filteredWait = page.waitForResponse(
      (r) => r.url().includes(`/api/tickets/column_counts/?board=${support.id}`) && r.url().includes("priority__in=high"),
    );
    await openList(page, support.id, "&priority=high");
    const fcounts = ((await (await filteredWait).json()) as CountsBody).counts;
    await expect(groups(page)).toHaveCount(Object.keys(support.columns).length);
    await expect.poll(() => groupCounts(page)).toEqual(
      (await groupOrder(page)).map((id) => fcounts[String(id)] ?? 0),
    );
    // Totals match the rows (everything fits on one page here) and the toolbar count.
    const total = Object.values(fcounts).reduce((a, b) => a + b, 0);
    await expect.poll(async () => (await rowIds(page)).length).toBe(total);
    await expect(page.getByTestId("toolbar-count")).toHaveText(total === 1 ? "1 ticket" : `${total} tickets`);
  });

  test("a row opens the detail", async ({ context }) => {
    const { support } = fx().boards;
    const id = fx().tickets["E2E-002"].id;
    const page = await openBoardIn(context, "admin", support.id, { waitFor: "screen" });
    await openList(page, support.id, "&q=Invoice");
    const row = page.locator(`[data-testid="list-row"][data-ticket-id="${id}"]`);
    await expect(row).toHaveAttribute("href", `/tickets/${id}?board=${support.id}&view=list&q=Invoice`);
    await row.click();
    await expect(page).toHaveURL(new RegExp(`/tickets/${id}\\?board=${support.id}&view=list&q=Invoice$`));
  });

  test("a group's + opens create with that column", async ({ context }) => {
    const { support } = fx().boards;
    const page = await openBoardIn(context, "admin", support.id, { waitFor: "screen" });
    await openList(page, support.id);
    await group(page, support.columns.waiting).getByTestId("list-group-add").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const k = await kanban(support.id);
    const name = k.columns.find((c) => c.id === support.columns.waiting)!.name;
    await expect(dialog).toContainText(name);
  });

  test("infinite scroll on 120 tickets keeps group totals constant while loading", async ({ context }) => {
    test.setTimeout(240_000);
    const stamp = Date.now();
    let boardId: number | undefined;
    try {
      const scratch = await createScratchBoard(`E2E List ${stamp}`, ["Backlog", "Empty", "Doing"]);
      boardId = scratch.board.id;
      const [backlog, empty, doing] = scratch.cols.map((c) => c.id);
      // 70 in Backlog, 0 in Empty, 50 in Doing: page 1 (50 rows) ends inside Backlog.
      for (let i = 0; i < 120; i++) {
        await api("POST", "/api/tickets/", {
          title: `E2E scroll ${String(i).padStart(3, "0")}`,
          priority: "medium",
          column_id: i < 70 ? backlog : doing,
        });
      }

      const page = await openBoardIn(context, "admin", scratch.board.id, { waitFor: "screen" });
      await openList(page, scratch.board.id);
      await expect.poll(() => groupCounts(page)).toEqual([70, 0, 50]);
      await expect.poll(async () => (await rowIds(page)).length).toBe(50);
      // Groups the pages haven't reached show a placeholder, not an empty group.
      await expect(group(page, doing)).toHaveAttribute("data-pending", "true");
      await expect(group(page, empty)).not.toHaveAttribute("data-pending", "true");

      // Scroll to the end until everything is loaded; totals never change.
      const list = page.getByTestId("ticket-list");
      for (let i = 0; i < 10 && (await rowIds(page)).length < 120; i++) {
        await list.evaluate((el) => el.scrollTo(0, el.scrollHeight));
        await expect(groupCounts(page)).resolves.toEqual([70, 0, 50]);
        await page.waitForResponse((r) => r.url().includes("/api/tickets/?") && r.url().includes(`board=${scratch.board.id}`), { timeout: 5_000 }).catch(() => undefined);
      }
      await expect.poll(async () => (await rowIds(page)).length, { timeout: 20_000 }).toBe(120);
      expect(await groupCounts(page)).toEqual([70, 0, 50]);
      expect((await rowIds(page, backlog)).length).toBe(70);
      expect((await rowIds(page, empty)).length).toBe(0);
      expect((await rowIds(page, doing)).length).toBe(50);
      expect(new Set(await rowIds(page)).size).toBe(120);
      await expect(page.getByTestId("list-sentinel")).toHaveCount(0);
      await expect(group(page, doing)).not.toHaveAttribute("data-pending", "true");
    } finally {
      await deleteBoardQuietly(boardId);
    }
  });
});
