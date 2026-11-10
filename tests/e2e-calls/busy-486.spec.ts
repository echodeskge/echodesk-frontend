/**
 * No call waiting: while 101 talks to 102, a second INVITE from 103 is
 * rejected with 486 Busy. 103 sees the busy error and is idle, 101 keeps its
 * call and gets the "missed while busy" toast, 103's leg is logged as busy.
 */
import { expect, hangUpAll, test } from "./fixtures/agents";
import { byUser, mark, summarise, waitForLogs, withStatus } from "./fixtures/logs";
import { accept, dial, endCall, errorStrip, expectIdle, statusBadge, waitActive, waitIncoming } from "./fixtures/rail";

test.describe("busy-486", () => {
  test.afterEach(async ({ agents }) => {
    await hangUpAll(agents);
  });

  test("103 calls 101 while 101 is on 102", async ({ agents }) => {
    const { a101, a102, a103 } = agents;

    await dial(a101.page, a102.ext);
    await waitIncoming(a102.page);
    await accept(a102.page);
    await waitActive(a101.page);

    const since = mark();
    await dial(a103.page, a101.ext);

    // The busy extension never shows Accept for the second INVITE.
    await expectIdle(a103.page, 15_000);
    await expect(errorStrip(a103.page)).toBeVisible();
    await expect(errorStrip(a103.page)).toHaveAttribute("data-key", /sip486|busy/);
    await expect(a101.page.getByTestId("call-rail-accept")).toHaveCount(0);
    await expect(statusBadge(a101.page)).toHaveAttribute("data-status", "active");
    await expect(statusBadge(a102.page)).toHaveAttribute("data-status", "active");
    await expect(a101.page.getByTestId("busy-rejected-toast")).toBeVisible({ timeout: 10_000 });
    await expect(a101.page.getByTestId("busy-rejected-toast")).toContainText(a103.ext);

    const rows = await waitForLogs(since, (all) => withStatus(byUser(all, a103.user.id), ["busy"]), { label: "103's leg busy" });
    expect(rows, summarise(rows)).toHaveLength(1);
    expect(rows[0].direction).toBe("outbound");
    expect(rows[0].recipient_number).toContain(a101.ext);

    await endCall(a101.page);
    await expectIdle(a102.page);
  });
});
