/**
 * Permissions (plan FE-16 §5.2), against the local B2 backend. The board part
 * is turned on by FE-INT in W1 (FE-03, FE-06, FE-07); the detail part waits
 * for the new detail page (FE-09, FE-12, W3).
 */
import { expect, test } from "@playwright/test";
import { APP } from "./fixtures/env";
import { resetFixtures, signIn } from "./fixtures/session";
import { fx, openBoardIn } from "./fixtures/board";

test.describe("Permissions", () => {
  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(() => {
    resetFixtures();
  });

  test("agent: the Restricted board is not in the switcher", async ({ context }) => {
    const { support, restricted, open } = fx().boards;
    const page = await openBoardIn(context, "agent", support.id);
    await page.getByTestId("board-switcher").click();
    const menu = page.getByTestId("board-switcher-menu");
    await expect(menu.getByRole("menuitem", { name: new RegExp(open.name) })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: new RegExp(restricted.name) })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId(`sidebar-board-${restricted.id}`)).toHaveCount(0);
  });

  test("agent: a direct URL to the Restricted board falls back to an accessible board", async ({ context, page }) => {
    const { restricted } = fx().boards;
    const restrictedTicket = fx().tickets["E2E-011"].id;
    await signIn(context, "agent", "en", { theme: "light" });
    const kanbanCalls: string[] = [];
    page.on("request", (r) => {
      if (/\/kanban_board\//.test(r.url())) kanbanCalls.push(r.url());
    });
    await page.goto(`${APP}/tickets?board=${restricted.id}`);

    await expect(page).not.toHaveURL(new RegExp(`[?&]board=${restricted.id}(&|$)`), { timeout: 45_000 });
    await expect(page.getByTestId("ticket-card").first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("board-switcher")).not.toContainText(restricted.name);
    await expect(page.locator(`[data-ticket-id="${restrictedTicket}"]`)).toHaveCount(0);
    expect(kanbanCalls.filter((u) => u.includes(`/boards/${restricted.id}/`))).toEqual([]);
  });

  test("admin sees the Restricted board and its ticket", async ({ context }) => {
    const { restricted } = fx().boards;
    const page = await openBoardIn(context, "admin", restricted.id);
    await expect(page.locator(`[data-ticket-id="${fx().tickets["E2E-011"].id}"]`)).toBeVisible();
    await expect(page.getByTestId(`sidebar-board-${restricted.id}`)).toHaveAttribute("data-active", "true");
  });

  // W3: the new detail page (FE-09 shell, FE-12 rail).
  test.fixme("a direct URL to a Restricted ticket shows the 404 state", async () => {});
  test.fixme("an Open-board ticket opens (E2)", async () => {});
  test.fixme("the groups row is hidden", async () => {});
  test.fixme("payment Record is hidden", async () => {});
  test.fixme("Transfer is hidden without can_transfer", async () => {});
  test.fixme("without the social feature: customer row, section and Saved reply are hidden", async () => {});
});
