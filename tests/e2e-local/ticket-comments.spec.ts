/**
 * Comments and composer (plan FE-16 §5.2). Written ahead of its work package and kept
 * as test.fixme until FE-11 (W3) lands; FE-INT removes the fixme per wave.
 */
import { test } from "@playwright/test";
import { resetFixtures } from "./fixtures/session";

test.describe("Comments and composer", () => {
  // RM8: every spec file starts from freshly reset fixtures. Playwright
  // skips this hook while every test in the file is fixme.
  test.beforeAll(() => {
    resetFixtures();
  });

  test.fixme("internal is on by default", async () => {});
  test.fixme("admin toggles internal off and posts (muted bubble, no badge)", async () => {});
  test.fixme("agent's toggle is disabled, so the comment is Internal", async () => {});
  test.fixme("Cmd/Ctrl+Enter posts", async () => {});
  test.fixme("mention picker inserts @email and the Mention button opens it", async () => {});
  test.fixme("Saved reply inserts a quick reply", async () => {});
  test.fixme("edit and delete your own comment", async () => {});
  test.fixme("a second context sees the new comment live", async () => {});
});
