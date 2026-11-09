/**
 * Permissions (plan FE-16 §5.2), against the local B2 backend. The board part
 * is turned on by FE-INT in W1 (FE-03, FE-06, FE-07); the detail part in W3
 * (FE-09, FE-12, FE-INT).
 */
import { expect, test } from "@playwright/test";
import { APP } from "./fixtures/env";
import { resetFixtures, signIn } from "./fixtures/session";
import { api, fx, openBoardIn } from "./fixtures/board";
import { openDetail, railRow } from "./fixtures/detail";

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
  test("a direct URL to a Restricted ticket shows the 404 state", async ({ context, page }) => {
    const restrictedTicket = fx().tickets["E2E-011"].id;
    await signIn(context, "agent", "en", { theme: "light" });
    await page.goto(`${APP}/tickets/${restrictedTicket}`);
    const root = page.getByTestId("ticket-detail");
    await expect(root).toHaveAttribute("data-state", "not-found", { timeout: 45_000 });
    await expect(root).toContainText("This ticket doesn't exist or you can't see it");
    await expect(root).not.toContainText(fx().tickets["E2E-011"].title);
    await expect(root.getByRole("link", { name: "Back to tickets" })).toBeVisible();
  });

  test("an Open-board ticket opens (E2)", async ({ context }) => {
    const t = fx().tickets["E2E-012"]; // E2E Open board: no explicit access for the agent
    const page = await openDetail(context, "agent", t.id, "en");
    await expect(page.locator('[data-slot="detail-main"]')).toContainText(t.title);
    await expect(railRow(page, "Status")).toBeVisible();
    await expect(page.getByTestId("detail-back")).toHaveAttribute("href", `/tickets?board=${fx().boards.open.id}`);
  });
  // FE-12 (skips itself while flags.detailRedesignEnabled is off).
  test("the groups row is hidden", async ({ context }) => {
    const page = await openDetail(context, "agent", fx().tickets["E2E-001"].id, "en");
    await expect(railRow(page, "Status")).toBeVisible();
    await expect(railRow(page, "Groups")).toHaveCount(0);
  });

  test("payment Record is hidden", async ({ context }) => {
    const page = await openDetail(context, "agent", fx().tickets["E2E-010"].id, "en");
    await expect(page.getByTestId("payment-block")).toBeVisible();
    await expect(page.getByTestId("record-payment")).toHaveCount(0);
  });
  test("Transfer is hidden without can_transfer", async ({ context }) => {
    // The agent can see the Open board's ticket but not transfer it (viewer_permissions.can_transfer=false).
    const id = fx().tickets["E2E-012"].id;
    const perms = (await api<{ viewer_permissions: Record<string, boolean> }>("GET", `/api/tickets/${id}/`, undefined, "agent")).viewer_permissions;
    expect(perms.can_transfer).toBe(false);
    const page = await openDetail(context, "agent", id, "en");
    await page.getByTestId("detail-more").click();
    const menu = page.getByTestId("detail-menu");
    await expect(menu.getByTestId("detail-menu-history")).toBeVisible();
    await expect(menu.locator('[data-testid^="transfer-board-"]')).toHaveCount(0);
    await expect(menu).not.toContainText("Transfer to board");
    await page.keyboard.press("Escape");
    // The rail has no Board row either (DC19).
    await expect(railRow(page, "Board")).toHaveCount(0);
  });
  test("without the social feature: customer row, section and Saved reply are hidden", async ({ context }) => {
    const variant = (fx() as unknown as { variant?: { agent_without_social?: boolean } }).variant;
    test.skip(!variant?.agent_without_social, "the fixtures' agent has the social feature (variant.agent_without_social is false)");
    const page = await openDetail(context, "agent", fx().tickets["E2E-006"].id, "en");
    await expect(railRow(page, "Status")).toBeVisible();
    await expect(railRow(page, "Customer")).toHaveCount(0);
    await expect(page.getByTestId("customer-section")).toHaveCount(0);
    await expect(page.getByTestId("composer-saved-reply")).toHaveCount(0);
  });
});
