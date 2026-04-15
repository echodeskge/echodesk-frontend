import { Order as GeneratedOrder, OrderList as GeneratedOrderList } from "@/api/generated/interfaces"

// Re-export OrderList as OrderListItem for backward compatibility
export type OrderListItem = GeneratedOrderList

// Extend Order for detail page — client_details is typed as string in generated
// types but the API actually returns an object
export interface OrderDetail extends Omit<GeneratedOrder, "client_details"> {
  client_details: {
    id: number
    full_name: string
    email: string
    phone_number?: string
  }
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded"
