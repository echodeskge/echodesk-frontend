/**
 * 101 <-> 103 connected; 101 blind-transfers to 102 from the transfer panel.
 * 102 rings and answers, 101 is idle, 103 stays in the call with 102, and
 * 101's leg is logged as transferred.
 */
import { expect, hangUpAll, test } from "./fixtures/agents";
import { byUser, mark, summarise, waitForLogs, withStatus } from "./fixtures/logs";
import { accept, dial, endCall, expectIdle, statusBadge, transferButton, waitActive, waitIncoming } from "./fixtures/rail";

test.describe("blind-transfer", () => {
  test.afterEach(async ({ agents }) => {
    await hangUpAll(agents);
  });

  test("101 transfers 103 to 102", async ({ agents }) => {
    const { a101, a102, a103 } = agents;
    const since = mark();

    await dial(a101.page, a103.ext);
    await waitIncoming(a103.page);
    await accept(a103.page);
    await waitActive(a101.page);

    await transferButton(a101.page).click();
    const panel = a101.page.getByTestId("call-rail-transfer-panel");
    await expect(panel).toBeVisible();
    await panel.getByTestId("call-rail-transfer-blind").click();
    const target = panel.locator('[data-testid="call-rail-transfer-agent"][data-extension="102"]');
    await expect(target).toBeEnabled({ timeout: 15_000 }); // online dot comes from /api/extensions/status/
    await target.click();

    await waitIncoming(a102.page);
    await expect(a102.page.getByTestId("call-rail")).toContainText(a103.ext);
    await accept(a102.page);

    await expectIdle(a101.page, 15_000);
    await expect(statusBadge(a103.page)).toHaveAttribute("data-status", "active");

    await endCall(a102.page);
    await expectIdle(a103.page);

    const rows = await waitForLogs(
      since,
      (all) => withStatus(byUser(all, a101.user.id), ["transferred"]),
      { label: "101's leg transferred" },
    );
    expect(rows, summarise(rows)).toHaveLength(1);
    expect(rows[0].transferred_to ?? "", summarise(rows)).toContain(a102.ext);
    expect(rows[0].transfer_type ?? "blind").toBe("blind");
    // The transfer target logged the call it received.
    const received = await waitForLogs(since, (all) => withStatus(byUser(all, a102.user.id), ["ended"]), { label: "102's leg ended" });
    expect(received[0].direction).toBe("inbound");
    expect(received[0].answered_at).toBeTruthy();
  });
});
