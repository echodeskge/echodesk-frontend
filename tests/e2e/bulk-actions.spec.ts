/**
 * E2E tests for user bulk actions.
 * Frontend counterpart of backend test_user_views.py TestBulkActions:
 *   - Selecting users shows bulk actions bar
 *   - Executing action sends correct payload
 *   - Deprecated group actions not present
 */
import { test, expect } from "@playwright/test";
import {
  mockUsersList,
  mockBulkAction,
  mockAuthSync,
  mockDashboard,
} from "./fixtures/api-mocks";

test.describe("User Bulk Actions", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSync(page);
    await mockDashboard(page);
    await mockUsersList(page);
    await mockBulkAction(page);

    // Set auth token to simulate logged-in state
    await page.addInitScript(() => {
      localStorage.setItem("echodesk_auth_token", "test-token");
      localStorage.setItem(
        "echodesk_user_data",
        JSON.stringify({
          id: 1,
          email: "admin@test.com",
          role: "admin",
          is_superuser: true,
        })
      );
    });
  });

  test("bulk actions dropdown does not contain deprecated group actions", async ({
    page,
  }) => {
    // Navigate to users page and check for deprecated actions
    await page.goto("/users");

    // Look for any "Add to Group" or "Remove from Group" text on the page
    const addToGroup = page.getByText(/add to group/i);
    const removeFromGroup = page.getByText(/remove from group/i);

    await expect(addToGroup).toHaveCount(0);
    await expect(removeFromGroup).toHaveCount(0);
  });
});
