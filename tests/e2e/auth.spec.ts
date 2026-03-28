/**
 * E2E tests for authentication flows.
 * Frontend counterpart of backend test_auth.py:
 *   - Login success → redirect
 *   - Login invalid credentials → error
 *   - Forced password change flow
 *   - Client-side validation
 *   - Rate limit 429 → appropriate message
 */
import { test, expect } from "@playwright/test";
import {
  mockLoginSuccess,
  mockLoginInvalidCredentials,
  mockLoginPasswordChangeRequired,
  mockLoginThrottled,
  mockAuthSync,
  mockForcedPasswordChange,
  mockDashboard,
} from "./fixtures/api-mocks";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSync(page);
  });

  test("successful login redirects to dashboard", async ({ page }) => {
    await mockLoginSuccess(page);
    await mockDashboard(page);

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("login@test.com");
    await page.getByLabel("Password").fill("correctpass123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should navigate away from sign-in page
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("invalid credentials shows error message", async ({ page }) => {
    await mockLoginInvalidCredentials(page);

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("login@test.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(
      page.getByText(/invalid email or password/i)
    ).toBeVisible();
  });

  test("forced password change flow shows change form", async ({ page }) => {
    await mockLoginPasswordChangeRequired(page);
    await mockForcedPasswordChange(page);

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("login@test.com");
    await page.getByLabel("Password").fill("correctpass123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show password change form
    await expect(
      page.getByText(/must change your password/i)
    ).toBeVisible();
  });

  test("client-side validation prevents empty submit", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show validation error
    await expect(
      page.getByText(/please enter a valid email/i)
    ).toBeVisible();
  });

  test("rate limit 429 shows appropriate message", async ({ page }) => {
    await mockLoginThrottled(page);

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("login@test.com");
    await page.getByLabel("Password").fill("whatever");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show throttle/error message
    await expect(
      page.getByText(/throttled|too many|try again/i)
    ).toBeVisible();
  });
});
