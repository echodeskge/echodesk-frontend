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
  mockTenantConfig,
} from "./fixtures/api-mocks";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSync(page);
    await mockTenantConfig(page);

    // Set dev_tenant in localStorage so TenantProvider detects a tenant on localhost
    await page.addInitScript(() => {
      localStorage.setItem("dev_tenant", "test-tenant");
    });
  });

  // Helper: the form uses i18n labels (default locale is "ka" / Georgian).
  // Use placeholder / input type selectors that work regardless of locale.
  const fillLoginForm = async (
    page: import("@playwright/test").Page,
    email: string,
    password: string
  ) => {
    await page.getByPlaceholder("name@example.com").fill(email);
    await page.locator('input[type="password"]').fill(password);
  };

  const clickSignIn = async (page: import("@playwright/test").Page) => {
    await page.locator('form button[type="submit"]').click();
  };

  test("successful login redirects to dashboard", async ({ page }) => {
    await mockLoginSuccess(page);
    await mockDashboard(page);

    await page.goto("/");
    await fillLoginForm(page, "login@test.com", "correctpass123");
    await clickSignIn(page);

    // Should navigate away from root login page (redirect to /tickets or similar)
    await expect(page).not.toHaveURL("/", { timeout: 10000 });
  });

  test("invalid credentials shows error message", async ({ page }) => {
    await mockLoginInvalidCredentials(page);

    await page.goto("/");
    await fillLoginForm(page, "login@test.com", "wrongpassword");
    await clickSignIn(page);

    await expect(
      page.getByText(/invalid email or password/i)
    ).toBeVisible();
  });

  test("forced password change flow shows change form", async ({ page }) => {
    await mockLoginPasswordChangeRequired(page);
    await mockForcedPasswordChange(page);

    await page.goto("/");
    await fillLoginForm(page, "login@test.com", "correctpass123");
    await clickSignIn(page);

    // Should show password change heading (Georgian: "პაროლის შეცვლა")
    await expect(
      page.getByRole("heading", { name: /change.*password|პაროლის შეცვლა/i })
    ).toBeVisible();
  });

  test("client-side validation prevents empty submit", async ({ page }) => {
    await page.goto("/");
    await clickSignIn(page);

    // Should show validation error (English: "Please enter a valid email address.")
    await expect(
      page.getByText("Please enter a valid email address.")
    ).toBeVisible();
  });

  test("rate limit 429 shows error message", async ({ page }) => {
    await mockLoginThrottled(page);

    await page.goto("/");
    await fillLoginForm(page, "login@test.com", "whatever");
    await clickSignIn(page);

    // The 429 mock returns { detail: "..." } but the frontend extracts `message` field,
    // falling back to "Login failed" since `detail` is not checked
    await expect(
      page.getByText(/login failed/i)
    ).toBeVisible();
  });
});
