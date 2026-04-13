"use client"

import Image from "next/image"
import { ColumnDef } from "@tanstack/react-table"
import { Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { ProductList } from "@/api/generated/interfaces"
import { PRODUCT_STATUS_BADGE_VARIANTS } from "../_data/constants"
import { ProductsTableRowActions } from "./products-table-row-actions"

interface ColumnOptions {
  t: (key: string) => string
  locale: string
  onEdit: (productId: number) => void
}

function getProductName(product: ProductList, locale: string): string {
  const name = product.name
  if (typeof name === "object" && name !== null) {
    const nameObj = name as Record<string, string>
    return nameObj[locale] || nameObj.en || "Unnamed Product"
  }
  if (typeof name === "string") return name
  return "Unnamed Product"
}

export function getProductColumns({
  t,
  locale,
  onEdit,
}: ColumnOptions): ColumnDef<ProductList>[] {
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
          aria-label={`Select ${getProductName(row.original, locale)}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.product")} />
      ),
      cell: ({ row }) => {
        const product = row.original
        const name = getProductName(product, locale)
        return (
          <div className="flex items-center gap-3">
            {product.image ? (
              <Image
                src={product.image}
                alt={name}
                width={40}
                height={40}
                className="aspect-square rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <span className="inline-block max-w-44 truncate font-medium">
              {name}
            </span>
          </div>
        )
      },
      enableHiding: false,
    },
    {
      accessorKey: "sku",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("sku")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.sku}</span>
      ),
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("price")} />
      ),
      cell: ({ row }) => {
        const product = row.original
        const price = `₾${parseFloat(product.price).toFixed(2)}`
        const compareAt = product.compare_at_price
          ? `₾${parseFloat(product.compare_at_price).toFixed(2)}`
          : null
        return (
          <div>
            <span className="font-medium">{price}</span>
            {compareAt && (
              <span className="ml-2 text-sm text-muted-foreground line-through">
                {compareAt}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.stock")} />
      ),
      cell: ({ row }) => {
        const product = row.original
        const qty = product.quantity
        const isLow = product.is_low_stock
        const isOut = !product.is_in_stock
        return (
          <span
            className={
              isOut
                ? "text-destructive font-medium"
                : isLow
                  ? "text-orange-600 font-medium"
                  : ""
            }
          >
            {qty}
          </span>
        )
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("columns.status")} />
      ),
      cell: ({ row }) => {
        const status = String(row.original.status || "draft")
        const variant = PRODUCT_STATUS_BADGE_VARIANTS[status] || "secondary"
        return <Badge variant={variant}>{t(status)}</Badge>
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <ProductsTableRowActions
          productId={row.original.id}
          onEdit={onEdit}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ]
}
