/**
 * Ticket edit on the new detail page (plan FE-16 §5.2, the two FE-10 rows of
 * ticket-crud): title and rich description round trip, long titles wrap.
 * Kept in its own file so FE-14's create flows in ticket-crud.spec.ts don't
 * conflict; FE-INT can fold it back. Needs `flags.detailRedesignEnabled`.
 */
import { expect, test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";
import { api } from "./fixtures/board";
import { createScratchTicket, deleteTicketQuietly, getTicket, gotoDetail, openDetailIn } from "./fixtures/detail-main";

let scratchId: number | undefined;
const ticketId = () => scratchId!;

test.describe("Ticket edit (detail)", () => {
  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(async () => {
    resetFixtures();
    // A scratch ticket on the seed board: concurrent fixture re-seeds can't remove it.
    scratchId = await createScratchTicket(`E2E edit scratch ${Date.now()}`);
  });
  test.afterAll(async () => {
    await deleteTicketQuietly(scratchId);
  });

  test("edit the title and rich description; bold survives a reload", async ({ context }) => {
    const page = await openDetailIn(context, "admin", ticketId());
    const title = page.getByRole("textbox", { name: "Title" });
    await title.fill("E2E edited title");
    await title.press("Enter");
    await expect.poll(async () => (await getTicket(ticketId())).title).toBe("E2E edited title");

    await page.getByRole("button", { name: "Edit the description" }).click();
    const editor = page.locator('[data-slot="detail-description-editor"] .ProseMirror');
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("Plain then ");
    await page.keyboard.press("ControlOrMeta+b");
    await page.keyboard.type("bold words");
    await page.keyboard.press("ControlOrMeta+b");
    await page.keyboard.press("ControlOrMeta+Enter");
    await expect(page.locator('[data-slot="detail-description-editor"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="detail-description-html"] strong')).toHaveText("bold words");

    const server = await getTicket(ticketId());
    expect(server.description_format).toBe("html");
    expect(server.description).toContain("<strong>bold words</strong>");

    await page.reload();
    await gotoDetail(page, ticketId());
    await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue("E2E edited title");
    await expect(page.locator('[data-slot="detail-description-html"] strong')).toHaveText("bold words");
  });

  test("a 300-character title wraps", async ({ context }) => {
    // The backend caps titles at 255 characters (CharField max_length=255),
    // so the longest storable title stands in for the plan's 300.
    const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ").padEnd(255, "x").slice(0, 255);
    await api("PATCH", `/api/tickets/${ticketId()}/`, { title: long });
    const page = await openDetailIn(context, "admin", ticketId());
    await page.setViewportSize({ width: 390, height: 844 });
    const title = page.getByRole("textbox", { name: "Title" });
    await expect(title).toHaveValue(long);
    await expect
      .poll(() => title.evaluate((el: HTMLTextAreaElement) => ({ fits: el.scrollHeight <= el.clientHeight + 1, noX: el.scrollWidth <= el.clientWidth, lines: Math.round(el.clientHeight / 28) })))
      .toMatchObject({ fits: true, noX: true });
    expect(await title.evaluate((el) => el.clientHeight)).toBeGreaterThan(28 * 3);
    expect(await page.evaluate(() => document.scrollingElement!.scrollWidth <= 390)).toBe(true);
  });
});
