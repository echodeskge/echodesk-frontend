/**
 * Columns (plan FE-16 §5.2), against the local B2 backend. Turned on by FE-INT
 * in W1 (FE-07). Structure changes run on a scratch board, so the shared E2E
 * fixtures keep their columns.
 */
import { expect, test, type Page } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";
import { column, createScratchBoard, deleteBoardQuietly, fx, kanban, openBoardIn } from "./fixtures/board";

test.describe.serial("Columns", () => {
  let scratch: Awaited<ReturnType<typeof createScratchBoard>>;
  let added: number | undefined;

  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(async () => {
    resetFixtures();
    scratch = await createScratchBoard(`E2E Columns ${Date.now().toString(36)}`, ["Todo", "Doing", "Done"], [
      { title: "Columns T1", column: 1 },
    ]);
  });

  test.afterAll(async () => {
    await deleteBoardQuietly(scratch?.board.id);
  });

  const sheet = (page: Page) => page.getByTestId("column-sheet");
  const flag = (page: Page, key: string) => sheet(page).locator(`#kanban-column-${key}`);

  test("add a column with closed/default/track_time persisted (reopen the sheet to check)", async ({ context }) => {
    const page = await openBoardIn(context, "admin", scratch.board.id);
    await page.getByTestId("kanban-add-column").click();
    await sheet(page).locator("#kanban-column-name").fill("Review");
    for (const key of ["is_default", "is_closed_status", "track_time"]) {
      await flag(page, key).click();
      await expect(flag(page, key)).toHaveAttribute("aria-checked", "true");
    }
    await sheet(page).locator('button[type="submit"]').click();
    await expect(page.locator('[data-testid="kanban-column"] h3', { hasText: /^Review$/ })).toBeVisible();

    const k = await kanban(scratch.board.id);
    const review = k.columns.find((c) => c.name === "Review")!;
    expect(review).toBeTruthy();
    expect(review).toMatchObject({ is_default: true, is_closed_status: true, track_time: true });
    added = review.id;

    await page.reload();
    await expect(column(page, review.id)).toBeVisible();
    await column(page, review.id).getByTestId("kanban-column-menu").click();
    await page.getByRole("menuitem", { name: "Edit column", exact: true }).click();
    await expect(sheet(page).locator("#kanban-column-name")).toHaveValue("Review");
    for (const key of ["is_default", "is_closed_status", "track_time"]) {
      await expect(flag(page, key)).toHaveAttribute("aria-checked", "true");
    }
  });

  test("editing a column keeps track_time", async ({ context }) => {
    test.skip(!added, "needs the column from the previous test");
    const page = await openBoardIn(context, "admin", scratch.board.id);
    await column(page, added!).getByTestId("kanban-column-menu").click();
    await page.getByRole("menuitem", { name: "Edit column", exact: true }).click();
    await sheet(page).locator("#kanban-column-name").fill("Review 2");
    await sheet(page).locator('button[type="submit"]').click();
    await expect(column(page, added!).locator("h3")).toHaveText("Review 2");

    const k = await kanban(scratch.board.id);
    expect(k.columns.find((c) => c.id === added)).toMatchObject({ name: "Review 2", track_time: true, is_closed_status: true });
  });

  test("reorder columns by dragging the header, then reload", async ({ context }) => {
    test.skip(!added, "needs the column from the previous test");
    const page = await openBoardIn(context, "admin", scratch.board.id);
    const before = (await kanban(scratch.board.id)).columns.map((c) => c.id);
    expect(before[before.length - 1]).toBe(added);

    // Keyboard DnD on the column header (RM8): lift, three steps left, drop.
    const header = column(page, added!).getByTestId("kanban-column-header");
    await header.focus();
    await page.keyboard.press("Space");
    for (let i = 0; i < before.length - 1; i++) {
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(120);
    }
    await page.keyboard.press("Space");

    await expect.poll(async () => (await kanban(scratch.board.id)).columns[0].id).toBe(added);
    await page.reload();
    await expect(page.getByTestId("kanban-column").first()).toHaveAttribute("data-column-id", String(added));
  });

  test("delete an empty column", async ({ context }) => {
    test.skip(!added, "needs the column from the previous test");
    const page = await openBoardIn(context, "admin", scratch.board.id);
    await column(page, added!).getByTestId("kanban-column-menu").click();
    await page.getByRole("menuitem", { name: "Delete column" }).click();
    const dialog = page.getByTestId("delete-column-dialog");
    await dialog.getByRole("button", { name: "Delete column" }).click();

    await expect(column(page, added!)).toHaveCount(0);
    await expect(page.getByText("Column deleted")).toBeVisible();
    expect((await kanban(scratch.board.id)).columns.some((c) => c.id === added)).toBe(false);
  });

  test("deleting a non-empty column shows the error", async ({ context }) => {
    const doing = scratch.cols[1].id;
    const page = await openBoardIn(context, "admin", scratch.board.id);
    await column(page, doing).getByTestId("kanban-column-menu").click();
    await page.getByRole("menuitem", { name: "Delete column" }).click();
    const dialog = page.getByTestId("delete-column-dialog");
    await dialog.getByRole("button", { name: "Delete column" }).click();

    await expect(dialog.getByRole("alert")).toContainText("Move the tickets out");
    await page.keyboard.press("Escape");
    await expect(column(page, doing)).toBeVisible();
    expect((await kanban(scratch.board.id)).columns.some((c) => c.id === doing)).toBe(true);
  });

  test("agent has no column menu and no Add column", async ({ context }) => {
    const page = await openBoardIn(context, "agent", fx().boards.support.id);
    await expect(page.getByTestId("kanban-column").first()).toBeVisible();
    await expect(page.getByTestId("kanban-column-menu")).toHaveCount(0);
    await expect(page.getByTestId("kanban-add-column")).toHaveCount(0);
    // Agents can still add tickets (create_tickets).
    await expect(page.getByTestId("kanban-column-add").first()).toBeVisible();
  });
});
