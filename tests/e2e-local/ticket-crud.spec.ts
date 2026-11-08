/**
 * Ticket create, edit, delete (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until FE-10, FE-14 (W3) lands; FE-INT removes the fixme per wave.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("Ticket create, edit, delete", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("create from the header (labels, assignees with roles, due date, customer, 2 attachments); the card appears", async () => {});
  test.fixme("create from a column's + and from a non-tickets page (global +)", async () => {});
  test.fixme("edit the title and rich description; bold survives a reload", async () => {});
  test.fixme("a 300-character title wraps", async () => {});
  test.fixme("admin deletes a ticket", async () => {});
  test.fixme("agent: delete is hidden", async () => {});
});
