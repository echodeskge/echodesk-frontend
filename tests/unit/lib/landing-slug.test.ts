import { describe, expect, it } from "vitest";
import { isLandingSlug } from "@/lib/landing-slug";

describe("isLandingSlug", () => {
  it("accepts ordinary landing-page slugs", () => {
    for (const slug of ["call-center", "crm", "whatsapp-inbox", "ka-crm-2"]) {
      expect(isLandingSlug(slug)).toBe(true);
    }
  });

  it("rejects file probes that reach /[slug] through a percent-encoded dot", () => {
    // /robots%2etxt and /apple-touch-icon-precomposed.png both ended up here.
    for (const slug of ["robots.txt", "apple-touch-icon-precomposed.png", ".env", "sitemap.xml", "a.b"]) {
      expect(isLandingSlug(slug)).toBe(false);
    }
  });

  it("rejects empty values", () => {
    expect(isLandingSlug("")).toBe(false);
    expect(isLandingSlug(undefined)).toBe(false);
    expect(isLandingSlug(null)).toBe(false);
  });
});
