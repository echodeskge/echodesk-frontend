/**
 * Ticket detail (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until FE-09, FE-12 (W3) lands; FE-INT removes the fixme per wave.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("Ticket detail", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("status track move (agent into a closed column)", async () => {});
  test.fixme("every rail picker", async () => {});
  test.fixme("Due date displays in ka format", async () => {});
  test.fixme("transfer to another board: the card leaves board A live in a second context and appears in B", async () => {});
  test.fixme("History & transfers lists the transfer", async () => {});
  test.fixme("copy link (clipboard permission granted)", async () => {});
  test.fixme("J/K with filters and x of n, including two tickets with equal positions", async () => {});
  test.fixme("notification deep link /tickets/{id} opens the detail", async () => {});
  test.fixme("Open client opens the Clients rail for that client", async () => {});
});
