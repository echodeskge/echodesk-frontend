/**
 * One row per sip_call_id with the right status after an answered call and a
 * call the caller cancelled while it rang. Read through the API with the
 * admin token; then the /calls list shows exactly those rows.
 */
import { expect, hangUpAll, test } from "./fixtures/agents";
import { byUser, expectOneRowPerSipCallId, FINAL_STATUSES, mark, summarise, waitForLogs, withStatus, type CallLogRow } from "./fixtures/logs";
import { accept, dial, endCall, endButton, expectIdle, waitActive, waitIncoming } from "./fixtures/rail";

test.describe("call-log-rows", () => {
  test.afterEach(async ({ agents }) => {
    await hangUpAll(agents);
  });

  test("answered and cancelled calls each leave one row per leg", async ({ agents }) => {
    const { a101, a102, a103 } = agents;
    const since = mark();

    // 1) 101 -> 102 answered and ended by the caller.
    await dial(a101.page, a102.ext);
    await waitIncoming(a102.page);
    await accept(a102.page);
    await waitActive(a101.page);
    await endCall(a101.page);
    await expectIdle(a102.page);

    // 2) 101 -> 103, caller hangs up while it rings (CANCEL).
    await dial(a101.page, a103.ext);
    await waitIncoming(a103.page);
    await endButton(a101.page).click();
    await expectIdle(a101.page);
    await expectIdle(a103.page, 15_000);

    const rows = await waitForLogs(
      since,
      (all) => {
        const final = withStatus(all, FINAL_STATUSES);
        return byUser(final, a101.user.id).length === 2 && byUser(final, a102.user.id).length === 1 && byUser(final, a103.user.id).length === 1
          ? final
          : [];
      },
      { label: "four final legs" },
    );
    expect(rows, summarise(rows)).toHaveLength(4);
    expectOneRowPerSipCallId(rows);

    const callerRows = byUser(rows, a101.user.id);
    const toAnswered = callerRows.find((r) => r.recipient_number.includes(a102.ext)) as CallLogRow;
    const toCancelled = callerRows.find((r) => r.recipient_number.includes(a103.ext)) as CallLogRow;
    expect(toAnswered, summarise(rows)).toBeTruthy();
    expect(toAnswered.status).toBe("ended");
    expect(toAnswered.answered_at).toBeTruthy();
    expect(toCancelled, summarise(rows)).toBeTruthy();
    expect(["cancelled", "ended", "no_answer"]).toContain(toCancelled.status);
    expect(toCancelled.answered_at ?? null).toBeNull();

    const answeredLeg = byUser(rows, a102.user.id)[0];
    expect(answeredLeg.direction).toBe("inbound");
    expect(answeredLeg.status).toBe("ended");
    expect(answeredLeg.answered_at).toBeTruthy();

    const missedLeg = byUser(rows, a103.user.id)[0];
    expect(missedLeg.direction).toBe("inbound");
    expect(missedLeg.status).toBe("missed");

    // The /calls list (admin, "all" tab) renders every one of those rows once.
    await a101.page.goto("/calls");
    await expect(a101.page.getByTestId("calls-list")).toBeVisible({ timeout: 20_000 });
    for (const r of rows) {
      await expect(a101.page.locator(`[data-testid="call-row"][data-call-id="${r.id}"]`)).toHaveCount(1, { timeout: 15_000 });
    }
    const missedUi = a101.page.locator(`[data-testid="call-row"][data-call-id="${missedLeg.id}"]`);
    await expect(missedUi.locator('[data-direction="missed"]')).toBeVisible();
  });
});
