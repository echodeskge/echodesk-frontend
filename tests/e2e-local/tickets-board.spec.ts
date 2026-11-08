/**
 * Board, switcher and sidebar (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until FE-03, FE-04, FE-06 (W1) lands; FE-INT removes the fixme per wave.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("Board, switcher and sidebar", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("loads the default board", async () => {});
  test.fixme("switching board updates the URL and the sidebar active state", async () => {});
  test.fixme("sidebar nested list shows counts and the chevron toggles it", async () => {});
  test.fixme("admin creates a board with a colour", async () => {});
  test.fixme("Board settings: set default, then delete the board", async () => {});
  test.fixme("Manage users tabs save", async () => {});
  test.fixme("Telegram tab renders and Test shows an error toast offline", async () => {});
  test.fixme("agent sees no admin menu entries", async () => {});
  test.fixme("E2E Empty board shows the no-columns state (admin sees Add column, agent doesn't)", async () => {});
  test.fixme("agent with open-board-only access loads that board", async () => {});
});
