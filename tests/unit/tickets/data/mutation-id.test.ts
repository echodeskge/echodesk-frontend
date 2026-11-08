import { describe, it, expect, beforeEach } from "vitest";
import {
  _resetMutations,
  isOwnMutation,
  mutationHeaders,
  newMutationId,
  rememberMutation,
} from "@/app/(tenant)/tickets/_lib/mutation-id";

describe("mutation ids", () => {
  beforeEach(() => _resetMutations());

  it("creates unique v4-shaped ids", () => {
    const a = newMutationId();
    const b = newMutationId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("remembers ids for 30 seconds", () => {
    rememberMutation("m1", 1_000);
    expect(isOwnMutation("m1", 1_000 + 29_999)).toBe(true);
    expect(isOwnMutation("m1", 1_000 + 30_000)).toBe(false);
    expect(isOwnMutation("other", 1_000)).toBe(false);
    expect(isOwnMutation(null)).toBe(false);
  });

  it("builds the X-Client-Mutation header", () => {
    expect(mutationHeaders("abc")).toEqual({ "X-Client-Mutation": "abc" });
    expect(mutationHeaders(undefined)).toEqual({});
  });
});
