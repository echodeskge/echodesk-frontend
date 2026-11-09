"use client"

import {
  IdText,
  MoneyCell,
  OrderStatusPill,
  PaymentStatusPill,
  PersonCell,
  formatCount,
  formatEcDate,
  parseMoney,
  selectionColumn,
  type EcColumn,
} from "../../_components/ui"
import { OrderListItem } from "../_types"
import { PAYMENT_PROVIDER_LABELS } from "../_data/constants"
import { SortHeader, type SortState } from "./sort-header"

type Translate = (key: string, values?: Record<string, string | number>) => string

interface ColumnOptions {
  t: Translate
  tUi: Translate
  locale: string
  rows: OrderListItem[]
  selected: ReadonlySet<number>
  onSelectionChange: (ids: Set<number>) => void
  sort: SortState | null
  onSort: (next: SortState | null) => void
}

/** The value a column sorts by (current page only). */
export function orderSortValue(order: OrderListItem, id: string): string | number | null {
  switch (id) {
    case "order":
      return order.order_number
    case "customer":
      return order.client_name || ""
    case "items":
      return order.total_items ?? null
    case "payment":
      return String(order.payment_status ?? "")
    case "status":
      return String(order.status ?? "")
    case "total":
      return parseMoney(order.total_amount)
    case "date":
      return order.created_at ? new Date(order.created_at).getTime() : null
    default:
      return null
  }
}

export function getOrderColumns({
  t,
  tUi,
  locale,
  rows,
  selected,
  onSelectionChange,
  sort,
  onSort,
}: ColumnOptions): EcColumn<OrderListItem>[] {
  const head = (id: string, label: string, align: "start" | "end" = "start") => (
    <SortHeader id={id} label={label} sort={sort} onSort={onSort} align={align} ariaLabel={t("sortBy", { column: label })} />
  )
  const customerName = (o: OrderListItem) => o.client_name || t("unknownCustomer")

  return [
    selectionColumn<OrderListItem>({
      rows,
      getId: (o) => o.id,
      selected,
      onChange: onSelectionChange,
      selectAllLabel: tUi("selectAll"),
      selectRowLabel: (o) => tUi("selectRow", { name: `#${o.order_number}` }),
    }),
    {
      id: "order",
      header: head("order", t("table.orderNumber")),
      width: "150px",
      mobile: "title",
      cell: (o) => <IdText className="font-medium">#{o.order_number}</IdText>,
    },
    {
      id: "customer",
      header: head("customer", t("table.customer")),
      width: "minmax(0,1.6fr)",
      mobile: "meta",
      cell: (o) => (
        <>
          <PersonCell name={customerName(o)} sub={o.client_email} className="hidden @3xl:flex" />
          <span className="truncate @3xl:hidden">{customerName(o)}</span>
        </>
      ),
    },
    {
      id: "items",
      header: head("items", t("table.items"), "end"),
      width: "64px",
      align: "end",
      mobile: "hidden",
      className: "tabular-nums",
      cell: (o) => (o.total_items === undefined || o.total_items === null ? "—" : formatCount(o.total_items)),
    },
    {
      id: "payment",
      header: head("payment", t("columns.payment")),
      width: "minmax(0,170px)",
      mobile: "meta",
      cell: (o) => {
        const provider = o.payment_provider ? PAYMENT_PROVIDER_LABELS[o.payment_provider] || o.payment_provider : null
        return (
          <span className="flex min-w-0 items-center gap-1.5">
            <PaymentStatusPill status={String(o.payment_status || "pending")} />
            {provider && <span className="truncate text-[11px] text-muted-foreground">{provider}</span>}
          </span>
        )
      },
    },
    {
      id: "status",
      header: head("status", t("table.status")),
      width: "120px",
      mobile: "end",
      cell: (o) => <OrderStatusPill status={String(o.status || "pending")} />,
    },
    {
      id: "total",
      header: head("total", t("table.total"), "end"),
      width: "100px",
      align: "end",
      mobile: "meta",
      cell: (o) => <MoneyCell value={o.total_amount} className="font-medium" />,
    },
    {
      id: "date",
      header: head("date", t("table.date")),
      width: "100px",
      mobile: "meta",
      muted: true,
      className: "tabular-nums",
      cell: (o) => formatEcDate(o.created_at, locale),
    },
  ]
}
