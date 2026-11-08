/**
 * Mobile 390 (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until W1/W3 lands; FE-INT removes the fixme per wave.
 * Runs in the mobile-390 project.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("Mobile 390", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("no horizontal page scroll (scrollWidth <= 390)", async () => {});
  test.fixme("board columns snap-scroll", async () => {});
  test.fixme("chips scroll and the search icon expands", async () => {});
  test.fixme("every open popover and the switcher Sheet fit inside the viewport (DC40)", async () => {});
  test.fixme("a card opens the detail", async () => {});
  test.fixme("the detail header row has scrollWidth <= clientWidth (DC20)", async () => {});
  test.fixme("the status track scrolls with the current step visible", async () => {});
  test.fixme("the rail is stacked under the main column", async () => {});
  test.fixme("the composer stays visible after focusing (viewport resize)", async () => {});
  test.fixme("the J/K buttons are tappable", async () => {});
  test.fixme("keyboard DnD (Space and arrows) moves a card", async () => {});
  test.fixme("touch long-press DnD (fixme if emulation can't drive @hello-pangea)", async () => {});
});
