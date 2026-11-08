/**
 * List view (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until FE-08 (W2) lands; FE-INT removes the fixme per wave.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("List view", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("toggle to list", async () => {});
  test.fixme("groups per column including empty columns, with totals", async () => {});
  test.fixme("a row opens the detail", async () => {});
  test.fixme("a group's + opens create with that column", async () => {});
  test.fixme("infinite scroll on 120 tickets keeps group totals constant while loading", async () => {});
});
