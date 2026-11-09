/**
 * Mobile 390 (plan FE-16 §5.2), mobile-390 project, against the local B2
 * backend. The board part is turned on by FE-INT in W1; the detail part waits
 * for the new detail page (W3).
 */
import { expect, test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";
import {
  card,
  column,
  createScratchBoard,
  deleteBoardQuietly,
  domColumn,
  fx,
  insideViewport,
  kanban,
  keyboardMove,
  openBoardIn,
  pageOverflowX,
  serverColumn,
} from "./fixtures/board";

test.describe("Mobile 390", () => {
  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(() => {
    resetFixtures();
  });

  test("no horizontal page scroll (scrollWidth <= 390)", async ({ context }) => {
    const page = await openBoardIn(context, "admin", fx().boards.support.id);
    expect(await pageOverflowX(page)).toBeLessThanOrEqual(0);
    // The board scrolls inside its own pane instead.
    const board = page.getByTestId("kanban-board");
    expect(await board.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await expect(page.getByTestId("new-ticket")).toBeVisible();
    // Icon only: the label span is hidden below sm.
    await expect(page.getByTestId("new-ticket").getByText("New ticket")).toBeHidden();
    expect((await page.getByTestId("new-ticket").boundingBox())!.width).toBeLessThanOrEqual(40);
    await expect(page.getByTestId("board-viewers")).toBeHidden();
  });

  test("list view: no horizontal scroll, header hidden, two-line rows (DC18)", async ({ context }) => {
    const page = await openBoardIn(context, "admin", fx().boards.support.id);
    await page.goto(`/tickets?board=${fx().boards.support.id}&view=list`);
    await expect(page.getByTestId("ticket-list")).toBeVisible({ timeout: 45_000 });
    const row = page.getByTestId("list-row").first();
    await expect(row).toBeVisible();
    expect(await pageOverflowX(page)).toBeLessThanOrEqual(0);
    const list = page.getByTestId("ticket-list");
    expect(await list.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expect(page.getByTestId("list-header")).toBeHidden();
    // Two lines: taller than the 40px desktop row, and the title still visible.
    expect((await row.boundingBox())!.height).toBeGreaterThan(40);
    await expect(row.getByTestId("list-row-title")).toBeVisible();
  });

  test("board columns snap-scroll", async ({ context }) => {
    const page = await openBoardIn(context, "admin", fx().boards.support.id);
    const board = page.getByTestId("kanban-board");
    expect(await board.evaluate((el) => getComputedStyle(el).scrollSnapType)).toContain("x mandatory");
    expect(await page.getByTestId("kanban-column").first().evaluate((el) => getComputedStyle(el).scrollSnapAlign)).toContain("start");
    const width = await page.getByTestId("kanban-column").first().evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(Math.ceil(390 * 0.85));

    // A partial swipe settles on the second column's start (12px gutter kept).
    await board.evaluate((el) => el.scrollTo({ left: 200 }));
    await expect
      .poll(() =>
        page.evaluate(() => {
          const second = document.querySelectorAll('[data-testid="kanban-column"]')[1].getBoundingClientRect();
          const pane = document.querySelector('[data-testid="kanban-board"]')!.getBoundingClientRect();
          return Math.round(second.left - pane.left);
        }),
      )
      .toBe(12);
  });

  test("chips scroll and the search icon expands", async ({ context }) => {
    const page = await openBoardIn(context, "admin", fx().boards.support.id);
    const chips = page.getByTestId("toolbar-chips");
    expect(await chips.evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");
    expect(await chips.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await chips.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    await expect.poll(() => chips.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    expect(await pageOverflowX(page)).toBeLessThanOrEqual(0);

    await expect(page.getByTestId("toolbar-search-input")).toBeHidden();
    await page.getByTestId("toolbar-search-open").click();
    await expect(page.getByTestId("toolbar-search-input")).toBeVisible();
    await expect(page.getByTestId("toolbar-search-input")).toBeFocused();
    expect(await insideViewport(page, page.getByTestId("toolbar-search-input"))).toBe(true);
    expect(await pageOverflowX(page)).toBeLessThanOrEqual(0);
  });

  test("every open popover and the switcher Sheet fit inside the viewport (DC40)", async ({ context }) => {
    const page = await openBoardIn(context, "admin", fx().boards.support.id);

    for (const id of ["assignee", "priority", "label"]) {
      const chip = page.locator(`button[data-filter="${id}"]`);
      await chip.scrollIntoViewIfNeeded();
      await chip.click();
      const pop = page.locator(`[data-filter-menu="${id}"]`);
      await expect(pop).toBeVisible();
      expect(await insideViewport(page, pop), `${id} popover inside the viewport`).toBe(true);
      await page.keyboard.press("Escape");
      await expect(pop).toBeHidden();
    }

    await page.getByTestId("board-switcher").click();
    const sheet = page.getByTestId("board-switcher-sheet");
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId("board-switcher-menu")).toHaveCount(0);
    // Wait for the slide-in to finish before measuring.
    await expect.poll(() => insideViewport(page, sheet)).toBe(true);
    await page.keyboard.press("Escape");

    await card(page, fx().tickets["E2E-001"].id).getByTestId("card-menu-trigger").click();
    const menu = page.getByTestId("card-menu-open");
    await expect(menu).toBeVisible();
    expect(await insideViewport(page, menu)).toBe(true);
    await page.keyboard.press("Escape");
    expect(await pageOverflowX(page)).toBeLessThanOrEqual(0);
  });

  test("a card opens the detail", async ({ context }) => {
    const page = await openBoardIn(context, "admin", fx().boards.support.id, { query: "&priority=high" });
    const first = page.getByTestId("ticket-card").first();
    const id = Number(await first.getAttribute("data-ticket-id"));
    await first.getByTestId("card-title").tap();
    await expect(page).toHaveURL(new RegExp(`/tickets/${id}\\?(.*&)?priority=high`));
  });

  test.describe.serial("drag and drop", () => {
    let scratch: Awaited<ReturnType<typeof createScratchBoard>>;

    test.beforeAll(async () => {
      scratch = await createScratchBoard(`E2E Mobile ${Date.now().toString(36)}`, ["Todo", "Doing"], [
        { title: "Mobile T1", column: 0 },
        { title: "Mobile T2", column: 0 },
      ]);
    });
    test.afterAll(async () => {
      await deleteBoardQuietly(scratch?.board.id);
    });

    test("keyboard DnD (Space and arrows) moves a card", async ({ context }) => {
      const [todo, doing] = scratch.cols.map((c) => c.id);
      const page = await openBoardIn(context, "admin", scratch.board.id);
      const mover = (await domColumn(page, todo))[0];

      await keyboardMove(page, mover, ["ArrowRight"]);

      await expect.poll(async () => serverColumn(await kanban(scratch.board.id), doing)).toContain(mover);
      await expect(column(page, doing).locator(`[data-ticket-id="${mover}"]`)).toHaveCount(1);
    });

    test("touch long-press DnD (fixme if emulation can't drive @hello-pangea)", async ({ context }) => {
      // Playwright's tap() can't hold a touch, so drive raw CDP touch events:
      // touchstart, hold past @hello-pangea's long-press delay, stepped moves, touchend.
      const [todo, doing] = scratch.cols.map((c) => c.id);
      const page = await openBoardIn(context, "admin", scratch.board.id);
      const mover = (await domColumn(page, todo))[0];
      const from = (await card(page, mover).boundingBox())!;
      const to = (await column(page, doing).getByTestId("kanban-column-list").boundingBox())!;
      const cdp = await context.newCDPSession(page);
      const at = (x: number, y: number) => [{ x, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }];
      const [x0, y0] = [from.x + 40, from.y + 20];
      const [x1, y1] = [Math.min(to.x + 40, 380), to.y + 30];

      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(x0, y0) });
      await expect(card(page, mover)).toHaveAttribute("data-dragging", "true", { timeout: 2_000 }).catch(() => undefined);
      for (let i = 1; i <= 15; i++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: at(x0 + ((x1 - x0) * i) / 15, y0 + ((y1 - y0) * i) / 15),
        });
      }
      await expect(card(page, mover)).toHaveAttribute("data-dragging", "true");
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

      await expect.poll(async () => serverColumn(await kanban(scratch.board.id), doing)).toContain(mover);
      await expect(column(page, doing).locator(`[data-ticket-id="${mover}"]`)).toHaveCount(1);
    });
  });

  // W3: the new detail page.
  test.fixme("the detail header row has scrollWidth <= clientWidth (DC20)", async () => {});
  test.fixme("the status track scrolls with the current step visible", async () => {});
  test.fixme("the rail is stacked under the main column", async () => {});
  test.fixme("the composer stays visible after focusing (viewport resize)", async () => {});
  test.fixme("the J/K buttons are tappable", async () => {});
});
