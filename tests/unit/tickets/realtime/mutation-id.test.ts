/** FE-02: mutation-id TTL, own-echo detection and the header contract. */
import { describe, it, expect, beforeEach } from "vitest";
import {
  _resetMutations,
  isOwnEvent,
  isOwnMutation,
  issueMutationId,
  MUTATION_HEADER,
  mutationHeaders,
  rememberMutation,
} from "@/app/(tenant)/tickets/_lib/mutation-id";

describe("mutation-id (FE-02)", () => {
  beforeEach(() => _resetMutations());

  it("issueMutationId returns a remembered id", () => {
    const id = issueMutationId(10_000);
    expect(isOwnMutation(id, 10_000)).toBe(true);
    expect(isOwnMutation(id, 10_000 + 30_000)).toBe(false);
  });

  it("expires each id 30s after it was remembered, independently", () => {
    rememberMutation("a", 0);
    rememberMutation("b", 20_000);
    expect(isOwnMutation("a", 29_999)).toBe(true);
    expect(isOwnMutation("a", 30_000)).toBe(false);
    expect(isOwnMutation("b", 30_000)).toBe(true);
    expect(isOwnMutation("b", 50_000)).toBe(false);
  });

  it("re-remembering an id extends its TTL", () => {
    rememberMutation("a", 0);
    rememberMutation("a", 25_000);
    expect(isOwnMutation("a", 40_000)).toBe(true);
  });

  it("isOwnEvent reads client_mutation_id and tolerates null / missing ids", () => {
    rememberMutation("mine", 0);
    expect(isOwnEvent({ client_mutation_id: "mine" }, 1)).toBe(true);
    expect(isOwnEvent({ client_mutation_id: "theirs" }, 1)).toBe(false);
    expect(isOwnEvent({ client_mutation_id: null }, 1)).toBe(false);
    expect(isOwnEvent({}, 1)).toBe(false);
    expect(isOwnEvent(null, 1)).toBe(false);
  });

  it("uses the header name the backend CORS allows", () => {
    expect(MUTATION_HEADER.toLowerCase()).toBe("x-client-mutation");
    expect(mutationHeaders("x")).toEqual({ "X-Client-Mutation": "x" });
    expect(mutationHeaders(null)).toEqual({});
  });
});
