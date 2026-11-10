/**
 * `*99` answers, `Read()`s up to 8 digits terminated by `#`, appends them to
 * /var/spool/asterisk/recording/dtmf.log (mounted at $E2E/asterisk/recordings)
 * and says them back. The in-call keypad must deliver every tone.
 */
import fs from "node:fs";
import { DTMF_LOG, NUMBERS } from "./fixtures/env";
import { expect, hangUpAll, test } from "./fixtures/agents";
import { dial, expectIdle, keyId, keypadButton, waitActive } from "./fixtures/rail";

/** Four random digits 1-9 so the log line is unique to this run. */
function randomDigits(): string {
  return Array.from({ length: 4 }, () => String(1 + Math.floor(Math.random() * 9))).join("");
}

function logLines(): string[] {
  if (!fs.existsSync(DTMF_LOG)) return [];
  return fs
    .readFileSync(DTMF_LOG, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

test.describe("dtmf", () => {
  test.afterEach(async ({ agents }) => {
    await hangUpAll(agents);
  });

  test("keypad tones reach the dialplan", async ({ agents }) => {
    const { a101 } = agents;
    const digits = randomDigits();
    const before = logLines().filter((l) => l === digits).length;

    await dial(a101.page, NUMBERS.dtmf);
    await waitActive(a101.page, 15_000);

    await keypadButton(a101.page).click();
    for (const ch of digits + "#") {
      await a101.page.getByTestId(keyId(ch)).click();
    }
    // The rail echoes what it sent ("Sent: 1234#").
    await expect(a101.page.getByTestId("call-rail")).toContainText(digits);

    await expect
      .poll(() => logLines().filter((l) => l === digits).length, {
        timeout: 15_000,
        message: `waiting for "${digits}" in ${DTMF_LOG}`,
      })
      .toBe(before + 1);

    // SayDigits then Hangup: the call ends from the PBX side.
    await expectIdle(a101.page, 20_000);
  });
});
