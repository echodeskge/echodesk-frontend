/**
 * Georgian (plan FE-16 §5.2), against the local B2 backend. The board part is
 * turned on by FE-INT in W1; the list (W2) and detail (W3) parts follow.
 */
import { expect, test, type Page } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";
import { api, boardsLite, fx, kanban, openBoardIn } from "./fixtures/board";

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

    // The list (W2) and the new detail page (W3) are added to this check in their waves.
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
