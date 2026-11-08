/**
 * Harness self-check (runs today, before any redesign WP lands): signs in
 * against the local stack, loads /tickets and proves that the app only talks
 * to the local API. Also runs in the mobile-390 project.
 */
import { test, expect } from "@playwright/test";
import { signIn } from "./fixtures/session";
import { API_PORT } from "./fixtures/env";

test.describe("e2e-local harness", () => {
  for (const who of ["admin", "agent"] as const) {
    test(`${who} loads /tickets from the local API only`, async ({ context, page }) => {
      const { blocked } = await signIn(context, who, "en");
      const localApiCalls: string[] = [];
      page.on("request", (r) => {
        if (new RegExp(`lvh\\.me:${API_PORT}/api/`).test(r.url())) localApiCalls.push(r.url());
      });

      await page.goto("/tickets");
      await expect(page).toHaveURL(/\/tickets/);
      await expect.poll(() => localApiCalls.some((u) => /\/api\/boards\//.test(u)), { timeout: 20_000 }).toBe(true);

      // Nothing tried to reach a real EchoDesk host (a misconfigured API URL).
      expect(blocked.filter((u) => /echodesk\.(ge|cloud|invalid)/.test(u))).toEqual([]);
      // Not bounced to the login page.
      await expect(page).not.toHaveURL(/login/);
    });
  }
});
