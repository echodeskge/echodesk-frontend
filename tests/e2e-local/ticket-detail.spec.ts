/**
 * Ticket detail (plan FE-16 §5.2), against the local B2 backend. FE-12 wrote
 * the rail tests; FE-INT (W3) wrote the shell ones (status track, transfer,
 * history, copy link, J/K, deep link) when the detail flag turned on.
 */
import { expect, test } from "@playwright/test";
import { APP } from "./fixtures/env";
import { resetFixtures, signIn, waitForWs } from "./fixtures/session";
import { api, card, fx, gotoBoard, openBoard } from "./fixtures/board";
import { getTicket, openDetail, pickerOption, railRow, railTrigger } from "./fixtures/detail";

/** Fixture ids beyond the board shape (prepare_tickets_e2e). */
const extra = () => fx() as unknown as { customer: { id: number; name: string }; groups: Record<string, number> };

test.describe("Ticket detail", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test("status track move (agent into a closed column)", async ({ context }) => {
    const { support } = fx().boards;
    const id = fx().tickets["E2E-001"].id; // Support → New; the agent can edit it
    const page = await openDetail(context, "agent", id, "en");
    const track = page.locator('[data-slot="status-track"]');
    await expect(track.locator('[data-slot="status-step"][aria-current="step"]')).toContainText("New");
    // Resolved is the board's closed column; Q1: agents may move into it.
    await track.locator('[data-slot="status-step"]').filter({ hasText: "Resolved" }).click();
    await expect.poll(async () => (await getTicket(id)).column.id).toBe(support.columns.resolved);
    await expect(track.locator('[data-slot="status-step"][aria-current="step"]')).toContainText("Resolved");
    await expect(track.locator('[data-slot="status-step"][data-state="done"]')).toHaveCount(3);
  });
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
    // Options show names; the email is a search keyword.
    await page.locator('[data-slot="property-picker-content"] input').fill(agent.email);
    await expect(pickerOption(page, /./)).toHaveCount(1);
    await pickerOption(page, /./).first().click();
    await expect.poll(async () => (await getTicket(id)).assignments.map((a) => a.user.id)).toContain(agent.id);
    await page.getByTestId(`assignee-role-${agent.id}`).selectOption("reviewer");
    await expect
      .poll(async () => (await getTicket(id)).assignments.find((a) => a.user.id === agent.id)?.role)
      .toBe("reviewer");
    await page.keyboard.press("Escape");
    await expect(railTrigger(page, "Assignees").locator(`[data-user-id="${agent.id}"]`)).toHaveAttribute("data-role", "reviewer");

    // Groups (staff) with Apply.
    const groupId = extra().groups.support_team;
    const groupName = (await api<{ name: string }>("GET", `/api/tenant-groups/${groupId}/`)).name;
    await railTrigger(page, "Groups").click();
    await pickerOption(page, groupName).click();
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
  test("transfer to another board: the card leaves board A live in a second context and appears in B", async ({ browser, context }) => {
    const { support, sales } = fx().boards;
    const id = fx().tickets["E2E-002"].id; // Support → New
    const watcher = await openBoard(browser, "agent2", support.id);
    try {
      await waitForWs(watcher.page, 20_000);
      await expect(card(watcher.page, id)).toBeVisible();

      const page = await openDetail(context, "admin", id, "en");
      await waitForWs(page, 20_000);
      await page.getByTestId("detail-more").click();
      await page.getByTestId(`transfer-board-${sales.id}`).click();
      const dialog = page.getByTestId("transfer-dialog");
      await expect(dialog).toContainText(sales.name);
      await dialog.getByRole("button", { name: /transfer/i }).click();
      await expect.poll(async () => (await getTicket(id)).board.id).toBe(sales.id);

      // Live: the card leaves board A in the other context without a reload.
      await expect(card(watcher.page, id)).toHaveCount(0, { timeout: 15_000 });
      // ...and is on board B.
      await gotoBoard(watcher.page, sales.id);
      await expect(card(watcher.page, id)).toBeVisible();
      // The detail now shows board B's columns.
      await expect(page.getByTestId("detail-back")).toHaveAttribute("href", new RegExp(`board=${sales.id}`));
    } finally {
      await watcher.context.close();
    }
  });

  test("History & transfers lists the transfer", async ({ context }) => {
    const { support, sales } = fx().boards;
    const id = fx().tickets["E2E-003"].id; // Support → New
    await api("PATCH", `/api/tickets/${id}/move_to_column/`, { column_id: sales.columns.new });
    const page = await openDetail(context, "admin", id, "en");
    await page.getByTestId("detail-more").click();
    await page.getByTestId("detail-menu-history").click();
    const dialog = page.getByTestId("history-dialog");
    const row = dialog.locator('li[data-action="transferred"]').first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(support.name);
    await expect(row).toContainText(sales.name);
    // Status rows name their columns, never raw ids.
    await expect(dialog).not.toContainText(new RegExp(`\\b(${Object.values(support.columns).join("|")})\\b`));
  });

  test("copy link (clipboard permission granted)", async ({ context }) => {
    const id = fx().tickets["E2E-001"].id;
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: APP });
    const page = await openDetail(context, "admin", id, "en");
    await page.getByTestId("detail-copy-link").click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(`${APP}/tickets/${id}`);
  });

  test("J/K with filters and x of n, including two tickets with equal positions", async ({ context }) => {
    const { support } = fx().boards;
    const a = fx().roles.equal_position_a;
    const b = fx().roles.equal_position_b;
    type Nav = { index: number; total: number; prev_id: number | null; next_id: number | null };
    const nav = (id: number, qs: string) => api<Nav>("GET", `/api/tickets/${id}/navigation/?${qs}`);

    // Equal positions still give a strict order: a and b are neighbours, each once.
    const qs = `board=${support.id}`;
    const [na, nb] = [await nav(a, qs), await nav(b, qs)];
    expect(Math.abs(na.index - nb.index)).toBe(1);
    const [first, second] = na.index < nb.index ? [a, b] : [b, a];
    const nFirst = na.index < nb.index ? na : nb;
    expect(nFirst.next_id).toBe(second);

    await signIn(context, "admin", "en", { theme: "light" });
    const page = await context.newPage();
    await page.goto(`${APP}/tickets/${first}?${qs}`);
    await expect(page.getByTestId("ticket-detail")).toHaveAttribute("data-state", "ready", { timeout: 45_000 });
    await expect(page.getByTestId("detail-position")).toHaveText(`${nFirst.index} of ${nFirst.total}`);
    await page.locator("body").click({ position: { x: 5, y: 300 } });
    await page.keyboard.press("j");
    await expect(page).toHaveURL(new RegExp(`/tickets/${second}\\?board=${support.id}$`));
    await expect(page.getByTestId("detail-id")).toHaveText(`#${second}`);
    await expect(page.getByTestId("detail-position")).toHaveText(`${nFirst.index + 1} of ${nFirst.total}`);
    await page.keyboard.press("k");
    await expect(page).toHaveURL(new RegExp(`/tickets/${first}\\?board=${support.id}$`));

    // With a filter: the position counts only the matching tickets, and J stays inside them.
    // The page URL says `priority=`; the API (navigation and list) reads `priority__in=`.
    let priority = "";
    let apiQs = "";
    let high: { id: number }[] = [];
    for (const p of ["high", "medium", "low", "critical"]) {
      [priority, apiQs] = [p, `board=${support.id}&priority__in=${p}`];
      high = (await api<{ results: { id: number }[] }>("GET", `/api/tickets/?${apiQs}&page_size=100`)).results;
      if (high.length > 1) break;
    }
    expect(high.length).toBeGreaterThan(1);
    const start = await nav(high[0].id, apiQs);
    await page.goto(`${APP}/tickets/${high[0].id}?board=${support.id}&priority=${priority}`);
    await expect(page.getByTestId("detail-position")).toHaveText(`${start.index} of ${start.total}`, { timeout: 45_000 });
    expect(start.total).toBe(high.length);
    const step = start.next_id ? "detail-next" : "detail-prev";
    const target = start.next_id ?? start.prev_id;
    await page.getByTestId(step).click();
    await expect(page).toHaveURL(new RegExp(`/tickets/${target}\\?`));
    expect(new URL(page.url()).searchParams.get("priority")).toBe(priority);
  });

  test("notification deep link /tickets/{id} opens the detail", async ({ context }) => {
    const t = fx().tickets["E2E-004"];
    await signIn(context, "agent", "en", { theme: "light" });
    const page = await context.newPage();
    await page.goto(`${APP}/tickets/${t.id}`); // the link notificationLinks builds
    await expect(page.getByTestId("ticket-detail")).toHaveAttribute("data-state", "ready", { timeout: 45_000 });
    await expect(page.locator('[data-slot="detail-main"]')).toContainText(t.title);
    // With no source query, Back goes to the ticket's own board.
    await expect(page.getByTestId("detail-back")).toHaveAttribute("href", `/tickets?board=${fx().boards.support.id}`);
  });
  test("Open client opens the Clients rail for that client", async ({ context }) => {
    const id = fx().tickets["E2E-006"].id; // has the E2E customer
    const customer = extra().customer;
    const page = await openDetail(context, "admin", id, "en");
    const section = page.getByTestId("customer-section");
    await expect(section).toContainText(customer.name);
    // The chat rows arrive with the client detail; wait so the click doesn't land on a shifted row.
    await expect(section.locator('[data-slot="customer-link"][data-kind="chat"]').first()).toBeVisible();
    await section.getByTestId("open-client").click();
    await expect(page).toHaveURL(new RegExp(`/social/clients\\?client=${customer.id}$`));
    await expect(page.getByTestId("client-detail-rail")).toContainText(customer.name, { timeout: 30_000 });
  });
});
