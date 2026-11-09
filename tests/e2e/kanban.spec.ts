/**
 * E2E tests for the kanban board page (mocked API, plan FE-07).
 * Frontend counterpart of backend test_board_views.py / test_ticket_views.py.
 * Flow: lite boards (A1) → lite kanban (A2) → columns and cards.
 *
 * The board, column and card DOM is FE-07's (`_components/board/*`); the
 * screen-level states (no boards, boards error) are FE-06's
 * `tickets-screen.tsx` and are asserted by their catalog text.
 */
import { test, expect, type Page } from "@playwright/test";
import { mockAuthSync, mockDashboard, mockTenantConfig } from "./fixtures/api-mocks";
import {
  mockBoardsList,
  mockBoardsEmpty,
  mockBoardsError,
  mockKanbanBoard,
  mockKanbanBoardError,
  mockBoardsDefault,
  mockProfile,
  MOCK_BOARD,
  MOCK_COLUMNS,
  MOCK_TICKETS,
  MOCK_AGENT_PROFILE,
} from "./fixtures/ticket-mocks";

const column = (page: Page, id: number) => page.locator(`[data-testid="kanban-column"][data-column-id="${id}"]`);
const card = (page: Page, id: number) => page.locator(`[data-testid="ticket-card"][data-ticket-id="${id}"]`);

test.describe("Kanban Board", () => {
  test.beforeEach(async ({ page, context, baseURL }) => {
    // The app defaults to Georgian; these assertions use the English catalog.
    await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: baseURL ?? "http://localhost:3000" }]);
    await mockAuthSync(page);
    await mockTenantConfig(page);
    await mockDashboard(page);

    // Logged-in staff user with tenant context.
    await page.addInitScript(() => {
      localStorage.setItem("dev_tenant", "test-tenant");
      localStorage.setItem("echodesk_auth_token", "test-token");
      localStorage.setItem(
        "echodesk_user_data",
        JSON.stringify({ id: 1, email: "admin@test.com", role: "admin", is_staff: true, is_superuser: true }),
      );
    });
  });

  test("loads the lite boards and the board's kanban", async ({ page }) => {
    await mockBoardsDefault(page);
    const kanban = page.waitForRequest((r) => /\/api\/boards\/1\/kanban_board\/\?.*lite=1/.test(r.url()));

    await page.goto("/tickets");

    await kanban;
    await expect(page.getByTestId("kanban-board")).toBeVisible();
    await expect(page.getByText(MOCK_BOARD.name).first()).toBeVisible();
  });

  test("displays kanban columns with correct names", async ({ page }) => {
    await mockBoardsDefault(page);

    await page.goto("/tickets");

    for (const col of MOCK_COLUMNS) {
      await expect(column(page, col.id).getByRole("heading", { name: col.name })).toBeVisible();
    }
  });

  test("displays tickets in correct columns", async ({ page }) => {
    await mockBoardsDefault(page);

    await page.goto("/tickets");

    for (const ticket of MOCK_TICKETS) {
      await expect(column(page, ticket.column_id).locator(`[data-ticket-id="${ticket.id}"]`)).toContainText(ticket.title);
    }
  });

  test("the column header count equals the rendered cards", async ({ page }) => {
    await mockBoardsDefault(page);

    await page.goto("/tickets");

    for (const col of MOCK_COLUMNS) {
      const rendered = MOCK_TICKETS.filter((t) => t.column_id === col.id).length;
      await expect(column(page, col.id).getByTestId("kanban-column-count")).toHaveText(String(rendered));
      await expect(column(page, col.id).getByTestId("ticket-card")).toHaveCount(rendered);
    }
    // "Done" reports tickets_count 7 on the server, but renders none.
    await expect(column(page, 3).getByTestId("kanban-column-empty")).toBeVisible();
  });

  test("clicking a ticket opens its detail page", async ({ page }) => {
    await mockBoardsDefault(page);
    await page.route(/\/api\/tickets\/1\/$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...MOCK_TICKETS[0], description: "Full description", comments: [], checklist_items: [] }),
      }),
    );

    await page.goto("/tickets");
    await card(page, 1).getByTestId("card-title").click();

    await expect(page).toHaveURL(/\/tickets\/1(\?|$)/);
  });

  test("empty state when there are no boards", async ({ page }) => {
    await mockBoardsEmpty(page);
    await mockProfile(page);

    await page.goto("/tickets");

    await expect(page.getByText(/no boards yet|create.*board/i).first()).toBeVisible();
  });

  test("error state when boards fail to load", async ({ page }) => {
    await mockBoardsError(page);
    await mockProfile(page);

    await page.goto("/tickets");

    await expect(page.getByText("Couldn't load boards")).toBeVisible();
  });

  test("error state when the kanban fails to load", async ({ page }) => {
    await mockBoardsList(page);
    await mockKanbanBoardError(page);
    await mockProfile(page);

    await page.goto("/tickets");

    await expect(page.getByText("Couldn't load this board")).toBeVisible();
  });

  test("ticket cards show the translated priority pill", async ({ page }) => {
    await mockBoardsDefault(page);

    await page.goto("/tickets");

    await expect(card(page, 1).locator('[data-slot="priority-pill"]')).toHaveText("High");
    await expect(card(page, 2).locator('[data-slot="priority-pill"]')).toHaveText("Medium");
    await expect(card(page, 3).locator('[data-slot="priority-pill"]')).toHaveText("Low");
  });

  test("ticket cards show assignee avatars or the unassigned circle", async ({ page }) => {
    await mockBoardsDefault(page);

    await page.goto("/tickets");

    await expect(card(page, 1).getByRole("img", { name: "Test Admin" })).toHaveText("TA");
    await expect(card(page, 2).getByRole("img", { name: "Unassigned" })).toBeVisible();
  });

  test("ticket cards show tag labels", async ({ page }) => {
    await mockBoardsDefault(page);

    await page.goto("/tickets");

    await expect(card(page, 1).locator('[data-slot="label-chip"]')).toHaveText("bug");
    await expect(card(page, 2).locator('[data-slot="label-chip"]')).toHaveText("feature");
  });

  test("ticket cards show the due chip, checklist and counts", async ({ page }) => {
    await mockBoardsDefault(page);

    await page.goto("/tickets");

    const first = card(page, 1);
    await expect(first.locator('[data-slot="due-chip"]')).toHaveAttribute("data-overdue", "true");
    await expect(first.locator('[data-slot="due-chip"]')).toContainText("Overdue");
    await expect(first.locator('[data-slot="checklist-count"]')).toHaveText("1/4");
    await expect(first.getByTestId("card-comments")).toHaveText("2");
    await expect(first.getByTestId("card-attachments")).toHaveText("1");
    // No checklist and no attachments: nothing rendered; the comment count always is.
    await expect(card(page, 2).locator('[data-slot="checklist-count"]')).toHaveCount(0);
    await expect(card(page, 2).getByTestId("card-attachments")).toHaveCount(0);
    await expect(card(page, 2).getByTestId("card-comments")).toHaveText("0");
  });

  test("empty boards for non-staff without boards", async ({ page }) => {
    await mockBoardsEmpty(page);
    await mockProfile(page, MOCK_AGENT_PROFILE);
    await page.addInitScript(() => {
      localStorage.setItem(
        "echodesk_user_data",
        JSON.stringify({ id: 2, email: "user@test.com", role: "user", is_staff: false, is_superuser: false }),
      );
    });

    await page.goto("/tickets");

    await expect(page.getByText(/don't have access to any boards|no boards yet/i).first()).toBeVisible();
    await expect(page.getByTestId("kanban-board")).toHaveCount(0);
  });

  test("uses the stored board when the URL has none", async ({ page }) => {
    await mockBoardsList(page);
    await mockKanbanBoard(page);
    await mockProfile(page);
    await page.addInitScript(() => localStorage.setItem("echodesk_selected_board_id", "1"));
    const kanban = page.waitForRequest((r) => /\/api\/boards\/1\/kanban_board\//.test(r.url()));

    await page.goto("/tickets");

    await kanban;
    await expect(page.getByTestId("kanban-board")).toHaveAttribute("data-board-id", "1");
    expect(await page.evaluate(() => localStorage.getItem("echodesk_selected_board_id"))).toBe("1");
  });
});
