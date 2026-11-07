import { describe, it, expect } from "vitest"
import {
  formatBulkBlocked,
  formatRemovalBlocked,
  removalBlockedReasons,
} from "@/components/user-management/removalBlocked"

const blockedError = {
  response: {
    data: {
      detail: "This user cannot be removed yet: a; b.",
      code: "leave_removal_blocked",
      reasons: ["2 open leave request(s) must be decided or cancelled first", "manager of 1 active employee(s)"],
    },
  },
}

describe("removalBlockedReasons", () => {
  it("returns reasons for a leave_removal_blocked error", () => {
    expect(removalBlockedReasons(blockedError)).toHaveLength(2)
  })
  it("returns null for other errors", () => {
    expect(removalBlockedReasons({ response: { data: { detail: "nope" } } })).toBeNull()
    expect(removalBlockedReasons(new Error("x"))).toBeNull()
    expect(removalBlockedReasons(undefined)).toBeNull()
  })
  it("tolerates a missing reasons list", () => {
    expect(removalBlockedReasons({ response: { data: { code: "leave_removal_blocked" } } })).toEqual([])
  })
})

describe("formatRemovalBlocked", () => {
  it("formats a heading plus bullet lines", () => {
    expect(formatRemovalBlocked(blockedError, "Blocked:")).toBe(
      "Blocked:\n• 2 open leave request(s) must be decided or cancelled first\n• manager of 1 active employee(s)"
    )
  })
  it("is null when not blocked", () => {
    expect(formatRemovalBlocked({}, "Blocked:")).toBeNull()
  })
})

describe("formatBulkBlocked", () => {
  it("lists each blocked user with joined reasons", () => {
    const lines = formatBulkBlocked({ "5": ["r1", "r2"], "7": [] }, (id) => (id === 5 ? "Nino" : `#${id}`))
    expect(lines).toEqual(["• Nino: r1; r2"])
  })
  it("handles missing map", () => {
    expect(formatBulkBlocked(undefined, String)).toEqual([])
  })
})
