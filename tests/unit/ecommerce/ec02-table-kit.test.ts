import { describe, it, expect } from "vitest"
import { nextSort, numericValue, pageSlice, sortRows } from "@/app/(tenant)/ecommerce/products/_lib/table-kit"
import { productName, stockTone, productSortAccessors } from "@/app/(tenant)/ecommerce/products/_components/products-table-columns"
import { attributeName, matchesAttribute, optionCount } from "@/app/(tenant)/ecommerce/product-attributes/_components/attributes-table-columns"
import type { ProductList, AttributeDefinition } from "@/api/generated"

describe("EC-02 table kit", () => {
  it("cycles a column: ascending, descending, off; another column starts ascending", () => {
    expect(nextSort(null, "price")).toEqual({ id: "price", direction: "asc" })
    expect(nextSort({ id: "price", direction: "asc" }, "price")).toEqual({ id: "price", direction: "desc" })
    expect(nextSort({ id: "price", direction: "desc" }, "price")).toBeNull()
    expect(nextSort({ id: "price", direction: "desc" }, "sku")).toEqual({ id: "sku", direction: "asc" })
  })

  it("sorts numbers numerically and text naturally, empty values last both ways, stable", () => {
    const rows = [
      { id: 1, n: 10, s: "DEMO-10" },
      { id: 2, n: null, s: "" },
      { id: 3, n: 9, s: "DEMO-9" },
      { id: 4, n: 10, s: "demo-2" },
    ]
    const acc = { n: (r: (typeof rows)[number]) => r.n, s: (r: (typeof rows)[number]) => r.s }
    expect(sortRows(rows, { id: "n", direction: "asc" }, acc).map((r) => r.id)).toEqual([3, 1, 4, 2])
    expect(sortRows(rows, { id: "n", direction: "desc" }, acc).map((r) => r.id)).toEqual([1, 4, 3, 2])
    expect(sortRows(rows, { id: "s", direction: "asc" }, acc).map((r) => r.id)).toEqual([4, 3, 1, 2])
    expect(sortRows(rows, null, acc).map((r) => r.id)).toEqual([1, 2, 3, 4])
    expect(sortRows(rows, { id: "unknown", direction: "asc" }, acc)).not.toBe(rows)
  })

  it("parses API decimals and slices client-side pages (clamped)", () => {
    expect(numericValue("35.00")).toBe(35)
    expect(numericValue("")).toBeNull()
    expect(numericValue("abc")).toBeNull()
    expect(pageSlice([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4])
    expect(pageSlice([1, 2, 3], 9, 2)).toEqual([3])
    expect(pageSlice([], 1, 10)).toEqual([])
  })
})

describe("EC-02 product and attribute helpers", () => {
  const product = (over: Partial<ProductList>) => ({ id: 1, name: { en: "Mug", ka: "ფინჯანი" }, sku: "M-1", price: "18.00", quantity: 6, is_in_stock: true, is_low_stock: false, status: "active", ...over }) as unknown as ProductList

  it("names products in the UI language with fallbacks", () => {
    expect(productName(product({}), "ka", "?")).toBe("ფინჯანი")
    expect(productName(product({}), "en", "?")).toBe("Mug")
    expect(productName(product({ name: {} as never }), "en", "Unnamed")).toBe("Unnamed")
    expect(productName(product({ name: "Plain" as never }), "ka", "?")).toBe("Plain")
  })

  it("tones stock: sold out beats low", () => {
    expect(stockTone(product({ is_in_stock: false, is_low_stock: true }))).toBe("out")
    expect(stockTone(product({ is_low_stock: true }))).toBe("low")
    expect(stockTone(product({}))).toBe("ok")
  })

  it("sorts products by the price value, not the string", () => {
    const acc = productSortAccessors("en")
    const rows = [product({ id: 1, price: "100.00" }), product({ id: 2, price: "9.50" })]
    expect(sortRows(rows, { id: "price", direction: "asc" }, acc).map((p) => p.id)).toEqual([2, 1])
  })

  it("matches attributes by any language name or key (the search used to match nothing)", () => {
    const a = { id: 1, key: "color", name: { en: "Color", ka: "ფერი" }, options: [{ value: "red" }] } as unknown as AttributeDefinition
    expect(matchesAttribute(a, "ფერ")).toBe(true)
    expect(matchesAttribute(a, "COL")).toBe(true)
    expect(matchesAttribute(a, "size")).toBe(false)
    expect(matchesAttribute(a, "  ")).toBe(true)
    expect(attributeName(a, "ka")).toBe("ფერი")
    expect(attributeName({ name: {} as never, key: "k" }, "en")).toBe("k")
    expect(optionCount(a)).toBe(1)
    expect(optionCount({ options: null as never })).toBe(0)
  })
})
