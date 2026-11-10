/**
 * 101 <-> 103 connected; 101 consults 102 (attended transfer), 102 answers
 * the consultation, 101 completes: 101 idle, 102 and 103 connected. The main
 * leg is logged as transferred (attended) and the consultation leg exists.
 */
import { expect, hangUpAll, test } from "./fixtures/agents";
import { byUser, mark, summarise, waitForLogs, withStatus } from "./fixtures/logs";
import { accept, dial, endCall, expectIdle, statusBadge, transferButton, waitActive, waitIncoming } from "./fixtures/rail";

test.describe("attended-transfer", () => {
  test.afterEach(async ({ agents }) => {
    await hangUpAll(agents);
  });

  test("101 consults 102 and completes the transfer", async ({ agents }) => {
    const { a101, a102, a103 } = agents;
    const since = mark();

    await dial(a101.page, a103.ext);
    await waitIncoming(a103.page);
    await accept(a103.page);
    await waitActive(a101.page);

    await transferButton(a101.page).click();
    const panel = a101.page.getByTestId("call-rail-transfer-panel");
    await expect(panel).toBeVisible();
    await panel.getByTestId("call-rail-transfer-mode-attended").click();
    const target = panel.locator('[data-testid="call-rail-transfer-agent"][data-extension="102"]');
    await expect(target).toBeEnabled({ timeout: 15_000 });
    await target.click();

    // Consultation leg rings 102; 103 is parked on hold meanwhile.
    await waitIncoming(a102.page);
    await expect(a102.page.getByTestId("call-rail")).toContainText(a101.ext);
    await accept(a102.page);

    const bar = a101.page.getByTestId("call-rail-consultation");
    await expect(bar).toBeVisible({ timeout: 10_000 });
    await expect(statusBadge(a101.page)).toHaveAttribute("data-status", "active");
    await bar.getByTestId("call-rail-consult-complete").click();

    await expectIdle(a101.page, 15_000);
    await expect(statusBadge(a102.page)).toHaveAttribute("data-status", "active", { timeout: 10_000 });
    await expect(statusBadge(a103.page)).toHaveAttribute("data-status", "active");

    await endCall(a102.page);
    await expectIdle(a103.page);

    const main = await waitForLogs(
      since,
      (all) => withStatus(byUser(all, a101.user.id), ["transferred"]),
      { label: "main leg transferred" },
    );
    expect(main, summarise(main)).toHaveLength(1);
    expect(main[0].transfer_type).toBe("attended");
    expect(main[0].transferred_to ?? "").toContain(a102.ext);

    // 102 received the consultation leg and ended it after the transfer.
    const consult = await waitForLogs(since, (all) => withStatus(byUser(all, a102.user.id), ["ended"]), { label: "consultation leg ended" });
    expect(consult, summarise(consult)).toHaveLength(1);
    expect(consult[0].direction).toBe("inbound");
    expect(consult[0].caller_number).toContain(a101.ext);
  });
});
