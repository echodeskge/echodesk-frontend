/**
 * `*100` answers, records with MixMonitor, plays a prompt and hangs up; its
 * hangup handler POSTs the recording URL to the backend webhook. The row on
 * /calls then shows the Play button.
 */
import { NUMBERS } from "./fixtures/env";
import { expect, hangUpAll, test } from "./fixtures/agents";
import { byUser, mark, summarise, waitForLogs } from "./fixtures/logs";
import { dial, expectIdle, waitActive } from "./fixtures/rail";

test.describe("recording-webhook", () => {
  test.afterEach(async ({ agents }) => {
    await hangUpAll(agents);
  });

  test("*100 recording reaches the call row", async ({ agents }) => {
    const { a101 } = agents;
    const since = mark();

    await dial(a101.page, NUMBERS.recording);
    await waitActive(a101.page, 15_000);
    // Playback(demo-congrats, ~30 s) + Wait(2) + Hangup from the PBX side.
    await expectIdle(a101.page, 45_000);

    const rows = await waitForLogs(
      since,
      (all) => byUser(all, a101.user.id).filter((r) => r.recipient_number.includes(NUMBERS.recording) && !!r.recording_url),
      { timeout: 20_000, label: "recording_url set by the webhook" },
    );
    expect(rows, summarise(rows)).toHaveLength(1);
    const row = rows[0];
    expect(row.status).toBe("ended");

    // The list renders the Play button for that row.
    await a101.page.goto("/calls");
    const uiRow = a101.page.locator(`[data-testid="call-row"][data-call-id="${row.id}"]`);
    await expect(uiRow).toBeVisible({ timeout: 20_000 });
    await expect(uiRow.getByTestId("row-play")).toBeVisible();
  });
});
