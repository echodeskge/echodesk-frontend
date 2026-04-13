"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { AttributeDefinition } from "@/api/generated"

interface ColumnOptions {
  t: (key: string) => string
  locale: string
  onEdit: (attribute: AttributeDefinition) => void
  onDelete: (attribute: AttributeDefinition) => void
}

function getLocalizedName(name: unknown, locale: string): string {
  if (!name) return "Unnamed"
  if (typeof name === "string") return name
  if (typeof name === "object") {
    const nameObj = name as Record<string, string>
    return nameObj[locale] || nameObj.en || Object.values(nameObj)[0] || "Unnamed"
  }
  return "Unnamed"
}

export function getAttributeColumns({
  t,
  locale,
  onEdit,
  onDelete,
}: ColumnOptions): ColumnDef<AttributeDefinition>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.name")} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {getLocalizedName(row.original.name, locale)}
        </span>
      ),
    },
    {
      accessorKey: "key",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("key")} />
      ),
      cell: ({ row }) => (
        <code className="text-sm text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {row.original.key}
        </code>
      ),
    },
    {
      accessorKey: "attribute_type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.type")} />
      ),
      cell: ({ row }) => {
        const type = String(row.original.attribute_type)
        return (
          <Badge variant="secondary">
            {t(`types.${type}`)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "options",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("options")} />
      ),
      cell: ({ row }) => {
        const options = row.original.options
        const count = Array.isArray(options) ? options.length : 0
        return <span className="text-muted-foreground">{count}</span>
      },
      enableSorting: false,
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.status")} />
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? t("sidebar.active") : t("sidebar.inactive")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const attr = row.original
        return (
          <AttributeRowActions
            attribute={attr}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
  ]
}

// Inline row actions to avoid circular imports
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function AttributeRowActions({
  attribute,
  onEdit,
  onDelete,
}: {
  attribute: AttributeDefinition
  onEdit: (attr: AttributeDefinition) => void
  onDelete: (attr: AttributeDefinition) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(attribute)}>
          <Pencil className="me-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(attribute)}
        >
          <Trash2 className="me-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
