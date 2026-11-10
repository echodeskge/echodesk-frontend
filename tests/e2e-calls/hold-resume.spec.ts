/**
 * Hold sends a real re-INVITE: the local description turns `a=sendonly` and
 * the sender track is disabled; resume restores `a=sendrecv` and re-enables
 * the track. Read through the dev-only `window.__echodeskSip` hook (CL-01,
 * NEXT_PUBLIC_CALLS_TEST_HOOK=1; shape in tests/e2e-calls/README.md).
 */
import { expect, hangUpAll, test } from "./fixtures/agents";
import { accept, dial, endCall, expectIdle, holdButton, sdpDirection, sipHook, statusBadge, waitActive, waitIncoming } from "./fixtures/rail";

test.describe("hold-resume", () => {
  test.afterEach(async ({ agents }) => {
    await hangUpAll(agents);
  });

  test("hold = sendonly + track disabled; resume = sendrecv + track enabled", async ({ agents }) => {
    const { a101, a102 } = agents;

    await dial(a101.page, a102.ext);
    await waitIncoming(a102.page);
    await accept(a102.page);
    await waitActive(a101.page);

    // Baseline while connected.
    await expect.poll(async () => sdpDirection((await sipHook(a101.page)).localSdp)).toBe("sendrecv");
    expect((await sipHook(a101.page)).senderTrackEnabled).toBe(true);
    await expect(holdButton(a101.page)).toHaveAttribute("aria-pressed", "false");

    // Hold: the UI flips only after the re-INVITE resolved.
    await holdButton(a101.page).click();
    await expect(holdButton(a101.page)).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });
    await expect(statusBadge(a101.page)).toHaveAttribute("data-hold", "true");
    await expect.poll(async () => sdpDirection((await sipHook(a101.page)).localSdp), { timeout: 10_000 }).toBe("sendonly");
    expect((await sipHook(a101.page)).senderTrackEnabled).toBe(false);
    // The other side stays in the call.
    await expect(statusBadge(a102.page)).toHaveAttribute("data-status", "active");

    // Resume.
    await holdButton(a101.page).click();
    await expect(holdButton(a101.page)).toHaveAttribute("aria-pressed", "false", { timeout: 10_000 });
    await expect(statusBadge(a101.page)).not.toHaveAttribute("data-hold", "true");
    await expect.poll(async () => sdpDirection((await sipHook(a101.page)).localSdp), { timeout: 10_000 }).toBe("sendrecv");
    expect((await sipHook(a101.page)).senderTrackEnabled).toBe(true);

    await endCall(a101.page);
    await expectIdle(a102.page);
  });
});
