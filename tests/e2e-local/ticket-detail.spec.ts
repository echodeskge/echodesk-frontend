/**
 * Ticket detail (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until FE-09, FE-12 (W3) lands; FE-INT removes the fixme per wave.
 * FE-12's tests (rail pickers, ka due date, Open client) skip themselves while
 * flags.detailRedesignEnabled is off (see fixtures/detail.ts).
 */
import { expect, test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";
import { api, fx } from "./fixtures/board";
import { getTicket, openDetail, pickerOption, railRow, railTrigger } from "./fixtures/detail";

/** Fixture ids beyond the board shape (prepare_tickets_e2e). */
const extra = () => fx() as unknown as { customer: { id: number; name: string }; groups: Record<string, number> };

test.describe("Ticket detail", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("status track move (agent into a closed column)", async () => {});
  // FE-12: every rail picker writes through and the server agrees.
  test("every rail picker", async ({ context }) => {
    const id = fx().tickets["E2E-003"].id; // unassigned, Support board, no labels
    // Idempotent start (also when E2E_SKIP_RESET=1 reuses the data).
    await api("PATCH", `/api/tickets/${id}/`, {
      column_id: fx().boards.support.columns.new,
      priority: "medium",
      assigned_user_ids: [],
      assigned_group_ids: [],
      tag_ids: [],
      customer_id: null,
      due_date: null,
    });
    const page = await openDetail(context, "admin", id, "en");

    // Status: another column of the board → move_to_column.
    const before = await getTicket(id);
    await railTrigger(page, "Status").click();
    await pickerOption(page, /./).filter({ hasNotText: before.column.name }).first().click();
    await expect.poll(async () => (await getTicket(id)).column.id).not.toBe(before.column.id);

    // Priority.
    await railTrigger(page, "Priority").click();
    await pickerOption(page, "Low").click();
    await expect.poll(async () => (await getTicket(id)).priority).toBe("low");

    // Assignees: add the agent, then make them a reviewer.
    const agent = fx().users.agent;
    await railTrigger(page, "Assignees").click();
    await pickerOption(page, agent.email).click();
    await expect.poll(async () => (await getTicket(id)).assignments.map((a) => a.user.id)).toContain(agent.id);
    await page.getByTestId(`assignee-role-${agent.id}`).selectOption("reviewer");
    await expect
      .poll(async () => (await getTicket(id)).assignments.find((a) => a.user.id === agent.id)?.role)
      .toBe("reviewer");
    await page.keyboard.press("Escape");
    await expect(railTrigger(page, "Assignees").locator(`[data-user-id="${agent.id}"]`)).toHaveAttribute("data-role", "reviewer");

    // Groups (staff) with Apply.
    const groupId = extra().groups.support_team;
    await railTrigger(page, "Groups").click();
    await pickerOption(page, /support/i).first().click();
    await page.getByTestId("groups-picker-apply").click();
    await expect.poll(async () => (await getTicket(id)).assigned_groups.map((g) => g.id)).toContain(groupId);

    // Labels with Apply.
    await railTrigger(page, "Labels").click();
    await pickerOption(page, "VIP").click();
    await page.getByTestId("labels-picker-apply").click();
    await expect.poll(async () => (await getTicket(id)).tags.map((t) => t.name)).toContain("VIP");

    // Department: any department, when the tenant has one.
    await railTrigger(page, "Department").click();
    const departments = pickerOption(page, /./).filter({ hasNotText: "None" });
    if ((await departments.count()) > 0) {
      await departments.first().click();
      await expect.poll(async () => (await getTicket(id)).assigned_department).not.toBeNull();
    } else {
      await page.keyboard.press("Escape");
    }

    // Customer: server-side search.
    const customer = extra().customer;
    await page.getByTestId("customer-picker").click();
    await page.getByPlaceholder("Search clients").fill(customer.name);
    await pickerOption(page, customer.name).first().click();
    await expect.poll(async () => (await getTicket(id)).customer?.id).toBe(customer.id);
    await expect(page.getByTestId("customer-section")).toContainText(customer.name);

    // Due date: the hidden native input, then clear.
    await page.getByTestId("due-date-input").fill("2026-12-12", { force: true });
    await expect.poll(async () => (await getTicket(id)).due_date).toBe("2026-12-12");
    await expect(railRow(page, "Due date")).toContainText("Dec 12");
    await page.getByTestId("due-date-clear").click();
    await expect.poll(async () => (await getTicket(id)).due_date).toBeNull();

    // Board: transfer with confirmation, to the first column of Sales.
    const sales = fx().boards.sales;
    await railTrigger(page, "Board").click();
    await pickerOption(page, sales.name).click();
    await page.getByTestId("transfer-dialog").getByRole("button", { name: /transfer/i }).click();
    await expect.poll(async () => (await getTicket(id)).board.id).toBe(sales.id);
  });

  test("Due date displays in ka format", async ({ context }) => {
    const id = fx().tickets["E2E-001"].id;
    await api("PATCH", `/api/tickets/${id}/`, { due_date: "2026-12-12" });
    const page = await openDetail(context, "admin", id, "ka");
    await expect(page.locator('[data-slot="due-date-trigger"]')).toContainText("12 დეკ");
    await expect(page.locator('[data-slot="due-date-trigger"]')).not.toContainText("Dec");
  });
  test.fixme("transfer to another board: the card leaves board A live in a second context and appears in B", async () => {});
  test.fixme("History & transfers lists the transfer", async () => {});
  test.fixme("copy link (clipboard permission granted)", async () => {});
  test.fixme("J/K with filters and x of n, including two tickets with equal positions", async () => {});
  test.fixme("notification deep link /tickets/{id} opens the detail", async () => {});
  test("Open client opens the Clients rail for that client", async ({ context }) => {
    const id = fx().tickets["E2E-006"].id; // has the E2E customer
    const customer = extra().customer;
    const page = await openDetail(context, "admin", id, "en");
    const section = page.getByTestId("customer-section");
    await expect(section).toContainText(customer.name);
    await section.getByTestId("open-client").click();
    await expect(page).toHaveURL(new RegExp(`/social/clients\\?client=${customer.id}$`));
    await expect(page.getByTestId("client-detail-rail")).toContainText(customer.name, { timeout: 30_000 });
  });
});
