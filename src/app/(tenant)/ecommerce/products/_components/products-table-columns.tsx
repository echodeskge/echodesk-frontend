"use client"

import type { ProductList } from "@/api/generated/interfaces"
import {
  IdText,
  MoneyCell,
  ProductStatusPill,
  ProductThumb,
  localizedText,
  type EcColumn,
} from "@/app/(tenant)/ecommerce/_components/ui"
import { cn } from "@/lib/utils"
import { numericValue, type SortState, type SortValue } from "../_lib/table-kit"
import { ProductsTableRowActions } from "./products-table-row-actions"
import { SortHeader } from "./table-kit"

type T = (key: string, values?: Record<string, string | number>) => string

/** Product name in the UI language (then English, then any), or the "unnamed" text. */
export function productName(product: Pick<ProductList, "name">, locale: string, unnamed: string): string {
  return localizedText(product.name as Parameters<typeof localizedText>[0], locale) || unnamed
}

/** Stock tone: sold out red, low amber (same rule as before: `is_in_stock` / `is_low_stock`). */
export function stockTone(product: Pick<ProductList, "is_in_stock" | "is_low_stock">): "out" | "low" | "ok" {
  if (!product.is_in_stock) return "out"
  if (product.is_low_stock) return "low"
  return "ok"
}

/** Columns a viewer may hide from the "View" menu (the product column always shows). */
export const HIDEABLE_PRODUCT_COLUMNS = ["sku", "price", "quantity", "status"] as const

export function productSortAccessors(locale: string): Record<string, (p: ProductList) => SortValue> {
  return {
    name: (p) => productName(p, locale, ""),
    sku: (p) => p.sku,
    price: (p) => numericValue(p.price),
    quantity: (p) => p.quantity ?? null,
    status: (p) => String(p.status ?? ""),
  }
}

export function getProductColumns({
  t,
  locale,
  sort,
  onSortChange,
  onEdit,
  hidden,
}: {
  /** `products` namespace. */
  t: T
  locale: string
  sort: SortState | null
  onSortChange: (sort: SortState | null) => void
  onEdit: (productId: number) => void
  hidden: ReadonlySet<string>
}): EcColumn<ProductList>[] {
  const unnamed = t("unnamed")
  const header = (id: string, label: string, align: "start" | "end" = "start") => (
    <SortHeader id={id} label={label} sort={sort} onSortChange={onSortChange} align={align} />
  )
  const columns: EcColumn<ProductList>[] = [
    {
      id: "name",
      header: header("name", t("columns.product")),
      width: "minmax(0,2.4fr)",
      mobile: "title",
      cell: (p) => {
        const name = productName(p, locale, unnamed)
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            <ProductThumb src={p.image} alt="" size={32} />
            <span className="truncate font-medium" title={name}>
              {name}
            </span>
          </span>
        )
      },
    },
    {
      id: "sku",
      header: header("sku", t("sku")),
      width: "minmax(0,1fr)",
      mobile: "meta",
      cell: (p) => <IdText className="text-muted-foreground" title={p.sku}>{p.sku}</IdText>,
    },
    {
      id: "price",
      header: header("price", t("price"), "end"),
      width: "minmax(0,1fr)",
      align: "end",
      mobile: "end",
      cell: (p) => <MoneyCell value={p.price} compare={p.compare_at_price} className="font-medium" />,
    },
    {
      id: "quantity",
      header: header("quantity", t("columns.stock"), "end"),
      width: "84px",
      align: "end",
      mobile: "meta",
      cell: (p) => {
        const tone = stockTone(p)
        return (
          <span
            className={cn(
              "tabular-nums",
              tone === "out" && "font-medium text-destructive",
              tone === "low" && "font-medium text-amber-700 dark:text-amber-400"
            )}
            data-stock={tone}
            title={tone === "out" ? t("outOfStock") : tone === "low" ? t("lowStock") : undefined}
          >
            <span className="@3xl:hidden">{t("stockShort", { count: p.quantity ?? 0 })}</span>
            <span className="hidden @3xl:inline">{p.quantity ?? 0}</span>
          </span>
        )
      },
    },
    {
      id: "status",
      header: header("status", t("columns.status")),
      width: "120px",
      mobile: "meta",
      cell: (p) => <ProductStatusPill status={String(p.status ?? "draft")} />,
    },
    {
      id: "actions",
      header: <span className="sr-only">{t("columns.actions")}</span>,
      width: "36px",
      align: "end",
      mobile: "hidden",
      cell: (p) => <ProductsTableRowActions productId={p.id} onEdit={onEdit} />,
    },
  ]
  return columns.filter((c) => !hidden.has(c.id))
}
