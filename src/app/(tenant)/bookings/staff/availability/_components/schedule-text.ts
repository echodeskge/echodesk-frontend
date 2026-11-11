import type { StaffAvailability } from "@/api/generated/interfaces"
import { formatTimeRange } from "../../../_components/ui/format"

/** "09:00 – 17:00 (Break: 13:00 – 14:00)" for a working day; the day-off / no-schedule texts otherwise. */
export function scheduleText(row: StaffAvailability | undefined, t: (key: string, values?: Record<string, string>) => string): string {
  if (!row) return t("noScheduleSet")
  if (!row.is_available) return t("dayOff")
  const hours = formatTimeRange(row.start_time, row.end_time)
  if (row.break_start && row.break_end) return `${hours} (${t("breakLabel", { range: formatTimeRange(row.break_start, row.break_end) })})`
  return hours
}
