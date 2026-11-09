import React, { useState } from "react"
import { describe, it, expect, vi } from "vitest"
import { fireEvent, screen, within } from "@testing-library/react"
import { Plus, Settings } from "lucide-react"
import {
  FieldRow,
  LeaveHeaderBridge,
  LeaveTable,
  RequestStatusPill,
  SectionCard,
  Segmented,
  StatGrid,
  StatStrip,
  TonePill,
  LeaveTypeChip,
  PersonCell,
  LeaveErrorState,
  type LeaveColumn,
} from "@/app/(tenant)/leave/_components/ui"
import { FeatureGate } from "@/app/(tenant)/leave/_components/FeatureGate"
import { MonthPicker } from "@/app/(tenant)/leave/_components/MonthPicker"
import { LeaveStatusBadge } from "@/app/(tenant)/leave/_components/LeaveStatusBadge"
import { NextIntlClientProvider } from "next-intl"
import { HeaderActionsProvider } from "@/contexts/HeaderActionsContext"
import { HeaderOutlet, messages, renderLeave } from "./lv00-helpers"

interface Row {
  id: number
  name: string
  status: string
  days: string
}

const rows: Row[] = [
  { id: 1, name: "Nino Beridze", status: "pending", days: "5.0" },
  { id: 2, name: "Luka Tsiklauri", status: "approved", days: "0.5" },
]

const columns: LeaveColumn<Row>[] = [
  { id: "name", header: "Employee", width: "minmax(0,1fr)", mobile: "title", cell: (r) => <PersonCell name={r.name} /> },
  { id: "days", header: "Days", width: "60px", align: "end", mobile: "meta", cell: (r) => r.days },
  { id: "status", header: "Status", width: "140px", mobile: "end", cell: (r) => <RequestStatusPill status={r.status} /> },
  {
    id: "actions",
    header: "",
    width: "90px",
    mobile: "actions",
    cell: (r) => (
      <button type="button" data-testid={`act-${r.id}`}>
        Act
      </button>
    ),
  },
]

describe("LeaveTable", () => {
  it("renders the header, rows and keeps desktop column order through CSS order", () => {
    renderLeave(<LeaveTable ariaLabel="Requests" columns={columns} rows={rows} rowKey={(r) => r.id} />)
    const table = screen.getByRole("table", { name: "Requests" })
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Employee", "Days", "Status", ""])
    const [first] = screen.getAllByTestId("leave-table-row")
    const cells = within(first).getAllByRole("cell")
    // DOM order groups by mobile line (title+end, meta, actions); `order` restores the column order.
    expect(cells.map((c) => c.style.order)).toEqual(["0", "2", "1", "3"])
    expect(table.style.getPropertyValue("--leave-cols")).toBe("minmax(0,1fr) 60px 140px 90px")
  })

  it("opens a row on click and Enter, but not from a button inside it", () => {
    const open = vi.fn()
    renderLeave(<LeaveTable ariaLabel="Requests" columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={open} />)
    const [first, second] = screen.getAllByTestId("leave-table-row")
    fireEvent.click(within(first).getByText("Nino Beridze"))
    expect(open).toHaveBeenLastCalledWith(rows[0])
    fireEvent.keyDown(second, { key: "Enter" })
    expect(open).toHaveBeenLastCalledWith(rows[1])
    open.mockClear()
    fireEvent.click(screen.getByTestId("act-1"))
    expect(open).not.toHaveBeenCalled()
    expect(first).toHaveAttribute("tabindex", "0")
  })

  it("shows the skeleton while loading, the empty node, and the error with retry", () => {
    const retry = vi.fn()
    const { rerender } = renderLeave(
      <LeaveTable ariaLabel="T" columns={columns} rows={undefined} rowKey={(r) => r.id} />
    )
    expect(screen.getByTestId("leave-table-skeleton")).toBeInTheDocument()
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true")

    rerender(<Wrap><LeaveTable ariaLabel="T" columns={columns} rows={[]} rowKey={(r) => r.id} empty={<p>Nothing here</p>} /></Wrap>)
    expect(screen.getByText("Nothing here")).toBeInTheDocument()

    rerender(<Wrap><LeaveTable ariaLabel="T" columns={columns} rows={[]} rowKey={(r) => r.id} error={new Error("x")} onRetry={retry} /></Wrap>)
    expect(screen.getByText("Couldn't load the data")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(retry).toHaveBeenCalled()
  })
})

// rerender() replaces the whole tree, so wrap again in the intl provider.
function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages.en} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  )
}

describe("Segmented", () => {
  function Harness() {
    const [v, setV] = useState<"all" | "pending" | "done">("all")
    return (
      <Segmented
        ariaLabel="Status"
        value={v}
        onChange={setV}
        options={[
          { value: "all", label: "All" },
          { value: "pending", label: "Pending", count: 3 },
          { value: "done", label: "Done", disabled: true },
        ]}
      />
    )
  }
  it("selects on click and moves with arrow keys, skipping disabled options", () => {
    renderLeave(<Harness />)
    const group = screen.getByRole("radiogroup", { name: "Status" })
    const [all, pending] = within(group).getAllByRole("radio")
    expect(all).toHaveAttribute("aria-checked", "true")
    expect(pending).toHaveTextContent("Pending3")
    fireEvent.keyDown(all, { key: "ArrowRight" })
    expect(pending).toHaveAttribute("aria-checked", "true")
    fireEvent.keyDown(pending, { key: "ArrowRight" })
    expect(all).toHaveAttribute("aria-checked", "true")
    fireEvent.click(pending)
    expect(pending).toHaveAttribute("aria-checked", "true")
  })
})

describe("pills", () => {
  it("translates request statuses in both locales with the status tone", () => {
    renderLeave(<RequestStatusPill status="awaiting_substitutes" />)
    const pill = screen.getByTestId("leave-status-pill")
    expect(pill).toHaveTextContent("Awaiting substitutes")
    expect(pill).toHaveAttribute("data-tone", "violet")
  })
  it("Georgian status text", () => {
    renderLeave(<LeaveStatusBadge status="approved" />, "ka")
    const pill = screen.getByTestId("leave-status-pill")
    expect(pill).toHaveAttribute("data-tone", "success")
    expect(pill.textContent).toBe((messages.ka as { leave: { shared: { status: Record<string, string> } } }).leave.shared.status.approved)
    expect(pill.textContent).not.toMatch(/[A-Za-z]/)
  })
  it("tone pill and type chip", () => {
    renderLeave(
      <>
        <TonePill tone="danger">Returned</TonePill>
        <LeaveTypeChip name="Vacation" color="javascript:alert(1)" />
        <LeaveTypeChip name="Sick" color="#ef4444" variant="chip" />
      </>
    )
    expect(screen.getByText("Returned").parentElement).toHaveAttribute("data-tone", "danger")
    const dots = document.querySelectorAll("span[aria-hidden].rounded-full")
    expect((dots[0] as HTMLElement).style.backgroundColor).toBe("")
    expect((dots[1] as HTMLElement).style.backgroundColor).toBe("rgb(239, 68, 68)")
  })
})

describe("stats", () => {
  it("shows a dash for values that did not load", () => {
    renderLeave(
      <>
        <StatStrip items={[{ key: "a", label: "Pending", value: null }, { key: "b", label: "Approved", value: 4 }]} />
        <StatGrid items={[{ key: "c", label: "Remaining", value: "12.5", hint: "days" }]} />
      </>
    )
    expect(screen.getByText("Pending").nextSibling).toHaveTextContent("—")
    expect(screen.getByText("Approved").nextSibling).toHaveTextContent("4")
    expect(screen.getByText("12.5")).toBeInTheDocument()
    expect(screen.getByText("days")).toBeInTheDocument()
  })
  it("clickable tiles are buttons", () => {
    const go = vi.fn()
    renderLeave(<StatStrip items={[{ key: "a", label: "Team pending", value: 2, onClick: go }]} />)
    fireEvent.click(screen.getByRole("button", { name: /Team pending/ }))
    expect(go).toHaveBeenCalled()
  })
})

describe("SectionCard / FieldRow", () => {
  it("labels the section and links the field label to its control", () => {
    renderLeave(
      <SectionCard title="Approval" hint="who signs off">
        <FieldRow label="Manager approval" help="Managers approve first" htmlFor="mgr">
          <input id="mgr" type="checkbox" />
        </FieldRow>
      </SectionCard>
    )
    expect(screen.getByRole("region", { name: "Approval" })).toBeInTheDocument()
    expect(screen.getByText("· who signs off")).toBeInTheDocument()
    expect(screen.getByLabelText("Manager approval")).toHaveAttribute("id", "mgr")
  })
})

describe("LeaveHeaderBridge", () => {
  it("publishes title extras and calls the latest click handler", () => {
    const first = vi.fn()
    const second = vi.fn()
    function Page({ onNew }: { onNew: () => void }) {
      return (
        <LeaveHeaderBridge
          sub="3 pending"
          primary={{ label: "New request", icon: Plus, onClick: onNew, testId: "new" }}
          secondary={[{ label: "Settings", icon: Settings, href: "/settings/leave" }]}
        />
      )
    }
    const { rerender } = renderLeave(<Page onNew={first} />)
    expect(screen.getByTestId("outlet-meta")).toHaveTextContent("· 3 pending")
    expect(within(screen.getByTestId("outlet-icons")).getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings/leave"
    )
    rerender(
      <HeaderStub>
        <Page onNew={second} />
      </HeaderStub>
    )
    fireEvent.click(screen.getByTestId("new"))
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })

  it("clears the slot on unmount", () => {
    const { rerender } = renderLeave(<LeaveHeaderBridge breadcrumb="Report" />)
    expect(screen.getByTestId("outlet-breadcrumb")).toHaveTextContent("Report")
    rerender(<HeaderStub>{null}</HeaderStub>)
    expect(screen.getByTestId("outlet-breadcrumb")).toBeEmptyDOMElement()
  })
})

function HeaderStub({ children }: { children: React.ReactNode }) {
  return (
    <HeaderActionsProvider>
      <HeaderOutlet />
      <Wrap>{children}</Wrap>
    </HeaderActionsProvider>
  )
}

describe("shared leave components", () => {
  it("MonthPicker shifts the period and shows Georgian month names", () => {
    const change = vi.fn()
    renderLeave(<MonthPicker value="2026-01" onChange={change} />, "ka")
    expect(screen.getByTestId("leave-month-picker")).toHaveTextContent("იანვარი 2026")
    fireEvent.click(screen.getByRole("button", { name: "წინა თვე" }))
    expect(change).toHaveBeenLastCalledWith("2025-12")
    fireEvent.click(screen.getByRole("button", { name: "შემდეგი თვე" }))
    expect(change).toHaveBeenLastCalledWith("2026-02")
    fireEvent.change(screen.getByLabelText("იანვარი 2026"), { target: { value: "2026-05" } })
    expect(change).toHaveBeenLastCalledWith("2026-05")
  })

  it("FeatureGate: loading, off, on", () => {
    const { rerender } = renderLeave(
      <FeatureGate loaded={false} allowed={false}>
        <p>secret</p>
      </FeatureGate>
    )
    expect(screen.getByRole("status")).toBeInTheDocument()
    rerender(
      <Wrap>
        <FeatureGate loaded allowed={false}>
          <p>secret</p>
        </FeatureGate>
      </Wrap>
    )
    expect(screen.getByTestId("leave-feature-off")).toHaveTextContent("This feature is turned off in leave settings.")
    expect(screen.queryByText("secret")).toBeNull()
    rerender(
      <Wrap>
        <FeatureGate loaded allowed>
          <p>secret</p>
        </FeatureGate>
      </Wrap>
    )
    expect(screen.getByText("secret")).toBeInTheDocument()
  })

  it("LeaveErrorState never shows the raw (often English) error, only translated text", () => {
    renderLeave(<LeaveErrorState error={new Error("Network Error")} />, "ka")
    const box = screen.getByTestId("leave-error")
    expect(box).toHaveAttribute("title", "Network Error")
    expect(box.textContent).not.toMatch(/[A-Za-z]/)
    expect(box).toHaveTextContent("მონაცემები ვერ ჩაიტვირთა")
  })

  it("LeaveErrorState shows 'no access' without a retry for a 403", () => {
    const onRetry = vi.fn()
    const forbidden = Object.assign(new Error("Request failed with status code 403"), { response: { status: 403 } })
    const { unmount } = renderLeave(<LeaveErrorState error={forbidden} onRetry={onRetry} />, "ka")
    const box = screen.getByTestId("leave-error")
    expect(box).toHaveAttribute("data-forbidden", "true")
    expect(box).toHaveTextContent("ამ გვერდზე წვდომა არ გაქვთ")
    expect(box.textContent).not.toMatch(/[A-Za-z]/)
    expect(screen.queryByRole("button")).toBeNull()
    unmount()
    renderLeave(<LeaveErrorState error={new Error("Network Error")} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("FeatureGate says 'no access' when the feature is on but the role is missing", () => {
    renderLeave(
      <FeatureGate loaded allowed={false} featureOn>
        <p>secret</p>
      </FeatureGate>
    )
    expect(screen.getByTestId("leave-no-access")).toHaveTextContent("You don't have access to this page")
    expect(screen.queryByTestId("leave-feature-off")).toBeNull()
    expect(screen.queryByText("secret")).toBeNull()
  })
})

describe("lv-00 pending catalog", () => {
  it("every leave.ui key exists in both locales with no Latin text in Georgian", () => {
    const en = (messages.en as { leave: { ui: Record<string, string> } }).leave.ui
    const ka = (messages.ka as { leave: { ui: Record<string, string> } }).leave.ui
    expect(Object.keys(ka).sort()).toEqual(Object.keys(en).sort())
    for (const [k, v] of Object.entries(ka)) {
      const text = v.replace(/\{[^}]*\}/g, "")
      expect(text, k).not.toMatch(/[A-Za-z]/)
    }
  })
})
