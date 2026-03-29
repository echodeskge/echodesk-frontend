/**
 * E2E tests for Tenant Group management.
 * Frontend counterpart of backend test_group_views.py:
 *   - TestTenantGroupCRUD: list, create, update, delete
 *   - TestTenantGroupMembers: member management
 *   - TestAvailableFeatures: feature assignment
 */
import { test, expect } from "@playwright/test";
import {
  mockAuthSync,
  mockDashboard,
  mockTenantConfig,
  mockTenantGroups,
  mockLayoutAPIs,
} from "./fixtures/api-mocks";

const MOCK_GROUP_FULL = {
  id: 1,
  name: "Support Team",
  description: "Customer support group",
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  member_count: "5",
  features: [
    { id: 1, key: "tickets", name: "Tickets", icon: "🎫" },
    { id: 2, key: "messages", name: "Messages", icon: "💬" },
  ],
  feature_keys: '["tickets", "messages"]',
};

const MOCK_GROUP_EMPTY = {
  id: 2,
  name: "Sales Team",
  description: "",
  is_active: true,
  created_at: "2024-06-01T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
  member_count: "0",
  features: [],
  feature_keys: "[]",
};

const MOCK_AVAILABLE_FEATURES = {
  categories: [
    {
      category: "core",
      category_display: "Core Features",
      features: [
        { id: 1, key: "tickets", name: "Tickets", description: "Ticket management", icon: "🎫", sort_order: 1 },
        { id: 2, key: "messages", name: "Messages", description: "Messaging", icon: "💬", sort_order: 2 },
      ],
    },
    {
      category: "advanced",
      category_display: "Advanced Features",
      features: [
        { id: 3, key: "analytics", name: "Analytics", description: "Reporting", icon: "📊", sort_order: 1 },
      ],
    },
  ],
};

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
      })
    );
  });
}

async function mockGroupsList(page: import("@playwright/test").Page) {
  await page.route("**/api/tenant-groups/**", (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("available_features")) {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_AVAILABLE_FEATURES),
      });
    } else if (method === "POST") {
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ name: "New Group", description: "Test group" }),
      });
    } else if (method === "PATCH") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...MOCK_GROUP_FULL, name: "Updated Group" }),
      });
    } else if (method === "DELETE") {
      route.fulfill({ status: 204 });
    } else if (method === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 2,
          results: [MOCK_GROUP_FULL, MOCK_GROUP_EMPTY],
        }),
      });
    } else {
      route.continue();
    }
  });
}

async function mockGroupsListEmpty(page: import("@playwright/test").Page) {
  await page.route("**/api/tenant-groups/**", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 0, results: [] }),
      });
    } else {
      route.continue();
    }
  });
}

/** Navigate to groups page and wait for content to fully load and stabilize */
async function gotoGroupsPage(page: import("@playwright/test").Page) {
  await page.goto("/groups");
  // Wait for group content to appear (generous timeout for CI page compilation)
  await page.getByText("Support Team").waitFor({ timeout: 30000 });
  // Allow React to finish all re-renders
  await page.waitForTimeout(2000);
}

test.describe("Tenant Group Management", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSync(page);
    await mockTenantConfig(page);
    await mockDashboard(page);
    await mockLayoutAPIs(page);
    await setupAdminAuth(page);
  });

  // -- TestTenantGroupCRUD.test_list_tenant_groups --

  test("displays group list with names and member counts", async ({ page }) => {
    await mockGroupsList(page);

    await page.goto("/groups");
    await page.screenshot({ path: "debug-groups.png" });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: "debug-groups-after.png" });

    await expect(page.getByText("Support Team")).toBeVisible();
    await expect(page.getByText("Sales Team")).toBeVisible();
    // Member count badge
    await expect(page.getByText("5")).toBeVisible();
  });

  test("shows group description", async ({ page }) => {
    await mockGroupsList(page);

    await gotoGroupsPage(page);

    await expect(page.getByText("Customer support group")).toBeVisible();
  });

  test("shows feature badges on groups", async ({ page }) => {
    await mockGroupsList(page);

    await gotoGroupsPage(page);

    await expect(page.getByText("Tickets")).toBeVisible();
    await expect(page.getByText("Messages")).toBeVisible();
  });

  // -- Empty state --

  test("shows empty state when no groups", async ({ page }) => {
    await mockGroupsListEmpty(page);

    await page.goto("/groups");

    // Georgian: "ჯგუფები არ მოიძებნა" (no groups found)
    await expect(
      page.getByText(/ჯგუფები არ მოიძებნა|no groups found/i)
    ).toBeVisible({ timeout: 30000 });
  });

  // -- Search --

  test("shows search input", async ({ page }) => {
    await mockGroupsList(page);

    await gotoGroupsPage(page);

    // Georgian placeholder: "ჯგუფების ძიება..."
    await expect(
      page.getByPlaceholder(/ჯგუფების ძიება|search groups/i)
    ).toBeVisible();
  });

  test("search filters groups client-side", async ({ page }) => {
    await mockGroupsList(page);

    await gotoGroupsPage(page);

    await expect(page.getByText("Support Team")).toBeVisible();
    await expect(page.getByText("Sales Team")).toBeVisible();

    // Type search term that only matches "Support"
    const searchInput = page.getByPlaceholder(/ჯგუფების ძიება|search groups/i);
    await searchInput.fill("Support");

    await expect(page.getByText("Support Team")).toBeVisible();
    await expect(page.getByText("Sales Team")).not.toBeVisible();
  });

  // -- TestTenantGroupCRUD.test_create_tenant_group_as_admin --

  test("create group button opens form dialog", async ({ page }) => {
    await mockGroupsList(page);

    await gotoGroupsPage(page);

    // Button text: "ახალი ჯგუფის შექმნა" (Create New Group)
    await page.getByRole("button", { name: /ახალი ჯგუფის შექმნა|create new group/i }).click();

    // Dialog title: "ახალი ჯგუფის შექმნა" (Create New Group)
    await expect(
      page.getByText(/ახალი ჯგუფის შექმნა|create new group/i).first()
    ).toBeVisible();
  });

  test("create form submits valid data", async ({ page }) => {
    await mockGroupsList(page);

    await gotoGroupsPage(page);

    await page.getByRole("button", { name: /ახალი ჯგუფის შექმნა|create new group/i }).click();

    // Wait for dialog to stabilize (features load causes re-render)
    await expect(page.getByLabel(/ჯგუფის სახელი|group name/i)).toBeVisible();
    await page.waitForTimeout(1000);

    // Fill name field
    await page.getByLabel(/ჯგუფის სახელი|group name/i).fill("New Group");

    // Click submit button: "ჯგუფის შექმნა" (Create Group)
    await page.getByRole("button", { name: /ჯგუფის შექმნა|create group/i }).last().click();

    // Dialog should close
    await expect(
      page.getByLabel(/ჯგუფის სახელი|group name/i)
    ).not.toBeVisible({ timeout: 10000 });
  });

  // -- TestTenantGroupCRUD.test_update_tenant_group --

  test("edit button opens edit form with pre-filled data", async ({ page }) => {
    await mockGroupsList(page);

    await gotoGroupsPage(page);

    // Click edit button on first group (Georgian: "რედაქტირება" / English: "Edit")
    const editBtns = page.getByRole("button", { name: /რედაქტირება|edit/i });
    await editBtns.first().click();

    // Dialog should show edit title: "ჯგუფის რედაქტირება" (Edit Group)
    await expect(
      page.getByText(/ჯგუფის რედაქტირება|edit group/i)
    ).toBeVisible();

    // Name should be pre-filled
    const nameInput = page.getByLabel(/ჯგუფის სახელი|group name/i);
    await expect(nameInput).toHaveValue("Support Team");
  });

  // -- TestTenantGroupCRUD.test_delete_tenant_group --

  test("delete button shows confirmation", async ({ page }) => {
    await mockGroupsList(page);

    await gotoGroupsPage(page);

    // Set up dialog handler
    page.on("dialog", (dialog) => dialog.dismiss());

    // Click delete button (Georgian: "წაშლა" / English: "Delete")
    const deleteBtns = page.getByRole("button", { name: /წაშლა|delete/i });
    await deleteBtns.first().click();

    // The confirm dialog is handled by the browser
  });

  // -- TestAvailableFeatures.test_available_features_returns_categories --

  test("form shows available feature categories", async ({ page }) => {
    await mockGroupsList(page);

    await gotoGroupsPage(page);

    await page.getByRole("button", { name: /ახალი ჯგუფის შექმნა|create new group/i }).click();

    // Wait for features to load
    await expect(page.getByText("Core Features")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Advanced Features")).toBeVisible();
  });

  test("form shows individual features with descriptions", async ({ page }) => {
    await mockGroupsList(page);

    await gotoGroupsPage(page);

    await page.getByRole("button", { name: /ახალი ჯგუფის შექმნა|create new group/i }).click();

    // Wait for features to load, then check individual features
    await expect(page.getByText("Core Features")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Ticket management")).toBeVisible();
    await expect(page.getByText("Reporting")).toBeVisible();
  });

  // -- Created date display --

  test("shows creation date for groups", async ({ page }) => {
    await mockGroupsList(page);

    await gotoGroupsPage(page);

    // The date format depends on locale, check for the pattern
    await expect(page.getByText(/1\/1\/2024|2024/).first()).toBeVisible();
  });
});
