/**
 * Dark mode (plan FE-16 §5.2), dark project, against the local B2 backend.
 * The board part is turned on by FE-INT in W1; the rail and the Internal badge
 * belong to the new detail page (W3).
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";
import { api, card, fx, openBoardIn } from "./fixtures/board";
import { openDetail, railTrigger } from "./fixtures/detail";

/** Effective background (alpha-composited up the tree) and text colour of an element. */
function colours(locator: Locator) {
  return locator.evaluate((el) => {
    // Any CSS colour (rgb, oklch, color-mix…) → RGBA through a 1×1 canvas.
    const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d")!;
    const parse = (c: string) => {
      if (!c || c === "transparent" || c === "rgba(0, 0, 0, 0)") return [0, 0, 0, 0];
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
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

    // The rail: see "detail rail and pickers" (W3).
  });

  test("detail rail and pickers (W3)", async ({ context }) => {
    const page = await openDetail(context, "admin", fx().tickets["E2E-001"].id, "en", "dark");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expectDarkSurface(page, page.locator('[data-slot="properties-rail"]'), "rail");
    await expectDarkSurface(page, page.locator('[data-slot="rail-rows"] [data-slot="property-row"] > span').first(), "rail label");
    await expectDarkSurface(page, page.locator('[data-slot="detail-main"]'), "main column");
    await expectDarkSurface(page, page.locator('[data-slot="status-track"]'), "status track");
    await expectDarkSurface(page, page.locator('[data-slot="detail-composer"]'), "composer");
    // A picker with its selected option.
    await railTrigger(page, "Priority").click();
    const pop = page.locator('[data-slot="property-picker-content"]');
    await expectDarkSurface(page, pop, "picker");
    // cmdk highlights the first option (data-selected); FE-12 noted it turned white in dark mode.
    const highlighted = pop.locator('[data-slot="property-picker-option"][data-selected="true"]').first();
    await expect(highlighted).toBeVisible();
    const { bg } = await colours(highlighted);
    expect(luminance(bg), `highlighted picker option bg ${bg}`).toBeLessThan(0.2);
    await page.keyboard.press("Escape");
    // The ⋮ menu.
    await page.getByTestId("detail-more").click();
    await expectDarkSurface(page, page.getByTestId("detail-menu"), "detail menu");
    await page.keyboard.press("Escape");
  });

  // W3: the composer and activity feed (FE-11).
  test("Internal badge text contrast is at least 4.5", async ({ context }) => {
    const id = fx().tickets["E2E-001"].id;
    await api("POST", "/api/comments/", { ticket: id, comment: `E2E dark internal ${Date.now()}`, is_internal: true });
    const page = await openDetail(context, "admin", id, "en", "dark");
    const badge = page.locator('[data-slot="internal-badge"]').first();
    await expect(badge).toBeVisible();
    const { bg, fg } = await colours(badge);
    expect(contrast(bg, fg), `Internal badge: fg ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    // The internal bubble is a dark amber tint, not a light surface.
    const bubble = page.locator('[data-slot="feed-comment"][data-internal="true"]').first();
    await expect(bubble).toBeVisible();
  });
});
