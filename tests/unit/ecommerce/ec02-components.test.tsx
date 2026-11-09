import React, { useState } from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act, fireEvent, screen, within } from "@testing-library/react"
import type { ProductList, AttributeDefinition, Language } from "@/api/generated"
import { renderEc, messages, flatten } from "./ec00-helpers"
import { packageCatalog } from "./ec-catalog"

const toastError = vi.fn()
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: (...a: unknown[]) => toastError(...a) } }))

const ATTRIBUTES = [
  { id: 1, key: "color", name: { en: "Color", ka: "ფერი" }, attribute_type: "multiselect", is_required: true, is_filterable: true, is_active: true, options: [{ value: "red", en: "Red", ka: "წითელი" }] },
  { id: 2, key: "weight", name: { en: "Weight", ka: "წონა" }, attribute_type: "number", unit: "kg", is_required: false, is_filterable: false, is_active: false, options: [] },
] as unknown as AttributeDefinition[]
vi.mock("@/hooks/useAttributes", () => ({ useAttributes: () => ({ data: { results: ATTRIBUTES } }) }))

const LANGS = [
  { id: 1, code: "en", name: { en: "English", ka: "ინგლისური" }, is_default: true, is_active: true, sort_order: 0 },
  { id: 2, code: "tr", name: { en: "Turkish", ka: "თურქული" }, is_default: false, is_active: false, sort_order: 4 },
] as unknown as Language[]
const languagesState: { data: unknown; error: unknown } = { data: { count: 2, results: LANGS }, error: null }
vi.mock("@/hooks/useLanguages", () => ({
  useLanguages: () => ({ ...languagesState, refetch: vi.fn() }),
  useDeleteLanguage: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateLanguage: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateLanguage: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

import { ProductsTable } from "@/app/(tenant)/ecommerce/products/_components/products-table"
import { ProductsTableToolbar } from "@/app/(tenant)/ecommerce/products/_components/products-table-toolbar"
import { AttributesTable } from "@/app/(tenant)/ecommerce/product-attributes/_components/attributes-table"
import { AttributeSelector, type AttributeValue } from "@/components/products/AttributeSelector"
import { OptionsManager, type AttributeOption } from "@/components/attributes/OptionsManager"
import LanguagesPage from "@/app/(tenant)/ecommerce/languages/page"

const P = (id: number, over: Partial<ProductList> = {}) =>
  ({ id, name: { en: `Product ${id}`, ka: `პროდუქტი ${id}` }, sku: `SKU-${id}`, price: "10.00", compare_at_price: null, quantity: 20, is_in_stock: true, is_low_stock: false, status: "active", image: null, ...over }) as unknown as ProductList

function Products(props: Partial<React.ComponentProps<typeof ProductsTable>>) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  return (
    <div style={{ height: 600 }}>
      <ProductsTable
        data={[P(1, { price: "100.00", compare_at_price: "120.00" }), P(2, { price: "9.50", quantity: 0, is_in_stock: false }), P(3, { is_low_stock: true, quantity: 3 })]}
        totalCount={3}
        page={1}
        pageSize={20}
        loading={false}
        filtered={false}
        locale="en"
        selected={selected}
        hiddenColumns={new Set()}
        onSelectionChange={setSelected}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onAddProduct={vi.fn()}
        onEditProduct={vi.fn()}
        onClearFilters={vi.fn()}
        {...props}
      />
    </div>
  )
}

describe("EC-02 products table", () => {
  it("renders money with the struck old price, stock tones and opens a row", () => {
    const onEdit = vi.fn()
    renderEc(<Products onEditProduct={onEdit} />)
    const rows = screen.getAllByTestId("ec-table-row")
    expect(rows).toHaveLength(3)
    expect(rows[0].textContent).toContain("₾100.00")
    expect(rows[0].textContent).toContain("₾120.00")
    expect(rows[1].querySelector("[data-stock=out]")).not.toBeNull()
    expect(rows[2].querySelector("[data-stock=low]")).not.toBeNull()
    fireEvent.click(rows[1])
    expect(onEdit).toHaveBeenCalledWith(2)
  })

  it("selecting a row does not open it and the footer counts the selection", () => {
    const onEdit = vi.fn()
    renderEc(<Products onEditProduct={onEdit} />)
    fireEvent.click(within(screen.getAllByTestId("ec-table-row")[0]).getByRole("checkbox"))
    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.getByTestId("ec-pagination").textContent).toContain("1 selected")
  })

  it("sorts the loaded page by price", () => {
    renderEc(<Products />)
    fireEvent.click(screen.getByTestId("ec-sort-price"))
    expect(screen.getAllByTestId("ec-table-row")[0].textContent).toContain("₾9.50")
    fireEvent.click(screen.getByTestId("ec-sort-price"))
    expect(screen.getAllByTestId("ec-table-row")[0].textContent).toContain("₾100.00")
  })

  it("shows the skeleton, the empty, the no-matches and the error states", () => {
    const { unmount } = renderEc(<Products data={undefined} loading />)
    expect(screen.getByTestId("ec-table-skeleton")).toBeTruthy()
    unmount()
    const add = vi.fn()
    const r2 = renderEc(<Products data={[]} totalCount={0} onAddProduct={add} />)
    fireEvent.click(screen.getByRole("button", { name: /Create Your First Product/i }))
    expect(add).toHaveBeenCalled()
    r2.unmount()
    const clear = vi.fn()
    const r3 = renderEc(<Products data={[]} totalCount={0} filtered onClearFilters={clear} />)
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(clear).toHaveBeenCalled()
    r3.unmount()
    const retry = vi.fn()
    renderEc(<Products error={{ response: { status: 500 } }} onRetry={retry} />)
    expect(screen.getByTestId("ec-error")).toBeTruthy()
    expect(screen.queryByTestId("ec-pagination")).toBeNull()
  })

  it("is translated in Georgian (no English column headers)", () => {
    renderEc(<Products />, "ka")
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent).join(" ")
    expect(headers).toContain("პროდუქტი")
    expect(headers).not.toMatch(/Product|Price|Stock|Status/)
  })
})

describe("EC-02 products toolbar", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const setup = (over: Partial<React.ComponentProps<typeof ProductsTableToolbar>> = {}) => {
    const props = {
      searchQuery: "",
      statusFilter: "active",
      lowStockOnly: false,
      lowStockCount: 2,
      onSearchChange: vi.fn(),
      onStatusFilterChange: vi.fn(),
      onLowStockToggle: vi.fn(),
      columns: [{ id: "sku", label: "SKU" }],
      hiddenColumns: new Set<string>(),
      onHiddenColumnsChange: vi.fn(),
      ...over,
    }
    renderEc(<ProductsTableToolbar {...props} />)
    return props
  }

  it("filters by status with the segmented control and keeps the value", () => {
    const p = setup()
    expect(screen.getByRole("radio", { name: "Active" }).getAttribute("aria-checked")).toBe("true")
    fireEvent.click(screen.getByRole("radio", { name: "Draft" }))
    expect(p.onStatusFilterChange).toHaveBeenCalledWith("draft")
  })

  it("toggles low stock with a pressed state and the page count", () => {
    const p = setup()
    const btn = screen.getByTestId("ec-products-low-stock")
    expect(btn.getAttribute("aria-pressed")).toBe("false")
    expect(btn.textContent).toContain("2")
    fireEvent.click(btn)
    expect(p.onLowStockToggle).toHaveBeenCalled()
  })

  it("debounces the search by 300ms", () => {
    const p = setup()
    fireEvent.change(screen.getByTestId("ec-products-search"), { target: { value: "mug" } })
    expect(p.onSearchChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(310))
    expect(p.onSearchChange).toHaveBeenCalledWith("mug")
  })
})

describe("EC-02 attributes table", () => {
  it("searches by a Georgian name and shows type, options and flags", () => {
    renderEc(<AttributesTable data={ATTRIBUTES} locale="ka" onAdd={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />, "ka")
    expect(screen.getAllByTestId("ec-table-row")).toHaveLength(2)
    fireEvent.change(screen.getByTestId("ec-attributes-search"), { target: { value: "ფერ" } })
    const rows = screen.getAllByTestId("ec-table-row")
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toContain("ფერი")
    expect(rows[0].textContent).toContain("სავალდებულო")
    fireEvent.change(screen.getByTestId("ec-attributes-search"), { target: { value: "zzz" } })
    expect(screen.getByTestId("ec-empty")).toBeTruthy()
  })

  it("opens a row for editing", () => {
    const onEdit = vi.fn()
    renderEc(<AttributesTable data={ATTRIBUTES} locale="en" onAdd={vi.fn()} onEdit={onEdit} onDelete={vi.fn()} />)
    fireEvent.click(screen.getAllByTestId("ec-table-row")[1])
    expect(onEdit).toHaveBeenCalledWith(ATTRIBUTES[1])
  })
})

describe("EC-02 attribute selector (product sheet)", () => {
  it("lists attributes with translated pills and named clear buttons, no English in Georgian", () => {
    function Host() {
      const [v, setV] = useState<AttributeValue[]>([{ attribute_id: 2, value_number: "3" }])
      return <AttributeSelector value={v} onChange={setV} />
    }
    renderEc(<Host />, "ka")
    const box = screen.getByTestId("ec-attribute-selector")
    expect(box.textContent).toContain("ფერი")
    expect(box.textContent).toContain("სავალდებულო")
    expect(box.textContent).not.toMatch(/Required|Enter|Select|Unnamed|Product Attributes/)
    fireEvent.click(screen.getByRole("button", { name: /წონა — გასუფთავება/ }))
    expect(screen.queryByRole("button", { name: /წონა — გასუფთავება/ })).toBeNull()
  })
})

describe("EC-02 options manager", () => {
  it("Enter adds the option (auto-filling empty labels) instead of submitting the form", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    function Host() {
      const [opts, setOpts] = useState<AttributeOption[]>([])
      return (
        <form onSubmit={onSubmit}>
          <OptionsManager options={opts} onChange={setOpts} languages={LANGS} />
        </form>
      )
    }
    renderEc(<Host />)
    fireEvent.change(screen.getByTestId("ec-option-value"), { target: { value: "cotton" } })
    fireEvent.change(screen.getByTestId("ec-option-label-tr"), { target: { value: "Pamuk" } })
    fireEvent.keyDown(screen.getByTestId("ec-option-label-tr"), { key: "Enter" })
    expect(onSubmit).not.toHaveBeenCalled()
    const row = screen.getByTestId("ec-option-row")
    expect(row.textContent).toContain("cotton")
    expect(row.textContent).toContain("EN: Pamuk")
  })

  it("refuses an option without a value with a translated message", () => {
    toastError.mockClear()
    renderEc(<OptionsManager options={[]} onChange={vi.fn()} languages={LANGS} />, "ka")
    fireEvent.click(screen.getByTestId("ec-option-add"))
    expect(toastError).toHaveBeenCalledWith("მიუთითეთ ოფციის მნიშვნელობა")
  })
})

describe("EC-02 languages page", () => {
  it("lists languages with the header action, and the default one cannot be deleted", () => {
    languagesState.data = { count: 2, results: LANGS }
    languagesState.error = null
    renderEc(<LanguagesPage />)
    expect(screen.getByTestId("outlet-primary").textContent).toContain("Add Language")
    const rows = screen.getAllByTestId("ec-table-row")
    expect(rows[0].textContent).toContain("en")
    expect(rows[0].textContent).toContain("Default")
    expect(within(rows[0]).getByTestId("ec-language-delete")).toHaveProperty("disabled", true)
    expect(within(rows[1]).getByTestId("ec-language-delete")).toHaveProperty("disabled", false)
    expect(rows[1].textContent).toContain("Inactive")
  })

  it("shows the translated error state when the list fails", () => {
    languagesState.data = undefined
    languagesState.error = { response: { status: 403 } }
    renderEc(<LanguagesPage />, "ka")
    expect(screen.getByTestId("ec-error").textContent).toContain(String((messages.ka as never as { ecommerceUi: { noAccessTitle: string } }).ecommerceUi.noAccessTitle))
    languagesState.data = { count: 2, results: LANGS }
    languagesState.error = null
  })
})

describe("EC-02 catalog keys", () => {
  const pending = packageCatalog("ec-02")
  const en = flatten(pending.en)
  const ka = flatten(pending.ka)
  it("has every new key in both languages (ka may only add corrections of existing keys)", () => {
    for (const key of Object.keys(en)) expect(ka[key], key).toBeTruthy()
    const base = flatten(messages.en)
    // e.g. products.outOfStock: the Georgian "გამოუყენებელი" ("unused") is corrected to "ამოწურული"
    for (const key of Object.keys(ka).filter((k) => !(k in en))) expect(base[key], key).toBeTruthy()
  })
  it("has no Latin interface text in Georgian (ICU syntax aside)", () => {
    for (const [key, value] of Object.entries(ka)) {
      const text = value.replace(/\{[a-zA-Z]+, plural,|\b(one|other)\s*\{|\{[a-zA-Z]+\}|#/g, "")
      expect(text, key).not.toMatch(/[A-Za-z]/)
    }
  })
  it("keeps the same ICU arguments", () => {
    const args = (s: string) => (s.match(/\{([a-zA-Z]+)[,}]/g) || []).map((a) => a.replace(/[{,}]/g, "")).sort()
    for (const key of Object.keys(en)) expect(args(ka[key]), key).toEqual(args(en[key]))
  })
})
