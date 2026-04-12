/**
 * Tests for TenantService.
 * Tests subdomain extraction, tenant URL generation, and API calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { tenantService } from "@/services/tenantService";

describe("TenantService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- Subdomain extraction --

  describe("getSubdomainFromHostname", () => {
    it("extracts subdomain from production domain", () => {
      const result = tenantService.getSubdomainFromHostname(
        "acme.echodesk.ge"
      );
      expect(result).toBe("acme");
    });

    it("returns null for bare domain", () => {
      const result =
        tenantService.getSubdomainFromHostname("echodesk.ge");
      expect(result).toBeNull();
    });

    it("returns null for www subdomain", () => {
      const result =
        tenantService.getSubdomainFromHostname("www.echodesk.ge");
      expect(result).toBeNull();
    });

    it("returns null for api subdomain", () => {
      const result =
        tenantService.getSubdomainFromHostname("api.echodesk.ge");
      expect(result).toBeNull();
    });

    it("returns null for other system subdomains", () => {
      expect(
        tenantService.getSubdomainFromHostname("mail.echodesk.ge")
      ).toBeNull();
      expect(
        tenantService.getSubdomainFromHostname("admin.echodesk.ge")
      ).toBeNull();
      expect(
        tenantService.getSubdomainFromHostname("cdn.echodesk.ge")
      ).toBeNull();
      expect(
        tenantService.getSubdomainFromHostname("static.echodesk.ge")
      ).toBeNull();
    });

    it("extracts subdomain from localhost with prefix", () => {
      const result =
        tenantService.getSubdomainFromHostname("acme.localhost");
      expect(result).toBe("acme");
    });

    it("returns null for plain localhost", () => {
      const result =
        tenantService.getSubdomainFromHostname("localhost");
      expect(result).toBeNull();
    });

    it("returns null for unrelated domain", () => {
      const result =
        tenantService.getSubdomainFromHostname("example.com");
      expect(result).toBeNull();
    });
  });

  // -- Path-based tenant detection --

  describe("getTenantFromPath", () => {
    it("extracts tenant from /name-tenant path", () => {
      const result = tenantService.getTenantFromPath("/amanati-tenant");
      expect(result).toBe("amanati");
    });

    it("extracts tenant with trailing slash", () => {
      const result = tenantService.getTenantFromPath("/mycompany-tenant/");
      expect(result).toBe("mycompany");
    });

    it("returns null for non-tenant paths", () => {
      expect(tenantService.getTenantFromPath("/dashboard")).toBeNull();
      expect(tenantService.getTenantFromPath("/")).toBeNull();
      expect(tenantService.getTenantFromPath("/login")).toBeNull();
    });

    it("returns null for paths without -tenant suffix", () => {
      expect(tenantService.getTenantFromPath("/amanati")).toBeNull();
    });
  });

  // -- isTenantDomain / isTenantPath --

  describe("isTenantDomain", () => {
    it("returns true for tenant subdomain", () => {
      expect(tenantService.isTenantDomain("acme.echodesk.ge")).toBe(true);
    });

    it("returns false for non-tenant domain", () => {
      expect(tenantService.isTenantDomain("echodesk.ge")).toBe(false);
      expect(tenantService.isTenantDomain("www.echodesk.ge")).toBe(false);
    });
  });

  describe("isTenantPath", () => {
    it("returns true for tenant path", () => {
      expect(tenantService.isTenantPath("/acme-tenant")).toBe(true);
    });

    it("returns false for non-tenant path", () => {
      expect(tenantService.isTenantPath("/dashboard")).toBe(false);
    });
  });

  // -- API URL generation --

  describe("getPublicTenantApiUrl", () => {
    it("generates tenant-specific API URL", () => {
      const url = tenantService.getPublicTenantApiUrl("acme");
      expect(url).toContain("acme");
      expect(url).toMatch(/^https:\/\//);
    });
  });

  // -- getTenantBySubdomain --

  describe("getTenantBySubdomain", () => {
    it("returns tenant config on success", async () => {
      const mockTenant = {
        tenant_id: 1,
        tenant_name: "Acme Corp",
        schema_name: "acme",
        domain_url: "acme.echodesk.ge",
        api_url: "https://acme.api.echodesk.ge",
        preferred_language: "en",
        admin_email: "admin@acme.com",
        plan: "pro",
        frontend_url: "https://acme.echodesk.ge",
        theme: {
          primary_color: "#000",
          secondary_color: "#fff",
          company_name: "Acme Corp",
        },
        features: {
          max_users: 10,
          max_storage: 100,
          analytics: true,
          custom_branding: true,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTenant,
      });

      const result = await tenantService.getTenantBySubdomain("acme");

      expect(result).not.toBeNull();
      expect(result!.schema_name).toBe("acme");
      expect(result!.tenant_name).toBe("Acme Corp");
    });

    it("returns null on 404", async () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "Not found",
      });

      const result = await tenantService.getTenantBySubdomain("nonexistent");

      expect(result).toBeNull();
      spy.mockRestore();
    });

    it("throws on server error", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Server error",
      });

      await expect(
        tenantService.getTenantBySubdomain("broken")
      ).rejects.toThrow("Failed to fetch tenant");

      spy.mockRestore();
    });

    it("throws on network error", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(
        tenantService.getTenantBySubdomain("offline")
      ).rejects.toThrow("Network error");

      spy.mockRestore();
    });
  });

  // -- getTenantByDomain --

  describe("getTenantByDomain", () => {
    it("returns tenant config for custom domain", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          tenant_id: 2,
          tenant_name: "Custom Domain Tenant",
          schema_name: "custom",
        }),
      });

      const result =
        await tenantService.getTenantByDomain("custom-domain.com");

      expect(result).not.toBeNull();
      expect(result!.schema_name).toBe("custom");
    });

    it("returns null on failure", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockResolvedValue({ ok: false });

      const result =
        await tenantService.getTenantByDomain("unknown.com");

      expect(result).toBeNull();
      spy.mockRestore();
    });
  });

  // -- getAllTenants --

  describe("getAllTenants", () => {
    it("returns list of tenants", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          tenants: [
            { schema_name: "acme", tenant_name: "Acme" },
            { schema_name: "beta", tenant_name: "Beta" },
          ],
        }),
      });

      const result = await tenantService.getAllTenants();

      expect(result).toHaveLength(2);
    });

    it("returns empty array on failure", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockResolvedValue({ ok: false });

      const result = await tenantService.getAllTenants();

      expect(result).toEqual([]);
      spy.mockRestore();
    });

    it("returns empty array on network error", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await tenantService.getAllTenants();

      expect(result).toEqual([]);
      spy.mockRestore();
    });
  });

  // -- updateLanguage --

  describe("updateLanguage", () => {
    it("returns true on successful language update", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await tenantService.updateLanguage(
        "acme",
        "ka",
        "test-token"
      );

      expect(result).toBe(true);
    });

    it("includes auth token in request", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await tenantService.updateLanguage("acme", "en", "auth-token-123");

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers["Authorization"]).toBe("Token auth-token-123");
    });

    it("returns false on failure", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockResolvedValue({ ok: false });

      const result = await tenantService.updateLanguage("acme", "ka");

      expect(result).toBe(false);
      spy.mockRestore();
    });

    it("returns false on network error", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await tenantService.updateLanguage("acme", "ka");

      expect(result).toBe(false);
      spy.mockRestore();
    });
  });
});
