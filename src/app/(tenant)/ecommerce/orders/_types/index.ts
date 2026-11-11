import { Order as GeneratedOrder, OrderList as GeneratedOrderList } from "@/api/generated/interfaces"

/**
 * Soft-delete fields of a "cleaned" order (read-only; `?cleaned=true` lists
 * them). Not in the generated types until the schema is regenerated.
 */
export interface OrderCleanFields {
  is_deleted?: boolean
  deleted_at?: string | null
  deleted_by_name?: string
}

// Re-export OrderList as OrderListItem for backward compatibility.
export type OrderListItem = GeneratedOrderList & OrderCleanFields

// Extend Order for detail page — client_details is typed as string in generated
// types but the API actually returns an object
export interface OrderDetail extends Omit<GeneratedOrder, "client_details">, OrderCleanFields {
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
