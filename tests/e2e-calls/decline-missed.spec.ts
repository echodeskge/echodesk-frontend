/**
 * Two ways not to answer:
 *  - 102 declines: 101 sees the sip603 error and is idle; 102's leg is
 *    `cancelled` (a decline is not a missed call).
 *  - nobody answers until the dialplan's 30 s Dial timeout: 102 gets the
 *    missed-call toast and a `missed` row.
 */
import { expect, hangUpAll, test } from "./fixtures/agents";
import { byUser, logsSince, mark, summarise, waitForLogs, withStatus } from "./fixtures/logs";
import { decline, dial, errorStrip, expectIdle, waitIncoming } from "./fixtures/rail";

/** `Dial(PJSIP/${EXTEN},30,...)` in `[internal]` plus the 480 round trip. */
const DIAL_TIMEOUT_WAIT = 45_000;

test.describe("decline-missed", () => {
  test.afterEach(async ({ agents }) => {
    await hangUpAll(agents);
  });

  test("102 declines: 101 sees sip603 and 102's leg is cancelled", async ({ agents }) => {
    const { a101, a102 } = agents;
    const since = mark();

    await dial(a101.page, a102.ext);
    await waitIncoming(a102.page);
    await decline(a102.page);

    // The browser sends 603; what the caller gets back is the PBX's Dial
    // mapping (the local dialplan answers 480 after a bare Hangup(), pbx2 may
    // relay 603 or 403), so accept the rejection family. The strip auto-clears
    // after 6 s (ERROR_AUTO_CLEAR_MS), so read its key before waiting for idle.
    await expect(errorStrip(a101.page)).toHaveAttribute("data-key", /^sip(603|480|403|486)$/, { timeout: 15_000 });
    await expectIdle(a101.page, 15_000);
    await expect(a102.page.getByTestId("missed-call-toast")).toHaveCount(0);

    const rows = await waitForLogs(since, (all) => withStatus(byUser(all, a102.user.id), ["cancelled"]), { label: "102's leg cancelled" });
    expect(rows, summarise(rows)).toHaveLength(1);
    expect(byUser(withStatus(await logsSince(since), ["missed", "no_answer"]), a102.user.id)).toEqual([]);
  });

  test("nobody answers: 102 gets the missed toast and a missed row", async ({ agents }) => {
    // Fixture setup (three registering contexts) counts toward the timeout.
    test.setTimeout(DIAL_TIMEOUT_WAIT + 105_000);
    const { a101, a102 } = agents;
    const since = mark();

    await dial(a101.page, a102.ext);
    await waitIncoming(a102.page);

    // Let the PBX time the call out; nobody touches either rail.
    await expectIdle(a102.page, DIAL_TIMEOUT_WAIT);
    await expectIdle(a101.page, 15_000);
    await expect(a102.page.getByTestId("missed-call-toast")).toBeVisible();
    await expect(a102.page.getByTestId("missed-call-toast")).toContainText(a101.ext);

    const missed = await waitForLogs(since, (all) => withStatus(byUser(all, a102.user.id), ["missed"]), { label: "102's missed row" });
    expect(missed, summarise(missed)).toHaveLength(1);
    expect(missed[0].direction).toBe("inbound");
    expect(missed[0].answered_at ?? null).toBeNull();
    // The caller's own leg is final too (whatever the final response mapped to).
    const caller = await waitForLogs(since, (all) => withStatus(byUser(all, a101.user.id), ["no_answer", "cancelled", "failed", "ended"]), {
      label: "101's leg final",
    });
    expect(caller, summarise(caller)).toHaveLength(1);
    expect(caller[0].answered_at ?? null).toBeNull();
  });
});
