/**
 * Ticket create, edit, delete (plan FE-16 §5.2), against the local B2 backend.
 * The create flows are FE-14's and run now; edit and delete belong to FE-09
 * and FE-10 (detail) and stay test.fixme until FE-INT turns them on in W3.
 */
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { APP } from "./fixtures/env";
import { resetFixtures } from "./fixtures/session";
import { api, card, column, fx, kanban, openBoardIn, serverColumn } from "./fixtures/board";
import { anySocialClient, createSheet, getTicket, liveBoard, pick, submitAndGetId, waitSheetReady } from "./fixtures/create";

function tmpFile(name: string, body: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-create-"));
  const p = path.join(dir, name);
  fs.writeFileSync(p, body);
  return p;
}

test.describe("Ticket create, edit, delete", () => {
  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(() => {
    resetFixtures();
  });

  test("create from the header (labels, assignees with roles, due date, customer, 2 attachments); the card appears", async ({ context }) => {
    const support = await liveBoard(fx().boards.support.name);
    const agent = fx().users.agent;
    const page = await openBoardIn(context, "admin", support.id);
    const client = await anySocialClient();
    const agentUser = await api<{ first_name: string; last_name: string; email: string }>("GET", `/api/users/${agent.id}/`);
    const agentName = `${agentUser.first_name ?? ""} ${agentUser.last_name ?? ""}`.trim() || agentUser.email.split("@")[0];

    await page.getByTestId("new-ticket").click();
    await waitSheetReady(page);
    const sheet = createSheet(page);
    // Opened from the header: the current board and a status are already chosen (W1 leftover).
    await expect(sheet.locator(".create-board-picker")).toContainText(support.name);
    await expect(sheet.getByTestId("create-submit")).toBeDisabled();

    const title = `E2E create header ${Date.now()}`;
    await sheet.getByTestId("create-title").fill(title);
    await pick(page, sheet.locator(".create-priority-picker"), "High");
    await pick(page, sheet.locator(".create-labels-picker"), "VIP", true);

    await sheet.getByTestId("create-assignees").getByRole("button").first().click();
    await page.getByRole("option", { name: new RegExp(agentName, "i") }).click();
    await page.keyboard.press("Escape");
    await expect(sheet.getByTestId("create-assignees")).toContainText(agentName);

    await sheet.locator("#create-ticket-due").click();
    await page.locator('[role="gridcell"] button').filter({ hasText: /^20$/ }).first().click();

    if (client) {
      await sheet.getByTestId("create-customer").getByRole("button").first().click();
      await page.getByPlaceholder(/Search clients/).fill(client.name.slice(0, 4));
      await page.getByRole("option", { name: new RegExp(client.name.slice(0, 4), "i") }).first().click();
      await expect(sheet.getByTestId("create-customer")).not.toContainText("Link a client");
    } else {
      test.info().annotations.push({ type: "note", description: "no social client in the demo tenant; customer step skipped" });
    }

    await sheet.locator('input[type="file"]').setInputFiles([tmpFile("e2e-a.txt", "first"), tmpFile("e2e-b.txt", "second")]);

    const id = await submitAndGetId(page);
    await expect(card(page, id)).toBeVisible({ timeout: 15_000 });
    await expect(card(page, id)).toContainText(title);
    const uploadErrors = page.locator("[data-sonner-toast]").filter({ hasText: /Couldn't upload e2e-[ab]\.txt/ });

    const t = await getTicket(id);
    expect(t.title).toBe(title);
    expect(t.priority).toBe("high");
    expect(t.board?.id).toBe(support.id);
    expect(t.tags.map((x) => x.name)).toContain("VIP");
    expect(t.due_date).toMatch(/-20$/);
    expect(JSON.stringify(t.assignments ?? t.assigned_users ?? [])).toContain(`"id":${agent.id}`);
    if (t.attachments.length === 2) {
      await expect(uploadErrors).toHaveCount(0);
    } else {
      // The local stack has no file storage (DO Spaces is blanked), so the
      // backend answers 500: each failed file must be reported by name.
      expect(t.attachments).toHaveLength(0);
      await expect(uploadErrors).toHaveCount(2);
      test.info().annotations.push({ type: "note", description: "attachments: local storage unavailable; per-file error toasts asserted" });
    }
    if (client) expect(t.customer?.id).toBeTruthy();
  });

  test("create from a column's + and from a non-tickets page (global +)", async ({ context }) => {
    const support = await liveBoard(fx().boards.support.name);
    const waitingId = support.columns["Waiting"];
    const page = await openBoardIn(context, "admin", support.id);

    // Column "+": the sheet opens on that column.
    await column(page, waitingId).getByTestId("kanban-column-add").click();
    const sheet = createSheet(page);
    await waitSheetReady(page);
    await expect(sheet.locator(".create-column-picker")).toContainText("Waiting");
    const colTitle = `E2E create column ${Date.now()}`;
    await sheet.getByTestId("create-title").fill(colTitle);
    const colId = await submitAndGetId(page);
    await expect(column(page, waitingId).locator(`[data-ticket-id="${colId}"]`)).toBeVisible({ timeout: 15_000 });
    expect(serverColumn(await kanban(support.id), waitingId)).toContain(colId);

    // Global "+" from /email: a board and its default status are preselected.
    await page.goto(`${APP}/email`);
    const plus = page.locator("header").getByRole("button", { name: "Create Task" });
    await expect(plus).toBeVisible({ timeout: 45_000 });
    await plus.click();
    await waitSheetReady(page);
    const boardName = (await sheet.locator(".create-board-picker").textContent())?.trim();
    expect(boardName).toBeTruthy();
    const globalTitle = `E2E create global ${Date.now()}`;
    await sheet.getByTestId("create-title").fill(globalTitle);
    const globalId = await submitAndGetId(page);
    const t = await getTicket(globalId);
    expect(t.title).toBe(globalTitle);
    expect(t.board?.name).toBe(boardName);

  });

  test("the toast's Open ticket goes to the new ticket", async ({ context }) => {
    const support = await liveBoard(fx().boards.support.name);
    const page = await openBoardIn(context, "admin", support.id);
    await page.getByTestId("new-ticket").click();
    await waitSheetReady(page);
    await createSheet(page).getByTestId("create-title").fill(`E2E open after create ${Date.now()}`);
    const id = await submitAndGetId(page);
    await page.locator("[data-sonner-toast]").getByRole("button", { name: "Open ticket" }).click();
    // The first visit compiles the detail route in next dev: allow for it.
    await expect(page).toHaveURL(new RegExp(`/tickets/${id}(\\?|$)`), { timeout: 45_000 });
  });

  test("an agent creates a ticket; the customer row follows the social feature", async ({ context }) => {
    const support = await liveBoard(fx().boards.support.name);
    const page = await openBoardIn(context, "agent", support.id);
    const profile = await api<{ feature_keys?: unknown }>("GET", "/api/auth/profile/", undefined, "agent");
    const keys = typeof profile.feature_keys === "string" ? JSON.parse(profile.feature_keys) : profile.feature_keys;
    const hasSocial = Array.isArray(keys) && keys.includes("social_integrations");

    await page.getByTestId("new-ticket").click();
    await waitSheetReady(page);
    const sheet = createSheet(page);
    await expect(sheet.getByTestId("create-customer")).toHaveCount(hasSocial ? 1 : 0);
    await sheet.getByTestId("create-title").fill(`E2E agent create ${Date.now()}`);
    const id = await submitAndGetId(page);
    await expect(card(page, id)).toBeVisible({ timeout: 15_000 });
  });

  test("Georgian sheet: translated labels, no raw keys", async ({ context }) => {
    const support = await liveBoard(fx().boards.support.name);
    const page = await openBoardIn(context, "admin", support.id, { locale: "ka" });
    await page.getByTestId("new-ticket").click();
    await waitSheetReady(page);
    const text = (await createSheet(page).textContent()) ?? "";
    expect(text).toContain("ახალი ბილეთი");
    expect(text).toContain("ბილეთის შექმნა");
    expect(text).not.toMatch(/\btickets\.[a-zA-Z]|\bcreate\.[a-zA-Z]/);
  });

  test.fixme("edit the title and rich description; bold survives a reload", async () => {});
  test.fixme("a 300-character title wraps", async () => {});
  test.fixme("admin deletes a ticket", async () => {});
  test.fixme("agent: delete is hidden", async () => {});
});
