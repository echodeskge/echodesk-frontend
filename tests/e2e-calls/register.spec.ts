/**
 * Every extension registers: each rail's SIP pill reports `registered`, shows
 * its extension, and the dock launcher carries the green ready dot. Also
 * proves the browser only talked to the local stack.
 */
import { expect, hangUpAll, test } from "./fixtures/agents";
import { openRail, rail, sipPill, waitRegistered } from "./fixtures/rail";

test.describe("register", () => {
  test.afterEach(async ({ agents }) => {
    await hangUpAll(agents);
  });

  test("all three rails show Registered with their extension", async ({ agents }) => {
    for (const a of agents.all) {
      await openRail(a.page);
      await waitRegistered(a.page);
      await expect(sipPill(a.page)).toHaveAttribute("data-state", "registered");
      await expect(rail(a.page)).toContainText(a.ext);
      await expect(a.page.getByTestId("phone-ready-dot")).toBeVisible();
      // Idle rail: dial pad present, no call controls.
      await expect(a.page.getByTestId("call-rail-dial")).toBeVisible();
      await expect(a.page.getByTestId("call-rail-status")).toHaveCount(0);
    }
  });

  test("nothing reached a non-local host", async ({ agents }) => {
    for (const a of agents.all) {
      expect(a.blocked.filter((u) => /echodesk\.(ge|cloud)|stun:|turn:/.test(u)), `${a.who} blocked`).toEqual([]);
    }
  });
});
