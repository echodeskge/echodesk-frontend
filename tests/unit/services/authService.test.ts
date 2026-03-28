/**
 * Tests for AuthService.
 * Frontend counterpart of backend test_auth.py:
 *   - TestLogin: valid creds, invalid password, password_change_required, IP restriction
 *   - TestLogout: deletes token
 *   - TestChangePassword: removes token after change
 *   - TestProfile: isAuthenticated
 *
 * Mock return types are validated against the generated API signatures.
 * Run `npm run generate` to refresh them from the backend schema.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TenantLoginRequest } from "@/api/generated/interfaces";

// Mock the generated API functions
vi.mock("@/api/generated/api", () => ({
  tenantLogin: vi.fn(),
  tenantLogout: vi.fn(),
  tenantDashboard: vi.fn(),
  tenantProfile: vi.fn(),
  updateTenantProfile: vi.fn(),
  changeTenantPassword: vi.fn(),
}));

// Mock tenantService
vi.mock("@/services/tenantService", () => ({
  tenantService: {
    getCurrentSubdomain: vi.fn(() => "tenant"),
    getPublicTenantApiUrl: vi.fn(() => "https://tenant.api.test.com"),
  },
}));

import { authService } from "@/services/authService";
import {
  tenantLogin,
  tenantLogout,
  changeTenantPassword,
} from "@/api/generated/api";

const mockTenantLogin = vi.mocked(tenantLogin);
const mockTenantLogout = vi.mocked(tenantLogout);
const mockChangeTenantPassword = vi.mocked(changeTenantPassword);

// Type matching the generated tenantLogin return: Promise<{ message?: string; token?: string; dashboard_data?: Record<string, any> }>
type LoginReturn = Awaited<ReturnType<typeof tenantLogin>>;
// Type matching the generated tenantLogout return: Promise<{ message?: string }>
type LogoutReturn = Awaited<ReturnType<typeof tenantLogout>>;
// Type matching the generated changeTenantPassword return: Promise<{ message?: string }>
type ChangePasswordReturn = Awaited<ReturnType<typeof changeTenantPassword>>;

describe("AuthService", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // -- Login tests (mirrors backend TestLogin) --

  describe("login", () => {
    it("stores token on valid credentials", async () => {
      const response: LoginReturn = {
        message: "Login successful",
        token: "test-token-123",
        dashboard_data: {
          tenant_info: { id: 1, name: "Test" },
          user_info: { id: 1, email: "login@test.com" },
          statistics: { users: { total: 1, active: 1 } },
        },
      };
      mockTenantLogin.mockResolvedValue(response);

      const result = await authService.login({
        email: "login@test.com",
        password: "correctpass123",
      });

      expect(result.token).toBe("test-token-123");
      expect(authService.getToken()).toBe("test-token-123");
      expect(authService.isAuthenticated()).toBe(true);
    });

    it("stores user data from dashboard_data", async () => {
      const mockUser = {
        id: 1,
        email: "login@test.com",
        first_name: "Test",
        last_name: "User",
      };
      const response: LoginReturn = {
        message: "Login successful",
        token: "test-token-123",
        dashboard_data: {
          tenant_info: { id: 1, name: "Test" },
          user_info: mockUser,
          statistics: {},
        },
      };
      mockTenantLogin.mockResolvedValue(response);

      await authService.login({
        email: "login@test.com",
        password: "correctpass123",
      });

      const storedUser = authService.getUser();
      expect(storedUser).toEqual(mockUser);
    });

    it("detects password_change_required from response", async () => {
      // Backend returns this shape when password_change_required is in the 200 response
      const response: LoginReturn & { password_change_required?: boolean; user_id?: number; email?: string } = {
        message: "Password change required",
        password_change_required: true,
        user_id: 1,
        email: "login@test.com",
      };
      mockTenantLogin.mockResolvedValue(response as LoginReturn);

      const result = await authService.login({
        email: "login@test.com",
        password: "correctpass123",
      });

      expect(result.password_change_required).toBe(true);
      expect(result.user_id).toBe(1);
      expect(authService.getToken()).toBeNull();
    });

    it("detects password_change_required from 403 error", async () => {
      mockTenantLogin.mockRejectedValue({
        response: {
          status: 403,
          data: {
            message: "Password change required",
            password_change_required: true,
            user_id: 1,
            email: "login@test.com",
          },
        },
      });

      const result = await authService.login({
        email: "login@test.com",
        password: "correctpass123",
      });

      expect(result.password_change_required).toBe(true);
      expect(result.user_id).toBe(1);
    });

    it("throws on invalid credentials (400)", async () => {
      mockTenantLogin.mockRejectedValue({
        response: {
          status: 400,
          data: { message: "Invalid email or password" },
        },
      });

      await expect(
        authService.login({
          email: "login@test.com",
          password: "wrongpassword",
        })
      ).rejects.toThrow("Invalid email or password");
    });

    it("throws on IP restriction (403 without password_change)", async () => {
      mockTenantLogin.mockRejectedValue({
        response: {
          status: 403,
          data: { message: "IP not allowed" },
        },
      });

      await expect(
        authService.login({
          email: "login@test.com",
          password: "pass",
        })
      ).rejects.toThrow("Your IP address is not allowed");
    });

    it("validates credentials match TenantLoginRequest shape", () => {
      // Compile-time check: credentials must have email + password
      const creds: TenantLoginRequest = {
        email: "test@test.com",
        password: "pass123",
      };
      expect(creds.email).toBeDefined();
      expect(creds.password).toBeDefined();
    });
  });

  // -- Logout tests (mirrors backend TestLogout) --

  describe("logout", () => {
    it("clears all localStorage data", async () => {
      localStorage.setItem("echodesk_auth_token", "old-token");
      localStorage.setItem(
        "echodesk_user_data",
        JSON.stringify({ id: 1 })
      );
      localStorage.setItem(
        "echodesk_tenant_data",
        JSON.stringify({ id: 1 })
      );

      const response: LogoutReturn = { message: "Logged out" };
      mockTenantLogout.mockResolvedValue(response);

      await authService.logout();

      expect(localStorage.getItem("echodesk_auth_token")).toBeNull();
      expect(localStorage.getItem("echodesk_user_data")).toBeNull();
      expect(localStorage.getItem("echodesk_tenant_data")).toBeNull();
      expect(authService.isAuthenticated()).toBe(false);
    });

    it("clears localStorage even if API call fails", async () => {
      localStorage.setItem("echodesk_auth_token", "token");
      mockTenantLogout.mockRejectedValue(new Error("Network error"));

      await authService.logout();

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  // -- Change password tests (mirrors backend TestChangePassword) --

  describe("changePassword", () => {
    it("removes token after password change", async () => {
      localStorage.setItem("echodesk_auth_token", "token");
      const response: ChangePasswordReturn = { message: "Password changed" };
      mockChangeTenantPassword.mockResolvedValue(response);

      await authService.changePassword();

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  // -- isAuthenticated / getToken (mirrors backend auth state) --

  describe("isAuthenticated", () => {
    it("returns false when no token", () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it("returns true when token exists", () => {
      localStorage.setItem("echodesk_auth_token", "some-token");
      expect(authService.isAuthenticated()).toBe(true);
    });
  });

  describe("getUser", () => {
    it("returns null when no user data", () => {
      expect(authService.getUser()).toBeNull();
    });

    it("returns parsed user data", () => {
      const user = { id: 1, email: "test@test.com" };
      localStorage.setItem("echodesk_user_data", JSON.stringify(user));
      expect(authService.getUser()).toEqual(user);
    });
  });

  describe("getTenant", () => {
    it("returns null when no tenant data", () => {
      expect(authService.getTenant()).toBeNull();
    });

    it("returns parsed tenant data", () => {
      const tenant = { id: 1, name: "Test Tenant" };
      localStorage.setItem("echodesk_tenant_data", JSON.stringify(tenant));
      expect(authService.getTenant()).toEqual(tenant);
    });
  });
});
