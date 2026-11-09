"use client"

import { MoreHorizontal, Pencil } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { rdButton } from "@/app/(tenant)/ecommerce/_components/ui"

interface ProductsTableRowActionsProps {
  productId: number
  onEdit: (productId: number) => void
}

/** Row menu (28px ghost icon): Edit. Clicks never open the row (the table ignores buttons). */
export function ProductsTableRowActions({ productId, onEdit }: ProductsTableRowActionsProps) {
  const tc = useTranslations("common")
  const tu = useTranslations("ecommerceUi")
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={rdButton.ghostIconSm} aria-label={tu("moreActions")} title={tu("moreActions")}>
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
            align="end"
            // Portaled, but React still bubbles its clicks to the row, which
            // would open the edit sheet on top of the chosen action.
            onClick={(e) => e.stopPropagation()}
          >
        <DropdownMenuItem className="text-[13px]" onClick={() => onEdit(productId)}>
          <Pencil className="me-2 h-3.5 w-3.5" aria-hidden />
          {tc("edit")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
