import { Order as GeneratedOrder, OrderList as GeneratedOrderList } from "@/api/generated/interfaces"

// Extend OrderList to include fields added to the backend serializer
// (client_email, total_items) that haven't been regenerated yet
export interface OrderListItem extends GeneratedOrderList {
  client_email?: string
  total_items?: number
}

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
