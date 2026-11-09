/**
 * Georgian (plan FE-16 §5.2), against the local B2 backend. The board part is
 * turned on by FE-INT in W1; the list (W2) and detail (W3) parts follow.
 */
import { expect, test, type Page } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";
import { api, boardsLite, fx, kanban, openBoardIn } from "./fixtures/board";
import { openDetail, railTrigger } from "./fixtures/detail";

/** User-entered strings may be Latin: board, column, ticket, tag and user names. */
async function allowlist(boardId: number): Promise<string[]> {
  const k = (await kanban(boardId)) as unknown as {
    board: { name: string };
    columns: { name: string }[];
    tickets_by_column: Record<string, { title: string; tags?: { name: string }[]; assignees?: { name: string; email?: string }[] }[]>;
  };
  const words = [k.board.name, ...k.columns.map((c) => c.name)];
  for (const c of Object.values(k.tickets_by_column).flat()) {
    words.push(c.title, ...(c.tags ?? []).map((t) => t.name));
    for (const a of c.assignees ?? []) words.push(a.name, a.email ?? "");
  }
  words.push(...(await boardsLite("admin")).map((b) => b.name));
  const me = await api<{ first_name?: string; last_name?: string; email: string }>("GET", "/api/auth/profile/", undefined, "agent");
  words.push(`${me.first_name ?? ""} ${me.last_name ?? ""}`.trim(), me.email);
  // Avatar initials of those names ("Mariam Lomidze" → "ML").
  const initials = words
    .filter((w) => /^[A-Za-z]+ [A-Za-z]+$/.test(w))
    .map((w) => w.split(" ").map((p) => p[0].toUpperCase()).join(""));
  // Known, outside the tickets screens: the shared shell's sr-only sidebar trigger
  // label (src/components/ui/sidebar.tsx) is English in every locale.
  const shell = ["Toggle Sidebar"];
  return [...words, ...shell].filter(Boolean).sort((a, b) => b.length - a.length).concat(initials);
}

async function latinWords(page: Page, selectors: string[], allowed: string[]) {
  // Options whose value is an id are users or tags: user-entered data.
  const texts = await Promise.all(
    selectors.map((s) =>
      page
        .locator(s)
        .first()
        .evaluate((el) => {
          const ids = [...el.querySelectorAll("[data-option]")].filter((o) => /^\d+$/.test(o.getAttribute("data-option") ?? ""));
          const hidden = ids.map((o) => [o as HTMLElement, (o as HTMLElement).style.display] as const);
          hidden.forEach(([o]) => (o.style.display = "none"));
          const text = (el as HTMLElement).innerText;
          hidden.forEach(([o, d]) => (o.style.display = d));
          return text;
        }),
    ),
  );
  let text = texts.join("\n");
  for (const w of allowed) {
    // Initials only as whole words; full strings anywhere.
    text = /^[A-Z]{2,3}$/.test(w) ? text.replace(new RegExp(`\\b${w}\\b`, "g"), " ") : text.split(w).join(" ");
  }
  text = text
    .replace(/[\w.+-]+@[\w.-]+/g, " ") // emails
    .replace(/#\d+/g, " "); // ticket ids
  return [...new Set(text.match(/[A-Za-z]{2,}/g) ?? [])];
}

test.describe("Georgian", () => {
  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(() => {
    resetFixtures();
  });

  test("board, list and detail show no Latin words outside the allowlist", async ({ context }) => {
    const { support } = fx().boards;
    const page = await openBoardIn(context, "agent", support.id, { locale: "ka" });
    await expect(page.locator("html")).toHaveAttribute("lang", "ka");
    const allowed = await allowlist(support.id);

    expect(await latinWords(page, ['[data-testid="tickets-screen"]', '[data-testid="sidebar-boards"]', "header"], allowed)).toEqual([]);

    // Open menus and popovers too.
    await page.getByTestId("board-switcher").click();
    expect(await latinWords(page, ['[data-testid="board-switcher-menu"]'], allowed)).toEqual([]);
    await page.keyboard.press("Escape");
    for (const id of ["assignee", "priority", "label"]) {
      await page.locator(`button[data-filter="${id}"]`).click();
      expect(await latinWords(page, [`[data-filter-menu="${id}"]`], allowed), `${id} popover`).toEqual([]);
      await page.keyboard.press("Escape");
    }
    const first = page.getByTestId("ticket-card").first();
    await first.hover();
    await first.getByTestId("card-menu-trigger").click();
    expect(await latinWords(page, ['[data-testid="card-menu-open"]'], allowed)).toEqual([]);
    await page.keyboard.press("Escape");

    // The list (W2): header, group rows and rows, plus the sidebar views.
    await page.goto(`/tickets?board=${support.id}&view=list`);
    await expect(page.getByTestId("ticket-list")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("list-row").first()).toBeVisible();
    expect(
      await latinWords(page, ['[data-testid="tickets-screen"]', '[data-testid="sidebar-boards"]', '[data-testid="sidebar-views"]', "header"], allowed),
      "list view",
    ).toEqual([]);
    const listDates = await page.getByTestId("list-row-date").allInnerTexts();
    expect(listDates.length).toBeGreaterThan(0);
    for (const d of listDates) expect(d).toMatch(/^\d{1,2} [ა-ჿ]{3}/);

    // The new detail page (W3): header, status track, main column, feed, composer and rail, plus menus.
    const t = fx().tickets["E2E-001"];
    const detail = await api<{
      title: string;
      description: string;
      reporter?: { name?: string; email?: string } | null;
      customer?: { name: string } | null;
      checklist_items: { text: string }[];
      attachments: { filename?: string; original_filename?: string }[];
      assignments: { user: { first_name?: string; last_name?: string; email: string } }[];
      tags: { name: string }[];
    }>("GET", `/api/tickets/${t.id}/`, undefined, "agent");
    const detailWords = [
      detail.title,
      detail.description,
      detail.reporter?.name ?? "",
      detail.customer?.name ?? "",
      ...detail.checklist_items.map((i) => i.text),
      ...detail.attachments.map((a) => a.original_filename ?? a.filename ?? ""),
      ...detail.assignments.map((a) => `${a.user.first_name ?? ""} ${a.user.last_name ?? ""}`.trim()),
      ...detail.tags.map((x) => x.name),
    ].filter(Boolean);
    // Every user's name, short name ("Mariam L.") and initials: the detail shows assignees, reporters and the composer avatar.
    const users = (await api<{ results: { first_name?: string; last_name?: string }[] }>("GET", "/api/users/?page_size=200")).results;
    for (const u of users) {
      const [f, l] = [(u.first_name ?? "").trim(), (u.last_name ?? "").trim()];
      if (f && l) detailWords.push(`${f} ${l}`, `${f} ${l[0]}.`, `${f[0]}${l[0]}`.toUpperCase());
      detailWords.push(f, l);
    }
    const detailAllowed = [...detailWords.filter(Boolean), ...allowed].sort((a, b) => b.length - a.length);
    const dpage = await openDetail(context, "agent", t.id, "ka");
    await expect(dpage.locator('[data-slot="activity-feed"]')).toBeVisible();
    expect(await latinWords(dpage, ['[data-testid="ticket-detail"]', "header"], detailAllowed), "detail").toEqual([]);
    await dpage.getByTestId("detail-more").click();
    expect(await latinWords(dpage, ['[data-testid="detail-menu"]'], detailAllowed), "detail menu").toEqual([]);
    await dpage.keyboard.press("Escape");
    await railTrigger(dpage, "პრიორიტეტი").click();
    expect(await latinWords(dpage, ['[data-slot="property-picker-content"]'], detailAllowed), "priority picker").toEqual([]);
    await dpage.keyboard.press("Escape");
    // Created date in the rail uses Georgian months.
    await expect(dpage.locator('[data-slot="rail-rows"]')).toContainText(/\d{1,2} [ა-ჿ]{3}/);
  });

  test("card dates use Georgian months", async ({ context }) => {
    const page = await openBoardIn(context, "agent", fx().boards.support.id, { locale: "ka" });
    const dates = await page.getByTestId("card-date").allInnerTexts();
    expect(dates.length).toBeGreaterThan(0);
    for (const d of dates) expect(d).toMatch(/^\d{1,2} [ა-ჿ]{3}/);
    // Due chips use the same formatter (the overdue one reads "ვადაგადაცილებული"-style text, not "Overdue").
    const chips = await page.locator('[data-slot="due-chip"]').allInnerTexts();
    for (const c of chips) expect(c).not.toMatch(/[A-Za-z]{2,}/);
  });
});
