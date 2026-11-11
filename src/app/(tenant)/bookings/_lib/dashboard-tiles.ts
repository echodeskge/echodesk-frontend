import type { BookingDashboard } from "@/api/generated/interfaces"
import { formatMoney } from "../_components/ui/format"

export interface DashboardTiles {
  todayBookings: number
  pendingApproval: number
  completedToday: number
  weekRevenue: string
  activeStaff: number
  totalClients: number
}

/**
 * The tiles from the real `{today, week, overall}` payload. The API has no
 * month figures, so the tiles say what they show: today's counts and this
 * week's revenue. (Lives outside the page file: Next only allows the route
 * exports there.)
 */
export function dashboardTiles(data: BookingDashboard): DashboardTiles {
  return {
    todayBookings: data.today?.total_bookings ?? 0,
    pendingApproval: data.today?.pending ?? 0,
    completedToday: data.today?.completed ?? 0,
    weekRevenue: formatMoney(data.week?.revenue ?? 0),
    activeStaff: data.overall?.active_staff ?? 0,
    totalClients: data.overall?.total_clients ?? 0,
  }
}
