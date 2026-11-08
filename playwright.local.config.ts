/**
 * Playwright against the LOCAL tickets stack (plan FE-16). Never production.
 *
 * Start the stack first (no webServer here):
 *   ~/Echodesk/.wt/front-tickets-shots/localdev/backend.sh   (daphne, API + WebSockets)
 *   ~/Echodesk/.wt/front-tickets-shots/localdev/frontend.sh  (next dev)
 * then:
 *   npx playwright test -c playwright.local.config.ts [--project desktop-chromium]
 *
 * Ports come from TICKETS_WEB_PORT / TICKETS_API_PORT (defaults 3110 / 8010,
 * the ports the P-0 local stack uses; the plan's 3100 / 8000 are held by other
 * worktrees). `*.lvh.me` resolves to 127.0.0.1 inside the browser, and the
 * session fixture aborts every request that isn't the local web app or API.
 */
import { defineConfig, devices } from "@playwright/test";

const WEB_PORT = process.env.TICKETS_WEB_PORT || "3110";

const launchOptions = {
  args: ["--host-resolver-rules=MAP *.lvh.me 127.0.0.1, MAP lvh.me 127.0.0.1"],
};

export default defineConfig({
  testDir: "./tests/e2e-local",
  globalSetup: "./tests/e2e-local/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: process.env.E2E_OUTPUT_DIR || "test-results/e2e-local",
  use: {
    baseURL: process.env.E2E_WEB_URL || `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions,
  },
  projects: [
    {
      name: "desktop-chromium",
      testIgnore: [/tickets-mobile\.spec\.ts/, /tickets-dark\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, launchOptions },
    },
    {
      name: "mobile-390",
      testMatch: [/tickets-mobile\.spec\.ts/, /harness\.spec\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        launchOptions,
      },
    },
    {
      name: "dark",
      testMatch: [/tickets-dark\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, colorScheme: "dark", launchOptions },
    },
  ],
});
