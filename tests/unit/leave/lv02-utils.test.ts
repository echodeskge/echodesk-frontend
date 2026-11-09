import { describe, it, expect } from "vitest"
import {
  approvalSteps,
  canDecideRequest,
  detailTypeName,
  filterTeamRequests,
  matchesRequestSearch,
  teamRequestStats,
} from "@/app/(tenant)/leave/_lib/lv02-utils"
import type { LeaveRequestDetail } from "@/app/(tenant)/leave/_lib/hr-api"

const row = (id: number, status: string, employee = 10, name = "Nino Beridze", type = "Annual vacation") => ({
  id,
  employee,
  employee_name: name,
  leave_type_name: type,
  status,
})

describe("canDecideRequest", () => {
  it("only pending requests can be decided", () => {
    expect(canDecideRequest({ status: "pending", employee: 10 }, 2, false)).toBe(true)
    for (const s of ["awaiting_substitutes", "manager_approved", "hr_approved", "approved", "rejected", "cancelled"]) {
      expect(canDecideRequest({ status: s, employee: 10 }, 2, false)).toBe(false)
    }
  })

  it("nobody but a superuser decides on their own request", () => {
    expect(canDecideRequest({ status: "pending", employee: 2 }, 2, false)).toBe(false)
    expect(canDecideRequest({ status: "pending", employee: 2 }, 2, true)).toBe(true)
  })
})

describe("teamRequestStats", () => {
  it("counts pending, keeps the server total and counts every *approved status", () => {
    const rows = [
      row(1, "pending"),
      row(2, "pending"),
      row(3, "manager_approved"),
      row(4, "hr_approved"),
      row(5, "approved"),
      row(6, "rejected"),
    ]
    expect(teamRequestStats(rows, 42)).toEqual({ pending: 2, total: 42, approved: 3 })
  })
})

describe("search and team filter", () => {
  it("matches the employee or the type, case-insensitive, Georgian too", () => {
    expect(matchesRequestSearch(row(1, "pending"), "  nINO ")).toBe(true)
    expect(matchesRequestSearch(row(1, "pending"), "vacation")).toBe(true)
    expect(matchesRequestSearch(row(1, "pending", 1, "ნინო ბერიძე", "ავადმყოფობა"), "ბერი")).toBe(true)
    expect(matchesRequestSearch(row(1, "pending"), "luka")).toBe(false)
    expect(matchesRequestSearch(row(1, "pending"), "")).toBe(true)
  })

  it("Pending shows only pending rows, All shows everything; both apply the search", () => {
    const rows = [row(1, "pending"), row(2, "approved"), row(3, "pending", 11, "Luka Tsiklauri")]
    expect(filterTeamRequests(rows, "pending", "").map((r) => r.id)).toEqual([1, 3])
    expect(filterTeamRequests(rows, "all", "").map((r) => r.id)).toEqual([1, 2, 3])
    expect(filterTeamRequests(rows, "all", "luka").map((r) => r.id)).toEqual([3])
  })
})

describe("approvalSteps / detailTypeName", () => {
  const base = {
    id: 1,
    employee: 3,
    employee_name: "Mariam Lomidze",
    leave_type: 1,
    start_date: "2026-11-16",
    end_date: "2026-11-20",
    total_days: "5.0",
    reason: "",
    status: "approved",
    created_at: "2026-11-01T10:00:00Z",
  } satisfies LeaveRequestDetail

  it("keeps workflow order and drops steps without an approver", () => {
    const steps = approvalSteps({
      ...base,
      manager_approver_name: "Giorgi",
      manager_approved_at: "2026-11-02T09:00:00Z",
      manager_comments: "ok",
      final_approver_name: "Nino",
      final_approved_at: "2026-11-03T09:00:00Z",
    })
    expect(steps.map((s) => s.key)).toEqual(["manager", "final"])
    expect(steps[0]).toEqual({ key: "manager", name: "Giorgi", at: "2026-11-02T09:00:00Z", note: "ok" })
    expect(steps[1].note).toBe("")
  })

  it("reads the localised name, then the raw name, then the code", () => {
    expect(detailTypeName({ ...base, leave_type_details: { id: 1, name_display: "შვებულება", name: { en: "x" }, code: "VAC" } })).toBe("შვებულება")
    expect(detailTypeName({ ...base, leave_type_details: { id: 1, name: "Vacation", code: "VAC" } })).toBe("Vacation")
    expect(detailTypeName({ ...base, leave_type_details: { id: 1, name: { en: "x" }, code: "VAC" } })).toBe("VAC")
    expect(detailTypeName(null)).toBe("")
  })
})
