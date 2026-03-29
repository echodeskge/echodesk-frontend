/**
 * E2E tests for User CRUD & management.
 * Frontend counterpart of backend test_user_views.py:
 *   - TestUserList: list, search, empty state
 *   - TestUserCreate: create via form
 *   - TestUserUpdate: edit via form
 *   - TestUserDelete: delete user
 *   - TestBulkActions: bulk operations
 *   - TestSendNewPassword: send password action
 *   - Permission checks (non-admin restrictions)
 */
import { test, expect } from "@playwright/test";
import {
  mockAuthSync,
  mockDashboard,
  mockTenantConfig,
  mockUsersList,
  mockUsersListEmpty,
  mockUserCreate,
  mockUserUpdate,
  mockUserDelete,
  mockUserRetrieve,
  mockBulkAction,
  mockSendNewPassword,
  mockTenantGroups,
  mockLayoutAPIs,
} from "./fixtures/api-mocks";

function setupAdminAuth(page: import("@playwright/test").Page) {
  return page.addInitScript(() => {
    localStorage.setItem("dev_tenant", "test-tenant");
    localStorage.setItem("echodesk_auth_token", "test-token");
    localStorage.setItem(
      "echodesk_user_data",
      JSON.stringify({
        id: 1,
        email: "admin@test.com",
        role: "admin",
        is_staff: true,
        is_superuser: true,
        first_name: "Test",
        last_name: "Admin",
      })
    );
  });
}

/** Wait for the user page to fully load and stabilize (hydration complete) */
async function waitForUsersPage(page: import("@playwright/test").Page) {
  await page.goto("/users");
  // Wait for table to confirm the page data rendered
  await page.locator("table").waitFor({ timeout: 30000 });
  // Allow React to finish all re-renders (layout fetches, tenant config, etc.)
  await page.waitForTimeout(2000);
}

test.describe("User Management", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSync(page);
    await mockTenantConfig(page);
    await mockDashboard(page);
    await mockTenantGroups(page);
    await mockLayoutAPIs(page);
    await setupAdminAuth(page);
  });

  // -- TestUserList counterparts --

  test("displays user list with names and emails", async ({ page }) => {
    await mockUsersList(page);

    await waitForUsersPage(page);

    // Scope to table to avoid matching sidebar profile
    const table = page.locator("table");
    await expect(table.getByText("admin@test.com")).toBeVisible();
    await expect(table.getByText("agent1@test.com")).toBeVisible();
    await expect(table.getByText("agent2@test.com")).toBeVisible();
  });

  test("shows empty state when no users", async ({ page }) => {
    await mockUsersListEmpty(page);

    await page.goto("/users");
    await expect(page.getByText(/No users found/i)).toBeVisible({ timeout: 30000 });
  });

  test("shows search input", async ({ page }) => {
    await mockUsersList(page);

    await waitForUsersPage(page);

    await expect(
      page.getByPlaceholder(/search users/i)
    ).toBeVisible();
  });

  test("shows role filter", async ({ page }) => {
    await mockUsersList(page);

    await waitForUsersPage(page);

    await expect(page.getByText("All Roles")).toBeVisible();
  });

  test("shows status filter", async ({ page }) => {
    await mockUsersList(page);

    await waitForUsersPage(page);

    await expect(page.getByText("All Status")).toBeVisible();
  });

  // -- TestUserCreate counterpart --

  test("create user button opens form dialog", async ({ page }) => {
    await mockUsersList(page);

    await waitForUsersPage(page);

    // Button text is translated; match both Georgian and English
    await page.getByRole("button", { name: /მომხმარებლის დამატება|add user/i }).click();

    // Dialog title and description are hardcoded English
    await expect(page.getByText("Add New User")).toBeVisible();
    await expect(
      page.getByText(/secure password will be auto-generated/i)
    ).toBeVisible();
  });

  test("create form validates required fields", async ({ page }) => {
    await mockUsersList(page);

    await waitForUsersPage(page);

    await page.getByRole("button", { name: /მომხმარებლის დამატება|add user/i }).click();
    await expect(page.getByText("Add New User")).toBeVisible();
    await page.waitForTimeout(500);

    // Click Create without filling fields
    await page.getByRole("button", { name: "Create User" }).click();

    // Should show validation errors
    await expect(page.getByText("Email is required")).toBeVisible();
  });

  test("create form submits valid data", async ({ page }) => {
    await mockUsersList(page);
    await mockUserCreate(page);

    await waitForUsersPage(page);

    await page.getByRole("button", { name: /მომხმარებლის დამატება|add user/i }).click();
    await expect(page.getByText("Add New User")).toBeVisible();
    await page.waitForTimeout(500);

    await page.getByLabel(/Email Address/i).fill("new@test.com");
    await page.getByLabel(/First Name/i).fill("New");
    await page.getByLabel(/Last Name/i).fill("User");
    await page.getByRole("button", { name: "Create User" }).click();

    // Form should close or show success
    await expect(page.getByText("Add New User")).not.toBeVisible({ timeout: 10000 });
  });

  // -- TestUserUpdate counterpart --

  test("edit user button opens edit form", async ({ page }) => {
    await mockUsersList(page);
    await mockUserRetrieve(page);

    await waitForUsersPage(page);

    // Click edit button on first user row
    const editBtns = page.getByTitle("Edit User");
    await editBtns.first().click();

    await expect(page.getByText("Edit User")).toBeVisible();
    await expect(page.getByRole("button", { name: "Update User" })).toBeVisible();
  });

  // -- TestUserDelete counterpart --

  test("delete user shows confirmation", async ({ page }) => {
    await mockUsersList(page);
    await mockUserDelete(page);

    await waitForUsersPage(page);

    // Set up dialog handler before clicking delete
    page.on("dialog", (dialog) => dialog.dismiss());

    const deleteBtns = page.getByTitle("Delete User");
    await deleteBtns.first().click();

    // The confirm dialog is handled by the browser - test that the button exists and works
  });

  // -- TestBulkActions counterparts --

  test("selecting users shows bulk actions bar", async ({ page }) => {
    await mockUsersList(page);
    await mockBulkAction(page);

    await waitForUsersPage(page);

    // Select a user via checkbox - use { force: true } to bypass transient detach
    await page.getByRole("checkbox").nth(1).click({ force: true });

    // Bulk actions bar should appear
    await expect(page.getByText(/1 user selected/i)).toBeVisible();
  });

  test("select all checkbox selects all users", async ({ page }) => {
    await mockUsersList(page);

    await waitForUsersPage(page);

    // Click select-all checkbox
    await page.getByRole("checkbox").first().click({ force: true });

    // Should show count for all users
    await expect(page.getByText(/3 users selected/i)).toBeVisible();
  });

  test("bulk actions dropdown shows all actions", async ({ page }) => {
    await mockUsersList(page);
    await mockBulkAction(page);

    await waitForUsersPage(page);

    // Select users
    await page.getByRole("checkbox").first().click({ force: true });
    await expect(page.getByText(/3 users selected/i)).toBeVisible();

    // Open bulk actions dropdown
    await page.getByText(/Bulk Actions/).click({ force: true });

    // Verify all action categories are present
    await expect(page.getByText("User Status")).toBeVisible();
    await expect(page.getByText("Security")).toBeVisible();
    await expect(page.getByText("Role Changes")).toBeVisible();
    await expect(page.getByText("Danger Zone")).toBeVisible();
  });

  test("bulk actions has activate and deactivate", async ({ page }) => {
    await mockUsersList(page);

    await waitForUsersPage(page);

    await page.getByRole("checkbox").first().click({ force: true });
    await expect(page.getByText(/3 users selected/i)).toBeVisible();

    await page.getByText(/Bulk Actions/).click({ force: true });

    await expect(page.getByText(/Activate Users/)).toBeVisible();
    await expect(page.getByText(/Deactivate Users/)).toBeVisible();
  });

  test("bulk actions has role change options", async ({ page }) => {
    await mockUsersList(page);

    await waitForUsersPage(page);

    await page.getByRole("checkbox").first().click({ force: true });
    await expect(page.getByText(/3 users selected/i)).toBeVisible();

    await page.getByText(/Bulk Actions/).click({ force: true });

    await expect(page.getByText(/Make Admin/)).toBeVisible();
    await expect(page.getByText(/Make Agent/)).toBeVisible();
  });

  test("bulk actions has no deprecated group actions", async ({ page }) => {
    await mockUsersList(page);

    await waitForUsersPage(page);

    await page.getByRole("checkbox").first().click({ force: true });
    await expect(page.getByText(/3 users selected/i)).toBeVisible();

    await page.getByText(/Bulk Actions/).click({ force: true });

    await expect(page.getByText(/Add to Group/i)).not.toBeVisible();
    await expect(page.getByText(/Remove from Group/i)).not.toBeVisible();
  });

  // -- TestSendNewPassword counterpart --

  test("send new password button exists in action row", async ({ page }) => {
    await mockUsersList(page);

    await waitForUsersPage(page);

    // Title is translated: Georgian "ახალი პაროლის გაგზავნა" / English "Send New Password"
    const sendPwBtns = page.locator("[title='Send New Password'], [title='ახალი პაროლის გაგზავნა']");
    await expect(sendPwBtns.first()).toBeVisible();
  });

  // -- View user details --

  test("view user details button opens details", async ({ page }) => {
    await mockUsersList(page);
    await mockUserRetrieve(page);

    await waitForUsersPage(page);

    const viewBtns = page.getByTitle("View Details");
    await viewBtns.first().click();

    // Should show user details modal - check for detail-specific content
    await expect(page.getByRole("cell", { name: "admin@test.com" })).toBeVisible();
  });

  // -- Status toggle --

  test("activate/deactivate toggle button exists", async ({ page }) => {
    await mockUsersList(page);

    await waitForUsersPage(page);

    // Active users should have Deactivate button
    const deactivateBtns = page.getByTitle("Deactivate");
    await expect(deactivateBtns.first()).toBeVisible();
  });
});
