import { describe, it, expect } from "vitest"
import {
  buildSubstitutesPayload,
  fieldErrors,
  historyActionKey,
  historyNote,
  parseIdParam,
  validateSubstituteRows,
} from "@/app/(tenant)/leave/_lib/substitutes-utils"
import { leaveStatusKey, leaveStatusVariant, moveItem } from "@/app/(tenant)/leave/_lib/hr-utils"

describe("validateSubstituteRows", () => {
  it("requires at least one row unless empty lists are allowed", () => {
    expect(validateSubstituteRows([])).toBe("empty")
    expect(validateSubstituteRows([], { allowEmpty: true })).toBeNull()
  })

  it("flags missing users, missing or long tasks", () => {
    expect(validateSubstituteRows([{ substitute: null, task: "x" }])).toBe("missingUser")
    expect(validateSubstituteRows([{ substitute: 2, task: "   " }])).toBe("missingTask")
    expect(validateSubstituteRows([{ substitute: 2, task: "a".repeat(301) }])).toBe("taskTooLong")
  })

  it("rejects duplicates and yourself", () => {
    expect(
      validateSubstituteRows([
        { substitute: 2, task: "a" },
        { substitute: 2, task: "b" },
      ])
    ).toBe("duplicate")
    expect(validateSubstituteRows([{ substitute: 7, task: "a" }], { selfId: 7 })).toBe("self")
  })

  it("accepts a valid list", () => {
    expect(
      validateSubstituteRows([
        { substitute: 2, task: "Inbox" },
        { substitute: 3, task: "Calls" },
      ])
    ).toBeNull()
  })
})

describe("buildSubstitutesPayload", () => {
  it("drops incomplete rows and trims tasks", () => {
    expect(
      buildSubstitutesPayload([
        { substitute: 2, task: "  Inbox " },
        { substitute: null, task: "x" },
        { substitute: 3, task: " " },
      ])
    ).toEqual([{ substitute: 2, task: "Inbox" }])
  })
})

describe("history helpers", () => {
  it("maps known events to their own label and others to 'other'", () => {
    expect(historyActionKey({ kind: "request", action: "created" })).toBe("hr.detail.history.request_created")
    expect(historyActionKey({ kind: "substitute", action: "rejected" })).toBe(
      "hr.detail.history.substitute_rejected"
    )
    expect(historyActionKey({ kind: "kpi", action: "approved" })).toBe("hr.detail.history.other")
  })

  it("reads a comment or reason note", () => {
    expect(historyNote({ data: { comment: " busy " } })).toBe("busy")
    expect(historyNote({ data: { reason: "urgent" } })).toBe("urgent")
    expect(historyNote({ data: { substitutes: [1] } })).toBe("")
  })
})

describe("status mapping", () => {
  it("knows awaiting_substitutes and falls back to pending", () => {
    expect(leaveStatusKey("awaiting_substitutes")).toBe("shared.status.awaiting_substitutes")
    expect(leaveStatusKey("weird")).toBe("shared.status.pending")
    expect(leaveStatusVariant("rejected")).toBe("destructive")
  })
})

describe("parseIdParam / fieldErrors / moveItem", () => {
  it("parses ?id", () => {
    expect(parseIdParam("?id=12")).toBe(12)
    expect(parseIdParam("?id=abc")).toBeNull()
    expect(parseIdParam("?id=0")).toBeNull()
    expect(parseIdParam("")).toBeNull()
  })

  it("flattens DRF field errors", () => {
    const error = { response: { status: 400, data: { leave_type: ["Max 2 per month"], substitutes: "Needed" } } }
    expect(fieldErrors(error)).toEqual({ leave_type: "Max 2 per month", substitutes: "Needed" })
    expect(fieldErrors(new Error("x"))).toEqual({})
  })

  it("moves rows within bounds", () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3])
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3])
  })
})

describe("leaveTypeLimitError", () => {
  it("reads the code, limit and max a limit refusal carries", async () => {
    const { leaveTypeLimitError } = await import("@/app/(tenant)/leave/_lib/substitutes-utils")
    const error = {
      response: { data: { leave_type: ["English text"], code: ["leave_type_limit"], limit: ["per_month"], max: ["1"] } },
    }
    expect(leaveTypeLimitError(error)).toEqual({ limit: "per_month", max: "1" })
    expect(leaveTypeLimitError({ response: { data: { leave_type: ["x"] } } })).toBeNull()
    expect(leaveTypeLimitError({ response: { data: { code: "leave_type_limit", limit: "weird" } } })).toBeNull()
    expect(leaveTypeLimitError(new Error("x"))).toBeNull()
  })
})
