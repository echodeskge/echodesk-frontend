/**
 * Georgian (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until W1-W3 lands; FE-INT removes the fixme per wave.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("Georgian", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("board, list and detail show no Latin words outside the allowlist", async () => {});
  test.fixme("card dates use Georgian months", async () => {});
});
