/**
 * Preserved behaviour (plan FE-16 §5.2). "Global create from /email" is FE-14's;
 * the rest was written by FE-INT in W3, when the new detail page turned on.
 */
import { expect, test, type Page } from "@playwright/test";
import { APP } from "./fixtures/env";
import { resetFixtures, signIn } from "./fixtures/session";
import { createSheet, getTicket, submitAndGetId, waitSheetReady } from "./fixtures/create";
import { api } from "./fixtures/board";

/** E27, as recorded on the local stack in W3 (the redesign doesn't change these routes). */
const RECORDED_E27 = { "/time-tracking": "/tickets", "/orders": "/tickets" };

/**
 * Opens the Clients rail of a demo client whose chat has (or now gets) a linked
 * ticket, creating it with the rail's "Ticket" button. The E2E customer's chat
 * has no messages (prepare_tickets_e2e), so the seeded demo clients are tried.
 */
async function clientWithLinkedTicket(page: Page): Promise<{ clientId: number; ticketId: number }> {
  const clients = (await api<{ results: { id: number }[] }>("GET", "/api/social/clients/?page_size=50")).results;
  for (const { id: clientId } of clients) {
    const linked = await api<{ id?: number; ticket?: { id: number }; ticket_id?: number }[]>(
      "GET",
      `/api/social/conversations/tickets/?client_id=${clientId}`,
    ).catch(() => []);
    await page.goto(`${APP}/social/clients?client=${clientId}`);
    const rail = page.getByTestId("client-detail-rail");
    await expect(rail.locator("h4").first()).toBeVisible({ timeout: 45_000 });
    if (linked.length) {
      const href = await rail.locator('a[href^="/tickets/"]').first().getAttribute("href", { timeout: 15_000 });
      return { clientId, ticketId: Number(href!.split("/").pop()) };
    }
    const create = rail.getByRole("button", { name: "Ticket", exact: true });
    if ((await create.count()) === 0) continue;
    await create.click();
    const toast = page.locator("[data-sonner-toast]").last();
    await expect(toast).toBeVisible({ timeout: 15_000 });
    const m = ((await toast.textContent()) ?? "").match(/#(\d+)/);
    if (!m) continue; // "Conversation not found": no messages behind this chat
    const ticketId = Number(m[1]);
    await expect(rail.locator(`a[href="/tickets/${ticketId}"]`)).toBeVisible({ timeout: 15_000 });
    return { clientId, ticketId };
  }
  throw new Error("no demo client can create a chat ticket");
}

async function expectNewDetail(page: Page, id: number) {
  await expect(page).toHaveURL(new RegExp(`/tickets/${id}(\\?|$)`), { timeout: 30_000 });
  await expect(page.getByTestId("ticket-detail")).toHaveAttribute("data-state", "ready", { timeout: 45_000 });
}

test.describe("Preserved behaviour", () => {
  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(() => {
    resetFixtures();
  });

  test("records whether /time-tracking and /orders redirect (E27)", async ({ context, page }) => {
    await signIn(context, "admin", "en", { theme: "light" });
    const landed: Record<string, string> = {};
    for (const path of ["/time-tracking", "/orders"]) {
      await page.goto(`${APP}${path}`);
      await page.waitForURL((u) => u.pathname !== path, { timeout: 15_000 }).catch(() => undefined);
      await expect(page.locator("body")).not.toContainText(/Application error|Unhandled Runtime Error/);
      landed[path] = new URL(page.url()).pathname;
      test.info().annotations.push({ type: "E27", description: `${path} -> ${landed[path]}` });
    }
    // Recorded behaviour (unchanged by W3): both redirect to /tickets.
    expect(landed).toEqual(RECORDED_E27);
  });

  test("email Create ticket, Messages rail and Clients rail linked tickets open /tickets/{id}", async ({ context, page }) => {
    test.setTimeout(120_000);
    await signIn(context, "admin", "en", { theme: "light" });

    // Clients rail: a client's linked (conversation) ticket.
    const { ticketId } = await clientWithLinkedTicket(page);
    await page.getByTestId("client-detail-rail").locator(`a[href="/tickets/${ticketId}"]`).click();
    await expectNewDetail(page, ticketId);

    // Messages rail and email ticket chips render the same href; follow one when local data has it.
    for (const [where, url, sel] of [
      ["messages rail", `${APP}/social/messages`, '[data-testid="messages-profile-rail"] a[href^="/tickets/"]'],
      ["email chip", `${APP}/email`, 'main a[href^="/tickets/"]'],
    ] as const) {
      await page.goto(url);
      const link = page.locator(sel).first();
      // Both screens poll, so there is no network idle: give the list a few seconds.
      await link.waitFor({ timeout: 8_000 }).catch(() => undefined);
      if ((await link.count()) === 0) {
        test.info().annotations.push({ type: "note", description: `${where}: no linked ticket in the local data` });
        continue;
      }
      const id = Number((await link.getAttribute("href"))!.split("/").pop());
      await link.click();
      await expectNewDetail(page, id);
    }
  });

  test("a ticket created from the Clients rail has the customer set", async ({ context, page }) => {
    await signIn(context, "admin", "en", { theme: "light" });
    const { clientId, ticketId } = await clientWithLinkedTicket(page);
    expect((await getTicket(ticketId)).customer?.id).toBe(clientId);
  });

  test("global create from /email", async ({ context, page }) => {
    await signIn(context, "admin", "en", { theme: "light" });
    await page.goto(`${APP}/email`);
    const plus = page.locator("header").getByRole("button", { name: "Create Task" });
    await expect(plus).toBeVisible({ timeout: 45_000 });
    await plus.click();
    await waitSheetReady(page);
    const title = `E2E preserved global create ${Date.now()}`;
    await createSheet(page).getByTestId("create-title").fill(title);
    const id = await submitAndGetId(page);
    expect((await getTicket(id)).title).toBe(title);
    await expect(page).toHaveURL(/\/email/);
  });
});
