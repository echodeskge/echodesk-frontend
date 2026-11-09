/**
 * Dark mode (plan FE-16 §5.2), dark project, against the local B2 backend.
 * The board part is turned on by FE-INT in W1; the rail and the Internal badge
 * belong to the new detail page (W3).
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";
import { card, fx, openBoardIn } from "./fixtures/board";

/** Effective background (alpha-composited up the tree) and text colour of an element. */
function colours(locator: Locator) {
  return locator.evaluate((el) => {
    const parse = (c: string) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return [0, 0, 0, 0];
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return [p[0], p[1], p[2], p[3] ?? 1];
    };
    const layers: number[][] = [];
    for (let n: Element | null = el; n; n = n.parentElement) layers.push(parse(getComputedStyle(n).backgroundColor));
    let [r, g, b] = [255, 255, 255];
    for (const [lr, lg, lb, la] of layers.reverse()) {
      r = lr * la + r * (1 - la);
      g = lg * la + g * (1 - la);
      b = lb * la + b * (1 - la);
    }
    const [fr, fg, fb] = parse(getComputedStyle(el).color);
    return { bg: [r, g, b].map(Math.round), fg: [fr, fg, fb] };
  });
}

const luminance = ([r, g, b]: number[]) => {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
};
const contrast = (a: number[], b: number[]) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

async function expectDarkSurface(page: Page, locator: Locator, what: string) {
  const { bg, fg } = await colours(locator);
  expect(bg, `${what}: not pure white`).not.toEqual([255, 255, 255]);
  expect(luminance(bg), `${what}: dark surface (bg ${bg})`).toBeLessThan(0.2);
  expect(contrast(bg, fg), `${what}: text contrast (fg ${fg} on ${bg})`).toBeGreaterThanOrEqual(4.5);
}

test.describe("Dark mode", () => {
  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(() => {
    resetFixtures();
  });

  test("no pure-white surfaces in columns, cards, popovers or the rail", async ({ context }) => {
    const page = await openBoardIn(context, "admin", fx().boards.support.id, { theme: "dark" });
    await expect(page.locator("html")).toHaveClass(/dark/);

    await expectDarkSurface(page, page.getByTestId("kanban-column").first(), "column");
    await expectDarkSurface(page, page.getByTestId("kanban-column").first().locator("h3"), "column title");
    const first = card(page, fx().tickets["E2E-001"].id);
    await expectDarkSurface(page, first, "card");
    await expectDarkSurface(page, first.getByTestId("card-title"), "card title");
    await expectDarkSurface(page, page.getByTestId("tickets-toolbar"), "toolbar");

    // Filter popover with a selected, highlighted row and the active chip.
    await page.locator('button[data-filter="priority"]').click();
    const pop = page.locator('[data-filter-menu="priority"]');
    await expectDarkSurface(page, pop, "filter popover");
    await page.locator('[data-filter-menu="priority"] [data-option="high"]').click();
    await expectDarkSurface(page, page.locator('[data-filter-menu="priority"] [data-option="high"]'), "selected option");
    await page.keyboard.press("Escape");
    await expectDarkSurface(page, page.locator('button[data-filter="priority"] [data-slot="filter-chip-value"]'), "active chip value");
    await page.getByTestId("toolbar-clear").click();

    // Board switcher menu, including the current-board row.
    await page.getByTestId("board-switcher").click();
    await expectDarkSurface(page, page.getByTestId("board-switcher-menu"), "switcher menu");
    await expectDarkSurface(page, page.getByTestId("board-switcher-menu").locator('[data-selected="true"]'), "current board row");
    await page.keyboard.press("Escape");

    // Card menu and column menu.
    await first.hover();
    await first.getByTestId("card-menu-trigger").click();
    await expectDarkSurface(page, page.getByTestId("card-menu-open"), "card menu");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("card-menu-open")).toBeHidden();
    await page.getByTestId("kanban-column-menu").first().click();
    const columnMenu = page.getByRole("menu").filter({ hasText: "Edit column" });
    await expectDarkSurface(page, columnMenu, "column menu");
    await page.keyboard.press("Escape");

    // The rail is part of the new detail page (W3).
  });

  // W3: the composer and activity feed (FE-11).
  test.fixme("Internal badge text contrast is at least 4.5", async () => {});
});
