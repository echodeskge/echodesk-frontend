/** Shared field components: HoursGrid and EditableTable. */
import React, { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"

vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }))

import {
  EditableTable,
  HoursGrid,
  defaultHours,
  normalizeHours,
  type EditableColumn,
  type HoursValue,
} from "@/app/(tenant)/onboarding/_components/fields"
import { renderOnb } from "./helpers"

function Hours({ onChange, initial }: { onChange: (v: HoursValue) => void; initial?: HoursValue }) {
  const [value, set] = useState<HoursValue>(initial ?? defaultHours())
  return (
    <HoursGrid
      value={value}
      onChange={(v) => {
        set(v)
        onChange(v)
      }}
    />
  )
}

describe("HoursGrid", () => {
  it("defaults to Mon–Fri 09:00–18:00 and weekend closed", () => {
    expect(defaultHours()).toEqual({
      mon: { from: "09:00", to: "18:00", break_from: null, break_to: null },
      tue: { from: "09:00", to: "18:00", break_from: null, break_to: null },
      wed: { from: "09:00", to: "18:00", break_from: null, break_to: null },
      thu: { from: "09:00", to: "18:00", break_from: null, break_to: null },
      fri: { from: "09:00", to: "18:00", break_from: null, break_to: null },
      sat: null,
      sun: null,
    })
  })

  it("normalises a partial prefill", () => {
    const v = normalizeHours({ mon: { from: "10:00" }, sat: { from: "10:00", to: "14:00", break_from: "12:00", break_to: "12:30" }, sun: null, bogus: 1 })
    expect(v.mon).toEqual({ from: "10:00", to: "18:00", break_from: null, break_to: null })
    expect(v.sat).toEqual({ from: "10:00", to: "14:00", break_from: "12:00", break_to: "12:30" })
    expect(v.sun).toBeNull()
    expect(v.tue).toEqual({ from: "09:00", to: "18:00", break_from: null, break_to: null })
    expect(normalizeHours(undefined)).toEqual(defaultHours())
  })

  it("returns {day: {from, to, break_from, break_to} | null}", () => {
    const onChange = vi.fn()
    renderOnb(<Hours onChange={onChange} />)
    const last = () => onChange.mock.calls[onChange.mock.calls.length - 1][0] as HoursValue

    fireEvent.change(screen.getByTestId("hours-grid-mon-from"), { target: { value: "10:00" } })
    fireEvent.change(screen.getByTestId("hours-grid-mon-to"), { target: { value: "19:00" } })
    expect(last().mon).toEqual({ from: "10:00", to: "19:00", break_from: null, break_to: null })

    fireEvent.click(screen.getByTestId("hours-grid-mon-break"))
    expect(last().mon).toEqual({ from: "10:00", to: "19:00", break_from: "13:00", break_to: "14:00" })
    fireEvent.change(screen.getByTestId("hours-grid-mon-break-to"), { target: { value: "14:30" } })
    expect(last().mon?.break_to).toBe("14:30")

    // Closing a day gives null; opening it again gives the default hours.
    fireEvent.click(screen.getByTestId("hours-grid-fri-toggle"))
    expect(last().fri).toBeNull()
    expect(screen.getByTestId("hours-grid-fri")).toHaveTextContent("Closed")
    fireEvent.click(screen.getByTestId("hours-grid-sat-toggle"))
    expect(last().sat).toEqual({ from: "09:00", to: "18:00", break_from: null, break_to: null })

    // Copy Monday to every day.
    fireEvent.click(screen.getByTestId("hours-grid-copy"))
    for (const day of ["tue", "wed", "thu", "fri", "sat", "sun"] as const) {
      expect(last()[day]).toEqual({ from: "10:00", to: "19:00", break_from: "13:00", break_to: "14:30" })
    }
  })
})

interface Row {
  name: string
  duration: number | null
  kind: string | null
}

const COLUMNS: EditableColumn<Row>[] = [
  { key: "name", label: "Name", placeholder: "Service" },
  { key: "duration", label: "Minutes", type: "number", width: "90px" },
  { key: "kind", label: "Kind", type: "select", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }], placeholder: "—" },
]

function Table({ onChange, rowErrors, minRows }: { onChange: (r: Row[]) => void; rowErrors?: Array<Record<string, unknown>>; minRows?: number }) {
  const [rows, set] = useState<Row[]>([{ name: "Cut", duration: 30, kind: "a" }])
  return (
    <EditableTable<Row>
      label="Services"
      columns={COLUMNS}
      rows={rows}
      onChange={(r) => {
        set(r)
        onChange(r)
      }}
      newRow={() => ({ name: "", duration: null, kind: null })}
      rowErrors={rowErrors}
      minRows={minRows}
      addLabel="Add service"
    />
  )
}

describe("EditableTable", () => {
  it("adds, edits and removes rows; numbers and empty selects become numbers / null", () => {
    const onChange = vi.fn()
    renderOnb(<Table onChange={onChange} />)
    const last = () => onChange.mock.calls[onChange.mock.calls.length - 1][0] as Row[]

    fireEvent.click(screen.getByRole("button", { name: "Add service" }))
    expect(last()).toEqual([
      { name: "Cut", duration: 30, kind: "a" },
      { name: "", duration: null, kind: null },
    ])

    fireEvent.change(screen.getByTestId("editable-table-row-1-name"), { target: { value: "Colour" } })
    fireEvent.change(screen.getByTestId("editable-table-row-1-duration"), { target: { value: "45" } })
    fireEvent.change(screen.getByTestId("editable-table-row-1-kind"), { target: { value: "b" } })
    expect(last()[1]).toEqual({ name: "Colour", duration: 45, kind: "b" })

    fireEvent.change(screen.getByTestId("editable-table-row-0-kind"), { target: { value: "" } })
    expect(last()[0].kind).toBeNull()

    fireEvent.click(screen.getByTestId("editable-table-row-0-remove"))
    expect(last()).toEqual([{ name: "Colour", duration: 45, kind: "b" }])
  })

  it("shows row errors next to the cell and respects minRows", () => {
    renderOnb(<Table onChange={() => {}} rowErrors={[{ name: ["Required"] }]} minRows={1} />)
    expect(screen.getByTestId("editable-table-row-0")).toHaveTextContent("Required")
    expect(screen.getByTestId("editable-table-row-0-name")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByTestId("editable-table-row-0-remove")).toBeDisabled()
  })
})
