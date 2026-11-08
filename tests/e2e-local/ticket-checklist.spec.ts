/**
 * Checklist (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until FE-10 (W3) lands; FE-INT removes the fixme per wave.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("Checklist", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("add with Enter", async () => {});
  test.fixme("toggle updates the progress bar width", async () => {});
  test.fixme("remove plus undo", async () => {});
  test.fixme("reorder by drag", async () => {});
  test.fixme("collapse and expand", async () => {});
});
