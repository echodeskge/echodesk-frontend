import { Page } from "@playwright/test";

/**
 * Mock API responses for E2E tests.
 * Mirrors the backend test scenarios from users/tests/.
 */

const MOCK_USER = {
  id: 1,
  email: "login@test.com",
  first_name: "Test",
  last_name: "User",
  full_name: "Test User",
  role: "admin",
  is_active: true,
  is_staff: true,
  date_joined: "2024-01-01T00:00:00Z",
  last_login: "2024-01-01T00:00:00Z",
  permissions: "{}",
  group_permissions: "{}",
  all_permissions: "{}",
  feature_keys: "[]",
  groups: [],
  tenant_groups: [],
};

const MOCK_TENANT = {
  id: 1,
  name: "Test Tenant",
  description: "Test",
  domain_url: "tenant.test.com",
  preferred_language: "en",
  plan: "pro",
  frontend_url: "http://tenant.test.com",
  deployment_status: "active",
  created_on: "2024-01-01T00:00:00Z",
  is_active: true,
};

/** Full TenantConfig shape returned by /api/tenant/config/ */
const MOCK_TENANT_CONFIG = {
  tenant_id: 1,
  tenant_name: "Test Tenant",
  schema_name: "test_tenant",
  domain_url: "tenant.test.com",
  api_url: "http://localhost:8000",
  preferred_language: "en",
  admin_email: "admin@test.com",
  plan: "pro",
  frontend_url: "http://tenant.test.com",
  theme: {
    primary_color: "#3B82F6",
    secondary_color: "#1E40AF",
    company_name: "Test Tenant",
    logo_url: "",
  },
  features: {
    max_users: 100,
    max_storage: 10000,
    analytics: true,
    custom_branding: true,
    api_access: true,
    webhooks: true,
  },
  localization: {
    language: "en",
    timezone: "UTC",
    date_format: "YYYY-MM-DD",
  },
};

const MOCK_DASHBOARD = {
  tenant_info: JSON.stringify(MOCK_TENANT),
  user_info: JSON.stringify(MOCK_USER),
  statistics: JSON.stringify({
    users: { total: 10, active: 8 },
    tickets: { total: 50, open: 12 },
    customers: { total: 100, active: 80 },
  }),
};

export async function mockLoginSuccess(page: Page) {
  await page.route("**/api/auth/login/", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Login successful",
        token: "test-token-123",
        dashboard_data: {
          tenant_info: MOCK_TENANT,
          user_info: MOCK_USER,
          statistics: {
            users: { total: 10, active: 8 },
            tickets: { total: 50, open: 12 },
            customers: { total: 100, active: 80 },
          },
        },
      }),
    })
  );
}

export async function mockLoginInvalidCredentials(page: Page) {
  await page.route("**/api/auth/login/", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Invalid email or password",
      }),
    })
  );
}

export async function mockLoginPasswordChangeRequired(page: Page) {
  await page.route("**/api/auth/login/", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Password change required",
        password_change_required: true,
        user_id: 1,
        email: "login@test.com",
      }),
    })
  );
}

export async function mockLoginThrottled(page: Page) {
  await page.route("**/api/auth/login/", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        detail: "Request was throttled. Expected available in 60 seconds.",
      }),
    })
  );
}

export async function mockAuthSync(page: Page) {
  await page.route("**/api/auth/sync", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    })
  );
}

export async function mockUsersList(page: Page) {
  await page.route("**/api/users/*", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 3,
          results: [
            { ...MOCK_USER, id: 1, email: "admin@test.com", role: "admin" },
            { ...MOCK_USER, id: 2, email: "agent1@test.com", role: "agent" },
            { ...MOCK_USER, id: 3, email: "agent2@test.com", role: "agent" },
          ],
        }),
      });
    } else {
      route.continue();
    }
  });
}

export async function mockBulkAction(page: Page) {
  await page.route("**/api/users/bulk_action/", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Successfully updated 2 users",
      }),
    })
  );
}

export async function mockDashboard(page: Page) {
  await page.route("**/api/auth/dashboard/", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_DASHBOARD),
    })
  );
}

export async function mockTenantConfig(page: Page) {
  await page.route(/\/api\/tenant\/config\//, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_TENANT_CONFIG),
    })
  );
}

export async function mockUserCreate(page: Page) {
  await page.route("**/api/users/", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ...MOCK_USER,
          id: 10,
          email: "new@test.com",
          first_name: "New",
          last_name: "User",
          full_name: "New User",
        }),
      });
    } else {
      route.continue();
    }
  });
}

export async function mockUserUpdate(page: Page) {
  await page.route(/\/api\/users\/\d+\//, (route) => {
    if (route.request().method() === "PATCH" || route.request().method() === "PUT") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...MOCK_USER,
          first_name: "Updated",
          last_name: "User",
          full_name: "Updated User",
        }),
      });
    } else {
      route.continue();
    }
  });
}

export async function mockUserDelete(page: Page) {
  await page.route(/\/api\/users\/\d+\//, (route) => {
    if (route.request().method() === "DELETE") {
      route.fulfill({ status: 204 });
    } else {
      route.continue();
    }
  });
}

export async function mockUserRetrieve(page: Page) {
  await page.route(/\/api\/users\/\d+\//, (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...MOCK_USER,
          id: 1,
          email: "admin@test.com",
          first_name: "Test",
          last_name: "Admin",
          full_name: "Test Admin",
          phone_number: "+1234567890",
          job_title: "System Admin",
        }),
      });
    } else {
      route.continue();
    }
  });
}

export async function mockUsersListEmpty(page: Page) {
  await page.route("**/api/users/*", (route) => {
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

export async function mockSendNewPassword(page: Page) {
  await page.route(/\/api\/users\/\d+\/send_new_password\//, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "New password sent successfully",
      }),
    })
  );
}

export async function mockTenantGroups(page: Page) {
  await page.route("**/api/tenant-groups/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        count: 2,
        results: [
          { id: 1, name: "Support", description: "Support team" },
          { id: 2, name: "Sales", description: "Sales team" },
        ],
      }),
    })
  );
}

/**
 * Mock all API endpoints required by the (tenant) layout.
 * Call this in beforeEach for any test that navigates to a tenant-scoped page.
 */
export async function mockLayoutAPIs(page: Page) {
  // User profile - required by useUserProfile hook
  await page.route("**/api/auth/profile/", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...MOCK_USER,
        id: 1,
        email: "admin@test.com",
        role: "admin",
        is_staff: true,
        is_superuser: true,
        first_name: "Test",
        last_name: "Admin",
        full_name: "Test Admin",
      }),
    })
  );

  // Boards list - required by useBoards hook
  await page.route("**/api/boards/*", (route) => {
    if (route.request().url().includes("kanban_board")) {
      route.continue();
      return;
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 0, results: [] }),
    });
  });

  // Subscription - required by SubscriptionContext
  await page.route("**/api/subscription/me/", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        subscription: { is_active: true, plan: "pro" },
      }),
    })
  );

  // Dashboard appearance - required by useDashboardAppearance
  await page.route("**/api/dashboard-appearance/", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    })
  );

  // Social settings - required by useSocialSettings
  await page.route("**/api/social/settings/", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    })
  );

  // Facebook status - required by layout social check
  await page.route("**/api/social/facebook/status/", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected: false }),
    })
  );
}

export async function mockForcedPasswordChange(page: Page) {
  await page.route("**/api/auth/forced-password-change/", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Password changed successfully",
        token: "new-token-456",
      }),
    })
  );
}
