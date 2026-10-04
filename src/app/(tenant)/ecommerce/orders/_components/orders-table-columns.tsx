"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { OrderListItem } from "../_types"
import {
  STATUS_COLORS,
  STATUS_ICONS,
  PAYMENT_BADGE_VARIANTS,
  PAYMENT_STATUS_ICONS,
  PAYMENT_PROVIDER_LABELS,
} from "../_data/constants"
import { formatCurrency, formatDate } from "../_lib/utils"

interface ColumnOptions {
  t: (key: string) => string
  locale?: string
}

export function getOrderColumns({
  t,
  locale,
}: ColumnOptions): ColumnDef<OrderListItem>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={`Select order ${row.original.order_number}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "order_number",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.orderNumber")} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          #{row.original.order_number}
        </span>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "client_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.customer")} />
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.client_name || "Unknown"}
          </div>
          {row.original.client_email && (
            <div className="text-sm text-muted-foreground">
              {row.original.client_email}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.date")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.created_at, locale)}
        </span>
      ),
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.total")} />
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {formatCurrency(row.original.total_amount)}
        </div>
      ),
    },
    {
      accessorKey: "payment_status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.payment")} />
      ),
      cell: ({ row }) => {
        const status = String(row.original.payment_status || "pending")
        const variant = PAYMENT_BADGE_VARIANTS[status] || "secondary"
        const PaymentIcon = PAYMENT_STATUS_ICONS[status] || PAYMENT_STATUS_ICONS.pending
        const provider = row.original.payment_provider
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant={variant}>
              <PaymentIcon className="mr-1 h-3 w-3" />
              {t(`paymentStatus.${status}`)}
            </Badge>
            {provider && (
              <span className="text-xs text-muted-foreground">
                {PAYMENT_PROVIDER_LABELS[provider] || provider}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.status")} />
      ),
      cell: ({ row }) => {
        const status = String(row.original.status || "pending")
        const StatusIcon = STATUS_ICONS[status] || STATUS_ICONS.pending
        return (
          <Badge
            variant="secondary"
            className={STATUS_COLORS[status] || ""}
          >
            <StatusIcon className="mr-1 h-3 w-3" />
            {t(`status.${status}`)}
          </Badge>
        )
      },
    },
  ]
}
