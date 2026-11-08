/**
 * Personal timer (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until FE-13 (W3) lands; FE-INT removes the fixme per wave.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("Personal timer", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("start (it ticks), stop, totals in the rail", async () => {});
  test.fixme("start on a second ticket: the 409 dialog, then switch", async () => {});
  test.fixme("Time tab shows entries and time in status", async () => {});
  test.fixme("moving the ticket to a closed column stops the timer", async () => {});
  test.fixme("a stuck timer on a transferred ticket can be stopped via the switch", async () => {});
});
