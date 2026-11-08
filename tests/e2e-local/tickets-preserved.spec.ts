/**
 * Preserved behaviour (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until W3 lands; FE-INT removes the fixme per wave.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("Preserved behaviour", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("records whether /time-tracking and /orders redirect (E27)", async () => {});
  test.fixme("email Create ticket, Messages rail and Clients rail linked tickets open /tickets/{id}", async () => {});
  test.fixme("a ticket created from the Clients rail has the customer set", async () => {});
  test.fixme("global create from /email", async () => {});
});
