import {
  Clock,
  CheckCircle2,
  Package,
  Truck,
  PackageCheck,
  XCircle,
  AlertCircle,
} from "lucide-react"

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  processing: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  shipped: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
  delivered: "bg-green-100 text-green-800 hover:bg-green-100",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
  refunded: "bg-gray-100 text-gray-800 hover:bg-gray-100",
}

export const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  confirmed: CheckCircle2,
  processing: Package,
  shipped: Truck,
  delivered: PackageCheck,
  cancelled: XCircle,
  refunded: AlertCircle,
}

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-50 text-gray-700 border-gray-200",
  partially_refunded: "bg-orange-50 text-orange-700 border-orange-200",
}

export const PAYMENT_BADGE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  paid: "default",
  pending: "secondary",
  failed: "destructive",
  refunded: "outline",
  partially_refunded: "outline",
}

export const PAYMENT_STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  paid: CheckCircle2,
  failed: XCircle,
  refunded: AlertCircle,
  partially_refunded: AlertCircle,
}

export const STATUS_OPTIONS = [
  "all",
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const
