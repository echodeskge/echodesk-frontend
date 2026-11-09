/**
 * Checklist (plan FE-16 §5.2) on the new detail page, against the local B2
 * backend. Works on a scratch ticket shaped like the E2E-004 fixture (5 items,
 * 2 done) on the seed board, so concurrent fixture re-seeds by other local
 * runs can't pull it away mid-test. Turned on with FE-10; needs
 * `flags.detailRedesignEnabled` (FE-INT flips it in W3).
 */
import { expect, test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";
import { checklistTexts, createScratchTicket, deleteTicketQuietly, getTicket, gotoDetail, openDetailIn } from "./fixtures/detail-main";

let scratchId: number | undefined;
const ticketId = () => scratchId!;
const rows = (page: import("@playwright/test").Page) => page.locator('[data-slot="checklist-row"]');
const bar = (page: import("@playwright/test").Page) => page.locator('[data-slot="checklist-progress-bar"]');

test.describe("Checklist", () => {
  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(async () => {
    resetFixtures();
    scratchId = await createScratchTicket(`E2E checklist scratch ${Date.now()}`, [
      { text: "Order hardware", done: true },
      { text: "Create accounts", done: true },
      { text: "Install software" },
      { text: "Train staff" },
      { text: "Sign off" },
    ]);
  });
  test.afterAll(async () => {
    await deleteTicketQuietly(scratchId);
  });

  test("add with Enter", async ({ context }) => {
    const page = await openDetailIn(context, "admin", ticketId());
    const before = await rows(page).count();
    const add = page.getByRole("textbox", { name: "Add an item" });
    await add.fill("E2E added item");
    await add.press("Enter");
    await expect(add).toHaveValue("");
    await expect(rows(page)).toHaveCount(before + 1);
    await expect(rows(page).last()).toContainText("E2E added item");
    await expect.poll(async () => (await checklistTexts(ticketId())).at(-1)).toBe("E2E added item");
    await page.reload();
    await gotoDetail(page, ticketId());
    await expect(rows(page).last()).toContainText("E2E added item");
  });

  test("toggle updates the progress bar width", async ({ context }) => {
    const page = await openDetailIn(context, "admin", ticketId());
    const t = await getTicket(ticketId());
    const total = t.checklist_items.length;
    const done = t.checklist_items.filter((i) => i.is_checked).length;
    const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
    await expect(bar(page)).toHaveAttribute("style", new RegExp(`width: ${pct(done)}`));

    const row = rows(page).filter({ hasText: "Install software" });
    await row.getByRole("checkbox").click();
    await expect(row.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
    await expect(bar(page)).toHaveAttribute("style", new RegExp(`width: ${pct(done + 1)}`));
    await expect(page.locator('[data-slot="checklist-summary"]')).toHaveText(`${done + 1}/${total}`);
    await expect.poll(async () => (await getTicket(ticketId())).checklist_items.find((i) => i.text === "Install software")?.is_checked).toBe(true);
    // "checked by" tooltip after the server answers.
    await expect(row).toHaveAttribute("title", /Checked by/);
  });

  test("remove plus undo", async ({ context }) => {
    const page = await openDetailIn(context, "admin", ticketId());
    const before = await rows(page).count();
    await rows(page).filter({ hasText: "Train staff" }).getByRole("button", { name: "Remove item" }).click();
    await expect(rows(page)).toHaveCount(before - 1);
    await expect.poll(async () => (await checklistTexts(ticketId())).includes("Train staff")).toBe(false);
    const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Item removed" });
    await expect(toast).toBeVisible();
    await toast.getByRole("button", { name: "Undo" }).click();
    await expect(rows(page)).toHaveCount(before);
    await expect(rows(page).filter({ hasText: "Train staff" })).toHaveCount(1);
    await expect.poll(async () => (await checklistTexts(ticketId())).includes("Train staff")).toBe(true);
  });

  test("reorder by drag", async ({ context }) => {
    const page = await openDetailIn(context, "admin", ticketId());
    const server = await checklistTexts(ticketId());
    const last = server.at(-1)!;
    // Keyboard drag (@hello-pangea, RM8): focus the handle, Space, arrows, Space.
    // The item text is the drag handle (@hello-pangea sets data-rfd-drag-handle-*).
    const handle = page.locator('[data-slot="checklist-text"][data-rfd-drag-handle-draggable-id]', { hasText: last });
    await expect(handle).toHaveCount(1);
    await handle.focus();
    await page.keyboard.press("Space");
    for (let i = 0; i < server.length - 1; i++) await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Space");
    await expect(rows(page).first()).toContainText(last);
    await expect.poll(async () => (await checklistTexts(ticketId()))[0]).toBe(last);
    await page.reload();
    await gotoDetail(page, ticketId());
    await expect(rows(page).first()).toContainText(last);
  });

  test("collapse and expand", async ({ context }) => {
    const page = await openDetailIn(context, "admin", ticketId());
    const header = page.getByRole("button", { name: /^Checklist/ });
    await expect(header).toHaveAttribute("aria-expanded", "true");
    await header.click();
    await expect(header).toHaveAttribute("aria-expanded", "false");
    await expect(rows(page)).toHaveCount(0);
    await header.click();
    await expect(header).toHaveAttribute("aria-expanded", "true");
    await expect(rows(page).first()).toBeVisible();
  });
});
