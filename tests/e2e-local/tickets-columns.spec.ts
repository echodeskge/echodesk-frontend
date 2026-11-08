/**
 * Columns (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until FE-07 (W1) lands; FE-INT removes the fixme per wave.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("Columns", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("add a column with closed/default/track_time persisted (reopen the sheet to check)", async () => {});
  test.fixme("editing a column keeps track_time", async () => {});
  test.fixme("reorder columns by dragging the header, then reload", async () => {});
  test.fixme("delete an empty column", async () => {});
  test.fixme("deleting a non-empty column shows the error", async () => {});
  test.fixme("agent has no column menu and no Add column", async () => {});
});
