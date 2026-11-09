/**
 * Board, switcher and sidebar (plan FE-16 §5.2), against the local B2 backend.
 * Turned on by FE-INT in W1 (FE-03 shell, FE-04 admin dialogs, FE-06 screen).
 */
import { expect, test } from "@playwright/test";
import { APP } from "./fixtures/env";
import { resetFixtures, signIn } from "./fixtures/session";
import { api, boardsLite, deleteBoardQuietly, fx, gotoBoard, openBoardIn } from "./fixtures/board";

test.describe("Board, switcher and sidebar", () => {
  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(() => {
    resetFixtures();
  });

  test("loads the default board", async ({ context, page }) => {
    await signIn(context, "admin", "en", { theme: "light" });
    await page.goto(`${APP}/tickets`);

    const support = fx().boards.support;
    await expect(page.getByTestId("kanban-board")).toHaveAttribute("data-board-id", String(support.id), { timeout: 45_000 });
    await expect(page.getByTestId("board-switcher")).toContainText(support.name);
    await expect(page.locator(`[data-testid="ticket-card"][data-ticket-id="${fx().tickets["E2E-001"].id}"]`)).toBeVisible();
  });

  test("switching board updates the URL and the sidebar active state", async ({ context }) => {
    const { support, sales } = fx().boards;
    const page = await openBoardIn(context, "admin", support.id);

    await expect(page.getByTestId(`sidebar-board-${support.id}`)).toHaveAttribute("data-active", "true");
    await page.getByTestId("board-switcher").click();
    const menu = page.getByTestId("board-switcher-menu");
    await expect(menu.locator('[data-selected="true"]')).toContainText(support.name);
    await menu.getByRole("menuitem", { name: new RegExp(sales.name) }).click();

    await expect(page).toHaveURL(new RegExp(`[?&]board=${sales.id}(&|$)`));
    await expect(page.getByTestId("kanban-board")).toHaveAttribute("data-board-id", String(sales.id));
    await expect(page.getByTestId(`sidebar-board-${sales.id}`)).toHaveAttribute("data-active", "true");
    await expect(page.getByTestId(`sidebar-board-${support.id}`)).toHaveAttribute("data-active", "false");
    await expect(page.getByTestId("board-switcher")).toContainText(sales.name);
  });

  test("sidebar nested list shows counts and the chevron toggles it", async ({ context }) => {
    const page = await openBoardIn(context, "admin", fx().boards.support.id);
    const rows = await boardsLite("admin");

    const list = page.getByTestId("sidebar-boards");
    await expect(list).toBeVisible();
    for (const b of rows.filter((r) => r.name.startsWith("E2E "))) {
      const row = page.getByTestId(`sidebar-board-${b.id}`);
      await expect(row).toContainText(b.name);
      await expect(row).toContainText(String(b.open_count));
    }

    const toggle = page.getByTestId("sidebar-boards-toggle");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(list).toBeHidden();
    await toggle.click();
    await expect(list).toBeVisible();
  });

  test.describe.serial("admin board lifecycle", () => {
    let boardId: number | undefined;
    const name = `E2E Local ${Date.now().toString(36)}`;

    test.afterAll(async () => {
      await deleteBoardQuietly(boardId);
      // Put the fixture default back whatever happened above.
      await api("POST", `/api/boards/${fx().boards.support.id}/set_default/`).catch(() => undefined);
    });

    test("admin creates a board with a colour", async ({ context }) => {
      const page = await openBoardIn(context, "admin", fx().boards.support.id);
      await page.getByTestId("sidebar-new-board").click();

      await page.locator("#board-create-name").fill(name);
      const swatches = page.getByRole("radiogroup", { name: "Colour" }).getByRole("radio");
      const chosen = (await swatches.nth(3).getAttribute("aria-label"))!;
      await swatches.nth(3).click();
      await expect(swatches.nth(3)).toHaveAttribute("aria-checked", "true");
      await page.getByRole("button", { name: "Create board" }).click();

      await expect(page.getByText("Board created")).toBeVisible();
      const created = (await boardsLite("admin")).find((b) => b.name === name);
      expect(created, "board exists on the server").toBeTruthy();
      boardId = created!.id;
      expect(created!.color.toLowerCase()).toBe(chosen.toLowerCase());
      await expect(page).toHaveURL(new RegExp(`[?&]board=${boardId}(&|$)`));
      await expect(page.getByTestId(`sidebar-board-${boardId}`)).toContainText(name);
    });

    test("Manage users tabs save", async ({ context }) => {
      test.skip(!boardId, "needs the board from the previous test");
      const { agent, agent2 } = fx().users;
      const page = await openBoardIn(context, "admin", boardId!, { waitFor: "screen" });
      await page.getByTestId("board-switcher").click();
      await page.getByTestId("board-switcher-menu").locator('[data-action="users"]').click();

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Nobody is selected, so every user can see this board.")).toBeVisible();

      const pick = async (tab: string, search: string) => {
        await dialog.getByRole("tab", { name: new RegExp(tab) }).click();
        const panel = dialog.getByRole("tabpanel");
        await panel.getByRole("textbox").fill(search);
        await panel.getByRole("checkbox").first().click();
        await expect(panel.getByRole("checkbox").first()).toHaveAttribute("data-state", "checked");
      };
      await pick("Order users", agent2.email);
      await pick("Board users", agent.email);
      const groupName = "Support";
      await pick("Board groups", groupName);
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByText("Access updated")).toBeVisible();

      const detail = await api<{ order_users: unknown[]; board_users: unknown[]; board_groups: unknown[] }>("GET", `/api/boards/${boardId}/`);
      const idsOf = (xs: unknown[]) => xs.map((x) => (typeof x === "object" && x ? (x as { id: number }).id : x));
      expect(idsOf(detail.order_users)).toEqual([agent2.id]);
      expect(idsOf(detail.board_users)).toEqual([agent.id]);
      expect(detail.board_groups).toHaveLength(1);
    });

    test("Telegram tab renders and Test shows an error toast offline", async ({ context }) => {
      test.skip(!boardId, "needs the board from the previous test");
      const page = await openBoardIn(context, "admin", boardId!, { waitFor: "screen" });
      // Offline: the test request never leaves the browser.
      await page.route("**/telegram_connection/test/**", (route) => route.abort("internetdisconnected"));
      await page.getByTestId("board-switcher").click();
      await page.getByTestId("board-switcher-menu").locator('[data-action="settings"]').click();

      const dialog = page.getByRole("dialog");
      await dialog.getByRole("tab", { name: "Telegram" }).click();
      await expect(dialog.getByTestId("telegram-status")).toHaveText("Not connected");
      await expect(dialog.getByText("How to connect")).toBeVisible();
      await dialog.locator("#telegram-token").fill("123456:local-e2e-not-a-token");
      await dialog.locator("#telegram-chat").fill("-1000000000");
      await dialog.getByRole("button", { name: "Send test message" }).click();
      await expect(page.getByText("Test message failed").first()).toBeVisible();
    });

    test("Board settings: set default, then delete the board", async ({ context }) => {
      test.skip(!boardId, "needs the board from the previous test");
      const page = await openBoardIn(context, "admin", boardId!, { waitFor: "screen" });
      await page.getByTestId("board-switcher").click();
      await page.getByTestId("board-switcher-menu").locator('[data-action="settings"]').click();

      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Make default" }).click();
      await expect(page.getByText(`“${name}” is now the default board`)).toBeVisible();
      await expect.poll(async () => (await api<{ id: number }>("GET", "/api/boards/default/")).id).toBe(boardId);

      await dialog.getByRole("button", { name: "Delete board" }).click();
      const confirm = page.getByRole("alertdialog");
      await expect(confirm).toContainText(`Delete “${name}”?`);
      await confirm.getByRole("button", { name: "Delete board" }).click();
      await expect(page.getByText("Board deleted")).toBeVisible();

      await expect.poll(async () => (await boardsLite("admin")).some((b) => b.id === boardId)).toBe(false);
      await expect(page).not.toHaveURL(new RegExp(`[?&]board=${boardId}(&|$)`));
      await expect(page.getByTestId(`sidebar-board-${boardId}`)).toHaveCount(0);
      boardId = undefined;
    });
  });

  test("agent sees no admin menu entries", async ({ context }) => {
    const page = await openBoardIn(context, "agent", fx().boards.support.id);
    await page.getByTestId("board-switcher").click();
    const menu = page.getByTestId("board-switcher-menu");
    await expect(menu.getByRole("menuitem").first()).toBeVisible();
    await expect(menu.locator("[data-action]")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("sidebar-new-board")).toHaveCount(0);
    await expect(page.getByTestId("kanban-column-menu")).toHaveCount(0);
  });

  test("E2E Empty board shows the no-columns state (admin sees Add column, agent doesn't)", async ({ browser }) => {
    const empty = fx().boards.empty;
    for (const who of ["admin", "agent"] as const) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await signIn(context, who, "en", { theme: "light" });
      const page = await context.newPage();
      await gotoBoard(page, empty.id, { waitFor: "screen" });
      // The screen owns the zero-columns state (FE-06, DC39); the board's own copy never mounts here.
      await expect(page.getByTestId("tickets-screen")).toHaveAttribute("data-state", "no-columns");
      await expect(page.getByText("This board has no columns")).toBeVisible();
      await expect(page.getByRole("button", { name: "Add column" })).toHaveCount(who === "admin" ? 1 : 0);
      if (who === "admin") {
        await page.getByRole("button", { name: "Add column" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
      }
      await context.close();
    }
  });

  test("agent with open-board-only access loads that board", async ({ context }) => {
    // staff6 (viewer) has no board membership: E2E Open is visible only because it is open.
    const { open, support, restricted } = fx().boards;
    const page = await openBoardIn(context, "viewer", open.id);
    await expect(page.getByTestId("kanban-board")).toHaveAttribute("data-board-id", String(open.id));
    await expect(page.locator(`[data-testid="ticket-card"][data-ticket-id="${fx().tickets["E2E-012"].id}"]`)).toBeVisible();
    await expect(page.getByTestId(`sidebar-board-${support.id}`)).toHaveCount(0);
    await expect(page.getByTestId(`sidebar-board-${restricted.id}`)).toHaveCount(0);
  });
});
