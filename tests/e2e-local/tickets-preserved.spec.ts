/**
 * Preserved behaviour (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until W3 lands; FE-INT removes the fixme per wave. "Global create
 * from /email" is FE-14's and runs now.
 */
import { expect, test } from "@playwright/test";
import { APP } from "./fixtures/env";
import { resetFixtures, signIn } from "./fixtures/session";
import { createSheet, getTicket, submitAndGetId, waitSheetReady } from "./fixtures/create";

test.describe("Preserved behaviour", () => {
  // RM8: every spec file starts from freshly reset fixtures.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("records whether /time-tracking and /orders redirect (E27)", async () => {});
  test.fixme("email Create ticket, Messages rail and Clients rail linked tickets open /tickets/{id}", async () => {});
  test.fixme("a ticket created from the Clients rail has the customer set", async () => {});
  test("global create from /email", async ({ context, page }) => {
    await signIn(context, "admin", "en", { theme: "light" });
    await page.goto(`${APP}/email`);
    const plus = page.locator("header").getByRole("button", { name: "Create Task" });
    await expect(plus).toBeVisible({ timeout: 45_000 });
    await plus.click();
    await waitSheetReady(page);
    const title = `E2E preserved global create ${Date.now()}`;
    await createSheet(page).getByTestId("create-title").fill(title);
    const id = await submitAndGetId(page);
    expect((await getTicket(id)).title).toBe(title);
    await expect(page).toHaveURL(/\/email/);
  });
});
