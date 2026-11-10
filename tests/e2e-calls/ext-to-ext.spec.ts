/**
 * 101 -> 102: outgoing ringing -> accepted -> timer runs -> end. Both legs are
 * logged once (one row per sip_call_id) as answered and then ended.
 */
import { expect, hangUpAll, test } from "./fixtures/agents";
import { byUser, expectOneRowPerSipCallId, logsSince, mark, summarise, waitForLogs, withStatus } from "./fixtures/logs";
import { accept, dial, endCall, expectIdle, expectTimerRunning, waitActive, waitIncoming, waitOutgoingRinging } from "./fixtures/rail";

test.describe("ext-to-ext", () => {
  test.afterEach(async ({ agents }) => {
    await hangUpAll(agents);
  });

  test("101 calls 102, 102 answers, 101 hangs up", async ({ agents }) => {
    const { a101, a102 } = agents;
    const since = mark();

    await dial(a101.page, a102.ext);
    await waitOutgoingRinging(a101.page);
    await waitIncoming(a102.page);
    await expect(a102.page.getByTestId("call-rail")).toContainText(a101.ext);

    await accept(a102.page);
    await waitActive(a101.page);
    await expectTimerRunning(a101.page);
    await expectTimerRunning(a102.page);

    await endCall(a101.page);
    await expectIdle(a102.page);

    // Server side: one row per leg, both answered then ended.
    const rows = await waitForLogs(
      since,
      (all) => {
        const ended = withStatus(all, ["ended"]);
        return byUser(ended, a101.user.id).length === 1 && byUser(ended, a102.user.id).length === 1 ? ended : [];
      },
      { label: "both legs ended" },
    );
    expectOneRowPerSipCallId(rows);
    const caller = byUser(rows, a101.user.id)[0];
    const callee = byUser(rows, a102.user.id)[0];
    expect(caller.direction, summarise(rows)).toBe("outbound");
    expect(caller.recipient_number).toContain(a102.ext);
    expect(caller.answered_at).toBeTruthy();
    expect(callee.direction, summarise(rows)).toBe("inbound");
    expect(callee.caller_number).toContain(a101.ext);
    expect(callee.answered_at).toBeTruthy();
    expect(callee.sip_call_id).not.toBe(caller.sip_call_id);
    // Nothing else was written for this call (103 was never involved).
    expect(byUser(await logsSince(since), agents.a103.user.id)).toEqual([]);
  });
});
