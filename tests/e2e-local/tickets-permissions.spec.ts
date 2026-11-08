/**
 * Permissions (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until FE-06, FE-09, FE-12 (W1/W3) lands; FE-INT removes the fixme per wave.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("Permissions", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("agent: the Restricted board is not in the switcher", async () => {});
  test.fixme("a direct URL to a Restricted ticket shows the 404 state", async () => {});
  test.fixme("an Open-board ticket opens (E2)", async () => {});
  test.fixme("the groups row is hidden", async () => {});
  test.fixme("payment Record is hidden", async () => {});
  test.fixme("Transfer is hidden without can_transfer", async () => {});
  test.fixme("without the social feature: customer row, section and Saved reply are hidden", async () => {});
});
