/**
 * Tests for i18n configuration (src/lib/i18n.ts).
 * Tests locale constants and configuration exports.
 */
import { describe, it, expect } from "vitest";
import { locales, defaultLocale, localeNames } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

describe("i18n configuration", () => {
  describe("locales", () => {
    it("contains ka and en locales", () => {
      expect(locales).toContain("ka");
      expect(locales).toContain("en");
    });

    it("has exactly 2 locales", () => {
      expect(locales).toHaveLength(2);
    });

    it("has ka as the first locale", () => {
      expect(locales[0]).toBe("ka");
    });
  });

  describe("defaultLocale", () => {
    it("defaults to ka (Georgian)", () => {
      expect(defaultLocale).toBe("ka");
    });

    it("is included in the locales array", () => {
      expect(locales).toContain(defaultLocale);
    });
  });

  describe("localeNames", () => {
    it("maps en to English", () => {
      expect(localeNames.en).toBe("English");
    });

    it("maps ka to Georgian script", () => {
      expect(localeNames.ka).toBe("ქართული");
    });

    it("has names for all defined locales", () => {
      for (const locale of locales) {
        expect(localeNames[locale]).toBeDefined();
        expect(typeof localeNames[locale]).toBe("string");
        expect(localeNames[locale].length).toBeGreaterThan(0);
      }
    });
  });

  describe("Locale type", () => {
    it("accepts valid locale values", () => {
      const en: Locale = "en";
      const ka: Locale = "ka";

      expect(en).toBe("en");
      expect(ka).toBe("ka");
    });
  });
});
