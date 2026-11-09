import React, { useState } from "react"
import { describe, it, expect, vi } from "vitest"
import { fireEvent, screen, within } from "@testing-library/react"
import { Plus, Download } from "lucide-react"
import {
  ActivePill,
  BulkBar,
  DetailLayout,
  EcErrorState,
  EcPagination,
  EcTable,
  EcommerceHeaderBridge,
  FormField,
  FormSection,
  FormSheet,
  IdText,
  InfoCard,
  InfoRows,
  MoneyCell,
  OrderStatusPill,
  PaymentStatusPill,
  ProductStatusPill,
  ProductThumb,
  PromoStatePill,
  ReviewStatusPill,
  SummaryRows,
  selectionColumn,
  type EcColumn,
} from "@/app/(tenant)/ecommerce/_components/ui"
import { SectionError } from "@/components/ecommerce/SectionError"
import { renderEc } from "./ec00-helpers"

interface Row {
  id: number
  number: string
  status: string
  total: string
}
const rows: Row[] = [
  { id: 21, number: "ORD-1021", status: "delivered", total: "356.4" },
  { id: 22, number: "ORD-1022", status: "pending", total: "1200" },
]
const columns: EcColumn<Row>[] = [
  { id: "number", header: "Order", width: "120px", mobile: "title", cell: (r) => <IdText>#{r.number}</IdText> },
  { id: "total", header: "Total", width: "100px", align: "end", mobile: "end", cell: (r) => <MoneyCell value={r.total} /> },
  { id: "status", header: "Status", width: "120px", mobile: "meta", cell: (r) => <OrderStatusPill status={r.status} /> },
]

describe("EcTable", () => {
  it("renders rows with ec test ids, the grid variable and money cells", () => {
    renderEc(<EcTable ariaLabel="Orders" columns={columns} rows={rows} rowKey={(r) => r.id} />)
    const table = screen.getByRole("table", { name: "Orders" })
    expect(table.style.getPropertyValue("--rd-cols")).toBe("120px 100px 120px")
    expect(table.style.getPropertyValue("--ec-cols")).toBe("120px 100px 120px")
    const [first, second] = screen.getAllByTestId("ec-table-row")
    expect(first).toHaveTextContent("#ORD-1021")
    expect(first).toHaveTextContent("₾356.40")
    expect(first).toHaveTextContent("Delivered")
    expect(second).toHaveTextContent("₾1,200.00")
  })

  it("shows the skeleton while loading, the empty node, and a translated error with retry", () => {
    const { rerender } = renderEc(<EcTable ariaLabel="Orders" columns={columns} rows={undefined} rowKey={(r) => r.id} />)
    expect(screen.getByTestId("ec-table-skeleton")).toBeInTheDocument()
    rerender(<EcTable ariaLabel="Orders" columns={columns} rows={[]} rowKey={(r) => r.id} empty={<p>No orders</p>} />)
    expect(screen.getByTestId("ec-table-empty")).toHaveTextContent("No orders")
  })

  it("shows the error state in Georgian, with retry, and no retry for a 403", () => {
    const retry = vi.fn()
    const { unmount } = renderEc(
      <EcTable ariaLabel="Orders" columns={columns} rows={[]} rowKey={(r) => r.id} error={new Error("Network Error")} onRetry={retry} />,
      "ka"
    )
    const err = screen.getByTestId("ec-error")
    expect(err).toHaveTextContent("გვერდი ვერ ჩაიტვირთა")
    expect(err).not.toHaveTextContent("Network Error")
    fireEvent.click(within(err).getByRole("button", { name: "ხელახლა ცდა" }))
    expect(retry).toHaveBeenCalledTimes(1)
    unmount()
    renderEc(<EcErrorState error={{ response: { status: 403 } }} onRetry={retry} />)
    expect(screen.getByTestId("ec-error")).toHaveAttribute("data-forbidden", "true")
    expect(screen.getByTestId("ec-error")).toHaveTextContent("No access")
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("selects rows through the selection column without opening them", () => {
    const open = vi.fn()
    function Harness() {
      const [sel, setSel] = useState<Set<number>>(new Set())
      const cols = [
        selectionColumn<Row>({
          rows,
          getId: (r) => r.id,
          selected: sel,
          onChange: setSel,
          selectAllLabel: "Select all",
          selectRowLabel: (r) => `Select ${r.number}`,
        }),
        ...columns,
      ]
      return (
        <>
          <BulkBar count={sel.size} label={`${sel.size} selected`} clearLabel="Clear" onClear={() => setSel(new Set())}>
            <button type="button">Mark shipped</button>
          </BulkBar>
          <EcTable ariaLabel="Orders" columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={open} />
        </>
      )
    }
    renderEc(<Harness />)
    fireEvent.click(screen.getByRole("checkbox", { name: "Select ORD-1021" }))
    expect(open).not.toHaveBeenCalled()
    expect(screen.getByTestId("ec-bulk-bar")).toHaveTextContent("1 selected")
    expect(screen.getByRole("checkbox", { name: "Select all" })).toHaveAttribute("data-state", "indeterminate")
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }))
    expect(screen.getByTestId("ec-bulk-bar")).toHaveTextContent("2 selected")
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.queryByTestId("ec-bulk-bar")).toBeNull()
  })
})

describe("pills", () => {
  it("labels every status in Georgian", () => {
    renderEc(
      <div>
        <OrderStatusPill status="shipped" />
        <PaymentStatusPill status="partially_refunded" />
        <ProductStatusPill status="out_of_stock" />
        <ReviewStatusPill approved={false} />
        <PromoStatePill state="maxedOut" />
        <ActivePill active />
      </div>,
      "ka"
    )
    expect(screen.getByTestId("ec-order-status")).toHaveTextContent("გაგზავნილი")
    expect(screen.getByTestId("ec-order-status")).toHaveAttribute("data-tone", "violet")
    expect(screen.getByTestId("ec-payment-status").textContent).not.toMatch(/[A-Za-z]/)
    expect(screen.getByTestId("ec-product-status").textContent).not.toMatch(/[A-Za-z]/)
    expect(screen.getByTestId("ec-review-status")).toHaveAttribute("data-tone", "warning")
    expect(screen.getByTestId("ec-promo-state").textContent).not.toMatch(/[A-Za-z]/)
    expect(screen.getByTestId("ec-active")).toHaveTextContent("აქტიური")
  })

  it("falls back to a readable label for an unknown status", () => {
    renderEc(<OrderStatusPill status="on_hold" />)
    expect(screen.getByTestId("ec-order-status")).toHaveTextContent("On hold")
  })
})

describe("EcommerceHeaderBridge", () => {
  it("publishes the crumb, sub and primary action to the app header", () => {
    const onClick = vi.fn()
    renderEc(
      <EcommerceHeaderBridge
        breadcrumb="#ORD-1021"
        sub="25 orders"
        primary={{ label: "Add product", icon: Plus, onClick }}
        secondary={[{ label: "Export CSV", icon: Download, onClick: vi.fn() }]}
      />
    )
    expect(screen.getByTestId("ec-header-crumb")).toHaveTextContent("#ORD-1021")
    expect(screen.getByTestId("ec-header-sub")).toHaveTextContent("· 25 orders")
    fireEvent.click(within(screen.getByTestId("outlet-primary")).getByRole("button", { name: "Add product" }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(within(screen.getByTestId("outlet-icons")).getByRole("button", { name: "Export CSV" })).toBeInTheDocument()
  })
})

describe("EcPagination", () => {
  it("shows the range, page and moves pages", () => {
    const onPage = vi.fn()
    const onSize = vi.fn()
    renderEc(<EcPagination page={2} pageSize={20} totalCount={45} onPageChange={onPage} onPageSizeChange={onSize} />)
    const p = screen.getByTestId("ec-pagination")
    expect(p).toHaveTextContent("21–40 of 45")
    expect(p).toHaveTextContent("Page 2 of 3")
    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }))
    expect(onPage).toHaveBeenLastCalledWith(3)
    fireEvent.click(screen.getByRole("button", { name: "Go to previous page" }))
    expect(onPage).toHaveBeenLastCalledWith(1)
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "50" } })
    expect(onSize).toHaveBeenCalledWith(50)
  })

  it("disables the edges and shows the selection count in Georgian", () => {
    renderEc(<EcPagination page={1} pageSize={20} totalCount={5} selectedCount={3} onPageChange={vi.fn()} />, "ka")
    expect(screen.getByTestId("ec-pagination")).toHaveTextContent("მონიშნულია 3")
    expect(screen.getByRole("button", { name: "წინა გვერდი" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "შემდეგი გვერდი" })).toBeDisabled()
    expect(screen.queryByRole("combobox")).toBeNull()
  })
})

describe("FormSheet", () => {
  it("submits on the primary button and closes on cancel", () => {
    const submit = vi.fn()
    const change = vi.fn()
    renderEc(
      <FormSheet open onOpenChange={change} title="Add promo code" description="Create a code" onSubmit={submit} submitLabel="Create">
        <FormSection title="Discount" hint="Applied at checkout">
          <FormField label="Code" htmlFor="code" required error="Code is required">
            <input id="code" />
          </FormField>
        </FormSection>
      </FormSheet>
    )
    const sheet = screen.getByTestId("ec-form-sheet")
    expect(within(sheet).getByText("Add promo code")).toBeInTheDocument()
    expect(within(sheet).getByRole("alert")).toHaveTextContent("Code is required")
    expect(within(sheet).getByLabelText(/Code/)).toBeInTheDocument()
    fireEvent.click(within(sheet).getByRole("button", { name: "Create" }))
    expect(submit).toHaveBeenCalledTimes(1)
    fireEvent.click(within(sheet).getByRole("button", { name: "Cancel" }))
    expect(change).toHaveBeenCalledWith(false)
  })

  it("does not submit while saving", () => {
    const submit = vi.fn()
    renderEc(
      <FormSheet open onOpenChange={vi.fn()} title="Edit" onSubmit={submit} submitting>
        <input />
      </FormSheet>
    )
    expect(screen.getByTestId("ec-form-submit")).toBeDisabled()
  })
})

describe("display bits", () => {
  it("MoneyCell shows the old price only when it is higher", () => {
    renderEc(
      <div>
        <MoneyCell value="80" compare="100" testId="m1" />
        <MoneyCell value="80" compare="60" testId="m2" />
        <MoneyCell value="10" negative testId="m3" />
      </div>
    )
    expect(screen.getByTestId("m1")).toHaveTextContent("₾80.00₾100.00")
    expect(screen.getByTestId("m2")).toHaveTextContent(/^₾80\.00$/)
    expect(screen.getByTestId("m3")).toHaveTextContent("-₾10.00")
  })

  it("ProductThumb falls back to an icon without an image or on a load error", () => {
    renderEc(
      <div>
        <ProductThumb src={null} alt="Wallet" />
        <ProductThumb src="https://cdn.example/x.png" alt="Candle" />
      </div>
    )
    const [a, b] = screen.getAllByTestId("ec-product-thumb")
    expect(a.querySelector("img")).toBeNull()
    const img = within(b).getByRole("img", { name: "Candle" })
    fireEvent.error(img)
    expect(b.querySelector("img")).toBeNull()
  })

  it("DetailLayout, InfoCard, InfoRows and SummaryRows render their parts", () => {
    renderEc(
      <DetailLayout
        testId="detail"
        header={<div>Header</div>}
        main={
          <InfoCard title="Items">
            <SummaryRows
              rows={[
                { key: "sub", label: "Subtotal", value: "₾100.00" },
                { key: "disc", label: "Discount", value: "-₾10.00", hidden: true },
              ]}
              total={{ label: "Total", value: "₾90.00" }}
            />
          </InfoCard>
        }
        rail={
          <InfoCard title="Customer">
            <InfoRows rows={[{ key: "email", label: "Email", value: "nino@example.com" }]} />
          </InfoCard>
        }
      />
    )
    const d = screen.getByTestId("detail")
    expect(d).toHaveTextContent("Header")
    expect(d).toHaveTextContent("Subtotal₾100.00")
    expect(d).not.toHaveTextContent("Discount")
    expect(d).toHaveTextContent("Total₾90.00")
    expect(within(d).getByRole("complementary")).toHaveTextContent("nino@example.com")
  })

  it("SectionError shows translated texts, keeps the raw message as a tooltip and retries", () => {
    const reset = vi.fn()
    renderEc(<SectionError error={new Error("TypeError: x is undefined")} reset={reset} />, "ka")
    const el = screen.getByTestId("ec-route-error")
    expect(el).not.toHaveTextContent("TypeError")
    expect(el).toHaveAttribute("title", expect.stringContaining("x is undefined"))
    fireEvent.click(within(el).getByRole("button"))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
