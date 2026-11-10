"use client"

import { RotateCcw } from "lucide-react"
import {
  IdText,
  MoneyCell,
  OrderStatusPill,
  PaymentStatusPill,
  PersonCell,
  TonePill,
  formatCount,
  formatEcDate,
  parseMoney,
  rdButton,
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
  /** Cleaned (hidden) orders: the status column shows when they were cleaned. */
  cleaned?: boolean
  /** Adds a "Restore" row action (cleaned view, store admins). */
  onRestore?: (orderId: number) => void
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
    case "cleanedAt":
      return order.deleted_at ? new Date(order.deleted_at).getTime() : null
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
  cleaned,
  onRestore,
}: ColumnOptions): EcColumn<OrderListItem>[] {
  const head = (id: string, label: string, align: "start" | "end" = "start") => (
    <SortHeader id={id} label={label} sort={sort} onSort={onSort} align={align} ariaLabel={t("sortBy", { column: label })} />
  )
  const customerName = (o: OrderListItem) => o.client_name || t("unknownCustomer")

  const statusColumn: EcColumn<OrderListItem> = cleaned
    ? {
        id: "cleanedAt",
        header: head("cleanedAt", t("table.status")),
        width: "150px",
        mobile: "end",
        cell: (o) => (
          <span className="flex min-w-0 items-center gap-1.5">
            <TonePill tone="neutral" dot testId="ec-order-cleaned">
              {t("cleaned.pill")}
            </TonePill>
            <span className="truncate text-[11px] text-muted-foreground tabular-nums">{formatEcDate(o.deleted_at, locale)}</span>
          </span>
        ),
      }
    : {
        id: "status",
        header: head("status", t("table.status")),
        width: "120px",
        mobile: "end",
        cell: (o) => <OrderStatusPill status={String(o.status || "pending")} />,
      }

  const restoreColumn: EcColumn<OrderListItem>[] =
    cleaned && onRestore
      ? [
          {
            id: "restore",
            header: "",
            width: "96px",
            align: "end",
            mobile: "end",
            cell: (o) => (
              <button
                type="button"
                className={rdButton.outlineSm}
                onClick={() => onRestore(o.id)}
                aria-label={`${t("cleaned.restore")} #${o.order_number}`}
                data-testid="ec-order-restore"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {t("cleaned.restore")}
              </button>
            ),
          },
        ]
      : []

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
    statusColumn,
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
    ...restoreColumn,
  ]
}
