"use client"

import Link from "next/link"
import { MoreHorizontal, Eye, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { OrderListItem } from "../_types"

interface OrdersTableRowActionsProps {
  order: OrderListItem
  onInitiatePayment?: (orderId: number) => void
}

export function OrdersTableRowActions({
  order,
  onInitiatePayment,
}: OrdersTableRowActionsProps) {
  const showInitiatePayment =
    String(order.payment_status) === "pending" &&
    String(order.status) !== "cancelled"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/ecommerce/orders/${order.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Link>
        </DropdownMenuItem>
        {showInitiatePayment && onInitiatePayment && (
          <DropdownMenuItem onClick={() => onInitiatePayment(order.id)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Initiate Payment
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
