/**
 * Drag and drop (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until FE-02, FE-07 (W1) lands; FE-INT removes the fixme per wave.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("Drag and drop", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("keyboard-drag a card to another column; the position persists after reload", async () => {});
  test.fixme("keyboard-drag within a column to index 0; persists after reload", async () => {});
  test.fixme("one mouse drag across columns (stepped mouse.move, waits for the drop animation)", async () => {});
  test.fixme("a drag with a filter active lands at the right absolute position", async () => {});
  test.fixme("a server 500 on move refetches the board to server state and shows a toast", async () => {});
  test.fixme("two contexts (admin, agent2): a move in A appears in B without reload and A doesn't double-apply", async () => {});
  test.fixme("B shows a presence ring while A drags", async () => {});
  test.fixme("sidebar open_count updates after a move into a closed column", async () => {});
});
