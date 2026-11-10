/**
 * `*200` rings the support queue (ringall). 103 dials it, 101 and 102 both
 * ring, 101 accepts; 102 shows "Answered by …", goes idle and its leg is
 * logged as cancelled, never as missed.
 */
import { NUMBERS } from "./fixtures/env";
import { expect, hangUpAll, test } from "./fixtures/agents";
import { byUser, expectOneRowPerSipCallId, FINAL_STATUSES, logsSince, mark, summarise, waitForLogs, withStatus } from "./fixtures/logs";
import { accept, answeredElsewhere, dial, endCall, expectIdle, waitActive, waitIncoming } from "./fixtures/rail";

test.describe("queue-ring-both", () => {
  test.afterEach(async ({ agents }) => {
    await hangUpAll(agents);
  });

  test("101 and 102 ring, 101 answers, 102 sees answered-elsewhere", async ({ agents }) => {
    const { a101, a102, a103 } = agents;
    const since = mark();

    await dial(a103.page, NUMBERS.queue);
    await waitIncoming(a101.page);
    await waitIncoming(a102.page);

    await accept(a101.page);
    await waitActive(a103.page);

    await expect(answeredElsewhere(a102.page)).toBeVisible({ timeout: 10_000 });
    await expect(a102.page.getByTestId("call-rail-accept")).toHaveCount(0);
    await expectIdle(a102.page, 10_000);
    await expect(a102.page.getByTestId("missed-call-toast")).toHaveCount(0);

    await endCall(a101.page);
    await expectIdle(a103.page);

    const rows = await waitForLogs(
      since,
      (all) => {
        const final = withStatus(all, FINAL_STATUSES);
        return byUser(final, a101.user.id).length >= 1 && byUser(final, a102.user.id).length >= 1 && byUser(final, a103.user.id).length >= 1
          ? final
          : [];
      },
      { label: "all three legs final" },
    );
    expectOneRowPerSipCallId(rows);

    const winner = byUser(rows, a101.user.id);
    const sibling = byUser(rows, a102.user.id);
    const caller = byUser(rows, a103.user.id);
    expect(winner, summarise(rows)).toHaveLength(1);
    expect(winner[0].status).toBe("ended");
    expect(winner[0].answered_at).toBeTruthy();

    expect(sibling, summarise(rows)).toHaveLength(1);
    expect(sibling[0].status, "sibling leg is cancelled, never missed").toBe("cancelled");
    expect(byUser(withStatus(await logsSince(since), ["missed", "no_answer"]), a102.user.id)).toEqual([]);

    expect(caller, summarise(rows)).toHaveLength(1);
    expect(caller[0].direction).toBe("outbound");
    expect(caller[0].status).toBe("ended");

    // Both agent legs belong to the same PBX call when the header is present.
    if (winner[0].pbx_call_id && sibling[0].pbx_call_id) {
      expect(sibling[0].pbx_call_id).toBe(winner[0].pbx_call_id);
    }
  });
});
