/**
 * Playwright against the LOCAL calls stack (PLAN.md CL-04). Never production.
 *
 * Start the stack first (no webServer here):
 *   ~/Echodesk/.wt/calls-e2e/asterisk/   docker compose up -d   (Asterisk, ws :8088)
 *   ~/Echodesk/.wt/calls-e2e/localdev/backend.sh                (daphne :8020)
 *   ~/Echodesk/.wt/calls-e2e/localdev/frontend.sh               (next dev :3190,
 *                                                                NEXT_PUBLIC_CALLS_TEST_HOOK=1)
 * then:
 *   npm run test:e2e:calls                       # both projects
 *   npx playwright test -c playwright.calls.config.ts --project desktop register
 *
 * Chromium gets a fake microphone (`--use-fake-device-for-media-stream`) and
 * auto-accepts the permission prompt, `*.lvh.me` resolves to 127.0.0.1 inside
 * the browser, and the session fixture aborts every request that isn't the
 * local web app, the local API or the local Asterisk websocket.
 *
 * Ports come from CALLS_WEB_PORT / CALLS_API_PORT (defaults 3190 / 8020).
 */
import { defineConfig, devices } from "@playwright/test";

const WEB_PORT = process.env.CALLS_WEB_PORT || "3190";

const launchOptions = {
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    "--host-resolver-rules=MAP *.lvh.me 127.0.0.1",
  ],
};

export default defineConfig({
  testDir: "./tests/e2e-calls",
  globalSetup: "./tests/e2e-calls/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  // A spec may wait for a 30 s Dial timeout plus the log writes; keep every
  // single wait bounded (ring detection <= 15 s) and the whole test under 2 min.
  timeout: 120_000,
  expect: { timeout: 10_000 },
  outputDir: process.env.E2E_OUTPUT_DIR || "test-results/e2e-calls",
  use: {
    baseURL: process.env.E2E_WEB_URL || `http://localhost:${WEB_PORT}`,
    permissions: ["microphone"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions,
  },
  projects: [
    {
      name: "desktop",
      testIgnore: [/rail-mobile\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, launchOptions },
    },
    {
      name: "mobile",
      testMatch: [/rail-mobile\.spec\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        launchOptions,
      },
    },
  ],
});
