import { describe, it, expect } from "vitest"
import {
  classifyAttendanceCell,
  dayOfMonth,
  departmentNames,
  isMutedDay,
  summarizeCells,
} from "@/app/(tenant)/leave/_lib/attendance-utils"
import { deepLinkId, formatKpiValue, isValidKpiNumber, summarizeKpis } from "@/app/(tenant)/leave/_lib/kpi-utils"
import type { AttendanceLegendItem } from "@/app/(tenant)/leave/_lib/hr-api"

const legend: AttendanceLegendItem = { code: "leave:3", leave_type: 3, name: "Vacation", color: "#00f", is_paid: true }
const legendMap = new Map([[legend.code, legend]])

describe("classifyAttendanceCell", () => {
  it("maps plain codes", () => {
    for (const code of ["worked", "off", "future", "not_employed"] as const) {
      expect(classifyAttendanceCell(code, legendMap).kind).toBe(code)
    }
  })
  it("resolves leave codes to their legend entry", () => {
    const cell = classifyAttendanceCell("leave:3", legendMap)
    expect(cell.kind).toBe("leave")
    expect(cell.legend?.color).toBe("#00f")
  })
  it("keeps unknown leave types as leave without legend", () => {
    expect(classifyAttendanceCell("leave:99", legendMap)).toEqual({ kind: "leave", legend: undefined })
  })
  it("treats missing / unexpected codes as unknown", () => {
    expect(classifyAttendanceCell(undefined, legendMap).kind).toBe("unknown")
    expect(classifyAttendanceCell("weird", legendMap).kind).toBe("unknown")
  })
})

describe("attendance helpers", () => {
  it("reads the day of month without timezone shift", () => {
    expect(dayOfMonth("2026-11-01")).toBe(1)
    expect(dayOfMonth("2026-11-30")).toBe(30)
  })
  it("mutes weekends and holidays", () => {
    expect(isMutedDay({ kind: "working" })).toBe(false)
    expect(isMutedDay({ kind: "weekend" })).toBe(true)
    expect(isMutedDay({ kind: "holiday" })).toBe(true)
  })
  it("summarizes worked and leave days", () => {
    expect(
      summarizeCells({ a: "worked", b: "worked", c: "leave:3", d: "off", e: "future" })
    ).toEqual({ worked: 2, leave: 1 })
  })
  it("lists unique department names", () => {
    expect(
      departmentNames([
        { user: { department: "Sales" } },
        { user: { department: null } },
        { user: { department: "Ops" } },
        { user: { department: "Sales" } },
      ])
    ).toEqual(["Ops", "Sales"])
  })
})

describe("kpi helpers", () => {
  it("validates KPI numbers", () => {
    expect(isValidKpiNumber("0")).toBe(true)
    expect(isValidKpiNumber("12.5")).toBe(true)
    expect(isValidKpiNumber(" 7.25 ")).toBe(true)
    expect(isValidKpiNumber("-1")).toBe(false)
    expect(isValidKpiNumber("1.234")).toBe(false)
    expect(isValidKpiNumber("abc")).toBe(false)
    expect(isValidKpiNumber("")).toBe(false)
  })
  it("formats values with unit", () => {
    expect(formatKpiValue("120.00", "calls")).toBe("120 calls")
    expect(formatKpiValue("12.50", "%")).toBe("12.5 %")
    expect(formatKpiValue(null, "calls")).toBe("—")
    expect(formatKpiValue("5", "")).toBe("5")
  })
  it("summarizes goals", () => {
    expect(
      summarizeKpis([
        { status: "approved", target_met: true },
        { status: "pending", target_met: false },
        { status: "draft", target_met: null },
      ])
    ).toEqual({ total: 3, approved: 1, pending: 1, met: 1 })
  })
  it("parses the ?id deep link", () => {
    expect(deepLinkId("?id=42")).toBe(42)
    expect(deepLinkId("?id=abc")).toBeNull()
    expect(deepLinkId("")).toBeNull()
  })
})
