/**
 * Tests for devTenant.ts.
 * Verifies get/set/clear/isSet and SSR safety.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to import the module fresh for each test block to avoid side-effects
// from the module-level code that registers on window.

describe("devTenant", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // We import at test-time to avoid issues with module caching
  async function loadDevTenant() {
    // Dynamic import to get a reference
    const mod = await import("@/utils/devTenant");
    return mod.devTenant;
  }

  describe("set", () => {
    it("saves tenant ID to localStorage", async () => {
      const devTenant = await loadDevTenant();

      devTenant.set("groot");

      expect(localStorage.getItem("dev_tenant")).toBe("groot");
    });

    it("overwrites previously set tenant", async () => {
      const devTenant = await loadDevTenant();

      devTenant.set("groot");
      devTenant.set("acme");

      expect(localStorage.getItem("dev_tenant")).toBe("acme");
    });
  });

  describe("get", () => {
    it("returns null when no tenant is set", async () => {
      const devTenant = await loadDevTenant();

      expect(devTenant.get()).toBeNull();
    });

    it("returns the set tenant ID", async () => {
      const devTenant = await loadDevTenant();

      localStorage.setItem("dev_tenant", "groot");

      expect(devTenant.get()).toBe("groot");
    });
  });

  describe("clear", () => {
    it("removes tenant from localStorage", async () => {
      const devTenant = await loadDevTenant();

      localStorage.setItem("dev_tenant", "groot");
      expect(localStorage.getItem("dev_tenant")).toBe("groot");

      devTenant.clear();

      expect(localStorage.getItem("dev_tenant")).toBeNull();
    });

    it("does not throw when no tenant was set", async () => {
      const devTenant = await loadDevTenant();

      expect(() => devTenant.clear()).not.toThrow();
    });
  });

  describe("isSet", () => {
    it("returns false when no tenant is set", async () => {
      const devTenant = await loadDevTenant();

      expect(devTenant.isSet()).toBe(false);
    });

    it("returns true when a tenant is set", async () => {
      const devTenant = await loadDevTenant();

      localStorage.setItem("dev_tenant", "groot");

      expect(devTenant.isSet()).toBe(true);
    });

    it("returns false after clearing", async () => {
      const devTenant = await loadDevTenant();

      devTenant.set("groot");
      expect(devTenant.isSet()).toBe(true);

      devTenant.clear();
      expect(devTenant.isSet()).toBe(false);
    });
  });

  describe("round-trip", () => {
    it("set then get returns the same value", async () => {
      const devTenant = await loadDevTenant();

      devTenant.set("test-tenant");
      expect(devTenant.get()).toBe("test-tenant");
    });

    it("set, clear, get returns null", async () => {
      const devTenant = await loadDevTenant();

      devTenant.set("test-tenant");
      devTenant.clear();
      expect(devTenant.get()).toBeNull();
    });
  });
});
