/**
 * `parseFeatureKeys` lives in a dependency-free module so components that
 * must not import the subscription / auth contexts can still guard the
 * `feature_keys` parse (`@/lib/calling-access` re-exports it; see
 * calling-access.test.ts for the identity check).
 */
import { describe, it, expect } from "vitest";
import { parseFeatureKeys } from "@/lib/feature-keys";

describe("parseFeatureKeys (feature-keys.ts)", () => {
  it("parses a JSON string and keeps only strings", () => {
    expect(parseFeatureKeys('["ip_calling", "tickets", 3, null]')).toEqual(["ip_calling", "tickets"]);
  });

  it("passes arrays through, keeping only strings", () => {
    expect(parseFeatureKeys(["booking_management", 1, undefined])).toEqual(["booking_management"]);
  });

  it("returns [] for bad JSON, non-array JSON, null, undefined, numbers and objects", () => {
    expect(parseFeatureKeys('{"not": json')).toEqual([]);
    expect(parseFeatureKeys('{"a": 1}')).toEqual([]);
    expect(parseFeatureKeys("42")).toEqual([]);
    expect(parseFeatureKeys(null)).toEqual([]);
    expect(parseFeatureKeys(undefined)).toEqual([]);
    expect(parseFeatureKeys(7)).toEqual([]);
    expect(parseFeatureKeys({ ip_calling: true })).toEqual([]);
  });
});
