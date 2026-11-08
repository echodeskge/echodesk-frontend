/**
 * Filters, sort and views (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until FE-06 (W1), FE-08 (W2) lands; FE-INT removes the fixme per wave.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("Filters, sort and views", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("Assignee=Me, Priority, Label and Due chips, search, sort cycle and clear", async () => {});
  test.fixme("the URL reflects the state and a reload restores it", async () => {});
  test.fixme("the ticket count updates and header counts match the visible cards", async () => {});
  test.fixme("sidebar view Urgent opens the list view with chips active and matching count", async () => {});
  test.fixme("the active view row is highlighted", async () => {});
});
