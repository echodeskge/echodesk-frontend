/**
 * Dark mode (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until W1/W3 lands; FE-INT removes the fixme per wave.
 * Runs in the dark project.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("Dark mode", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("no pure-white surfaces in columns, cards, popovers or the rail", async () => {});
  test.fixme("Internal badge text contrast is at least 4.5", async () => {});
});
