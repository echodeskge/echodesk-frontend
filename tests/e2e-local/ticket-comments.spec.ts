/**
 * Comments and composer (plan FE-16 §5.2, FE-11), against the local B2 backend.
 *
 * Runs on its own open scratch board (no users or groups, so admin, agent and
 * agent2 all see it), so the shared fixtures, which other suites reset, are
 * left alone. The specs skip themselves while
 * `flags.detailRedesignEnabled` is false (the old detail has no composer
 * bar); FE-INT turns the flag on in the W3 merge.
 *
 * RM8: two-context checks wait for `data-ws-ready` in both pages first and
 * assert with polling, never fixed sleeps.
 */
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { flags } from "../../src/app/(tenant)/tickets/_lib/flags";
import { api, createScratchBoard, deleteBoardQuietly, fx } from "./fixtures/board";
import { resetFixtures, signIn, waitForWs, type Locale, type Who } from "./fixtures/session";

interface ActivityRow {
  type: "comment" | "event";
  comment_id?: number;
  text?: string;
  is_internal?: boolean;
  user?: { id: number | null; email: string };
}

const stamp = () => Date.now().toString(36);

async function openDetail(context: BrowserContext, who: Who, ticketId: number, locale: Locale = "en"): Promise<Page> {
  await signIn(context, who, locale);
  const page = await context.newPage();
  await page.goto(`/tickets/${ticketId}`);
  await expect(page.locator('[data-testid="ticket-detail"][data-state="ready"]')).toBeAttached({ timeout: 60_000 });
  await waitForWs(page);
  await expect(page.locator('[data-slot="feed-timeline"], [data-slot="feed-empty"]').first()).toBeVisible();
  return page;
}

const textarea = (page: Page) => page.locator('[data-slot="composer-box"] textarea');
const toggle = (page: Page) => page.locator('[data-slot="composer-internal"]');
const commentRow = (page: Page, text: string) => page.locator('[data-slot="feed-comment"]', { hasText: text });

async function serverComment(ticketId: number, text: string): Promise<ActivityRow | undefined> {
  const rows = await api<ActivityRow[]>("GET", `/api/tickets/${ticketId}/activity/`);
  return rows.find((r) => r.type === "comment" && r.text === text);
}

test.describe.serial("Comments and composer", () => {
  test.skip(!flags.detailRedesignEnabled, "the redesigned detail is behind flags.detailRedesignEnabled");

  let ticketId: number;
  let boardId: number | undefined;
  let quickReplyId: number | undefined;
  const replyText = `E2E saved reply ${stamp()}`;

  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(async () => {
    resetFixtures();
    // Not "E2E "-prefixed: `prepare_tickets_e2e --reset` (run by other spec
    // files) deletes every "E2E " board, which would pull this one away
    // mid-run. afterAll deletes it.
    const scratch = await createScratchBoard(`Comments scratch ${stamp()}`, ["Todo", "Done"], [
      { title: "Comments scratch ticket", priority: "medium", column: 0 },
    ]);
    boardId = scratch.board.id;
    ticketId = scratch.tickets[0].id;
    try {
      const qr = await api<{ id: number }>("POST", "/api/social/quick-replies/", {
        title: `E2E reply ${stamp()}`,
        message: replyText,
        platforms: ["all"],
        shortcut: "",
        category: "",
        position: 0,
      });
      quickReplyId = qr.id;
    } catch {
      quickReplyId = undefined;
    }
  });

  test.afterAll(async () => {
    await deleteBoardQuietly(boardId);
    if (quickReplyId) await api("DELETE", `/api/social/quick-replies/${quickReplyId}/`).catch(() => {});
  });

  test("internal is on by default", async ({ context }) => {
    const page = await openDetail(context, "admin", ticketId);
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
    await expect(textarea(page)).toHaveAttribute("placeholder", /internal note/i);
    await expect(page.locator('[data-slot="composer-post"]')).toBeDisabled();
  });

  test("admin toggles internal off and posts (muted bubble, no badge)", async ({ context }) => {
    const page = await openDetail(context, "admin", ticketId);
    const text = `E2E public ${stamp()}`;
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
    await textarea(page).fill(text);
    await page.locator('[data-slot="composer-post"]').click();
    const row = commentRow(page, text);
    await expect(row).toHaveAttribute("data-internal", "false");
    await expect(row.locator('[data-slot="internal-badge"]')).toHaveCount(0);
    await expect.poll(async () => (await serverComment(ticketId, text))?.is_internal).toBe(false);
  });

  test("agent's toggle is disabled, so the comment is Internal", async ({ context }) => {
    const page = await openDetail(context, "agent", ticketId);
    await expect(toggle(page)).toHaveAttribute("aria-disabled", "true");
    // aria-disabled: Playwright won't click it without force; the click must be a no-op.
    await toggle(page).click({ force: true });
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
    const text = `E2E agent ${stamp()}`;
    await textarea(page).fill(text);
    await page.locator('[data-slot="composer-post"]').click();
    await expect(commentRow(page, text).locator('[data-slot="internal-badge"]')).toBeVisible();
    await expect.poll(async () => (await serverComment(ticketId, text))?.is_internal).toBe(true);
  });

  test("Cmd/Ctrl+Enter posts", async ({ context }) => {
    const page = await openDetail(context, "admin", ticketId);
    const text = `E2E hotkey ${stamp()}`;
    await textarea(page).fill(text);
    await textarea(page).press("ControlOrMeta+Enter");
    await expect(commentRow(page, text)).toBeVisible();
    await expect(textarea(page)).toHaveValue("");
  });

  test("mention picker inserts @email and the Mention button opens it", async ({ context }) => {
    const page = await openDetail(context, "admin", ticketId);
    const agentEmail = fx().users?.agent?.email ?? "agent@demo.ge";
    await textarea(page).fill("");
    await textarea(page).pressSequentially(`Ping @${agentEmail.split("@")[0]}`);
    const list = page.locator('[data-slot="mention-list"]');
    await expect(list.getByRole("option").first()).toBeVisible();
    await textarea(page).press("Enter");
    await expect(textarea(page)).toHaveValue(`Ping @${agentEmail} `);

    await page.locator('[data-slot="composer-mention"]').click();
    await expect(textarea(page)).toHaveValue(`Ping @${agentEmail} @`);
    await expect(list.getByRole("option").first()).toBeVisible();
    await textarea(page).press("Escape");
    await expect(list).toHaveCount(0);

    const done = `done ${stamp()}`;
    await textarea(page).fill(`Ping @${agentEmail} ${done}`);
    await page.locator('[data-slot="composer-post"]').click();
    await expect(commentRow(page, done).locator('[data-slot="mention"]')).toBeVisible();
  });

  test("Saved reply inserts a quick reply", async ({ context }) => {
    test.skip(!quickReplyId, "could not create a quick reply on the local backend");
    const page = await openDetail(context, "admin", ticketId);
    await textarea(page).fill("");
    await page.locator('[data-slot="composer-saved-reply"]').click();
    await page.getByRole("textbox", { name: /saved replies/i }).fill(replyText);
    await page.getByRole("option", { name: new RegExp(replyText) }).click();
    await expect(textarea(page)).toHaveValue(replyText);
  });

  test("edit and delete your own comment", async ({ context }) => {
    const page = await openDetail(context, "agent", ticketId);
    const text = `E2E mine ${stamp()}`;
    await textarea(page).fill(text);
    await page.locator('[data-slot="composer-post"]').click();
    const row = commentRow(page, text);
    await expect(row).toBeVisible();

    await row.hover();
    await row.getByRole("button", { name: "Edit" }).click();
    await row.locator("textarea").fill(`${text} edited`);
    await row.getByRole("button", { name: "Save" }).click();
    await expect(commentRow(page, `${text} edited`).locator('[data-slot="comment-bubble"]')).toHaveText(`${text} edited`);

    const edited = commentRow(page, `${text} edited`);
    await edited.hover();
    await edited.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(commentRow(page, `${text} edited`)).toHaveCount(0);
    await expect.poll(async () => serverComment(ticketId, `${text} edited`)).toBeUndefined();

    // Someone else's comment has no edit / delete for a non-staff user.
    const others = page.locator('[data-slot="feed-comment"]', { hasText: "E2E public" });
    if (await others.count()) await expect(others.first().getByRole("button", { name: "Edit" })).toHaveCount(0);
  });

  test("a second context sees the new comment live", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    try {
      const a = await openDetail(ctxA, "admin", ticketId);
      const b = await openDetail(ctxB, "agent2", ticketId);
      const text = `E2E live ${stamp()}`;
      await textarea(a).fill(text);
      await textarea(a).press("ControlOrMeta+Enter");
      await expect(commentRow(a, text)).toBeVisible();
      await expect(commentRow(b, text)).toBeVisible({ timeout: 15_000 });
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
