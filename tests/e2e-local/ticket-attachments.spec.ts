/**
 * Attachments (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until FE-10 (W3) lands; FE-INT removes the fixme per wave.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("Attachments", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("Upload button", async () => {});
  test.fixme("page drop (synthetic DataTransfer)", async () => {});
  test.fixme("a tile click opens a new tab", async () => {});
  test.fixme("delete", async () => {});
  test.fixme("agent cannot delete admin's file", async () => {});
});
