"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { EcommerceClientList } from "@/api/generated/interfaces"
import { format } from "date-fns"

interface ColumnOptions {
  t: (key: string) => string
}

export function getClientColumns({
  t,
}: ColumnOptions): ColumnDef<EcommerceClientList>[] {
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
          aria-label={`Select ${row.original.full_name}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "full_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.name")} />
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.full_name}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.email}
          </div>
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "phone_number",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.phone")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.phone_number || "—"}
        </span>
      ),
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.status")} />
      ),
      cell: ({ row }) => {
        const isActive = row.original.is_active
        return (
          <Badge variant={isActive ? "default" : "outline"}>
            {isActive ? t("status.active") : t("status.inactive")}
          </Badge>
        )
      },
    },
    {
      accessorKey: "is_verified",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.verified")} />
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.is_verified ? "default" : "secondary"}>
          {row.original.is_verified ? t("status.verified") : t("status.unverified")}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.registered")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.original.created_at), "PP")}
        </span>
      ),
    },
  ]
}
