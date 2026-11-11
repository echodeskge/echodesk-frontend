/**
 * Mobile project (390x844, touch): below `md` the rail is a full-screen sheet.
 * It opens by itself when a call rings, Accept works, nothing scrolls
 * horizontally, and the sheet closes back to the launcher when idle.
 */
import { expect, hangUpAll, test } from "./fixtures/agents";
import { accept, dial, endCall, expectIdle, launcher, rail, waitActive, waitIncoming } from "./fixtures/rail";

async function pageOverflowX(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test.describe("rail-mobile", () => {
  test.afterEach(async ({ agents }) => {
    await hangUpAll(agents);
  });

  test("the sheet opens on ring and Accept works at 390", async ({ agents }) => {
    const { a101, a102 } = agents;

    // 102 closes its rail; an incoming call must reopen it as a sheet.
    await a102.page.getByTestId("call-rail-close").click();
    await expect(rail(a102.page)).toHaveCount(0);
    await expect(launcher(a102.page)).toBeVisible();

    await dial(a101.page, a102.ext);
    await waitIncoming(a102.page);

    const sheet = rail(a102.page);
    await expect(sheet).toBeVisible();
    const box = (await sheet.boundingBox())!;
    expect(box.x).toBe(0);
    expect(Math.round(box.width)).toBe(390);
    expect(await sheet.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
    expect(await pageOverflowX(a102.page)).toBeLessThanOrEqual(0);
    // Accept / Decline are the 64px spec buttons and both inside the viewport.
    const acceptBox = (await a102.page.getByTestId("call-rail-accept").boundingBox())!;
    expect(acceptBox.height).toBeGreaterThanOrEqual(56);
    expect(acceptBox.x + acceptBox.width).toBeLessThanOrEqual(390);

    await accept(a102.page);
    await waitActive(a101.page);
    expect(await pageOverflowX(a102.page)).toBeLessThanOrEqual(0);
    // Minimise is allowed during a call, close is not.
    await expect(a102.page.getByTestId("call-rail-minimise")).toBeVisible();
    await expect(a102.page.getByTestId("call-rail-close")).toHaveCount(0);

    await endCall(a101.page);
    await expectIdle(a102.page);
    expect(await pageOverflowX(a101.page)).toBeLessThanOrEqual(0);
  });
});
