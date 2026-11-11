import type { BookingDashboard } from "@/api/generated/interfaces"
import { formatMoney } from "../_components/ui/format"

export interface DashboardTiles {
  todayBookings: number
  pendingApproval: number
  completedThisMonth: number
  totalRevenue: string
  activeStaff: number
  totalClients: number
}

/**
 * `{today, week, overall}` plus the `month` block and `overall.pending`
 * the API gained for the redesign; older payloads fall back to today's
 * figures so the tiles never show 0 for a missing field.
 */
export type DashboardPayload = BookingDashboard & {
  month?: { total_bookings?: number; completed?: number; revenue?: number }
  overall: BookingDashboard["overall"] & { pending?: number }
}

/**
 * The tiles of the design: today's bookings, bookings awaiting
 * confirmation (any date), completed this month and all-time paid revenue.
 * (Lives outside the page file: Next only allows the route exports there.)
 */
export function dashboardTiles(data: DashboardPayload): DashboardTiles {
  return {
    todayBookings: data.today?.total_bookings ?? 0,
    pendingApproval: data.overall?.pending ?? data.today?.pending ?? 0,
    completedThisMonth: data.month?.completed ?? data.today?.completed ?? 0,
    totalRevenue: formatMoney(data.overall?.total_revenue ?? 0),
    activeStaff: data.overall?.active_staff ?? 0,
    totalClients: data.overall?.total_clients ?? 0,
  }
}
