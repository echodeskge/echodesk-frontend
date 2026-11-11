"use client"

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { CalendarDays } from "lucide-react"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { bookingMatches, fromMinutes, isWorkingAt, minuteAtOffset, nonWorkingBlocks, timelineRange, toMinutes } from "@/components/bookings/timeline-utils"
import { Avatar, BookingsEmptyState, rdButton } from "../../_components/ui"
import type { CalendarBooking } from "../../_lib/bookings-api"
import { lari, type SpecialistRow, type Zoom } from "../_lib/calendar-range"
import { statusSoftClass } from "../_lib/calendar-tones"
import { BookingPopoverBody, type PopoverAction } from "./booking-popover"

// Pixels per minute at each zoom: an hour is 192 / 96 / 64 px wide
const PX_PER_MINUTE: Record<Zoom, number> = { 15: 3.2, 30: 1.6, 60: 1.0667 }
const ROW_HEIGHT = 60
const HEADER_HEIGHT = 32
const LEFT_WIDTH = 230
const LEFT_WIDTH_MOBILE = 140

const HATCH = "bg-[repeating-linear-gradient(135deg,transparent_0_6px,hsl(var(--border))_6px_7px)]"

export interface SpecialistsViewProps {
  date: string
  rows: SpecialistRow[]
  zoom: Zoom
  query: string
  /** Minutes since midnight in the business timezone when `date` is today, else null. */
  nowMinutes: number | null
  isAdmin: boolean
  busyId: number | null
  onSlotClick: (staffId: number, time: string) => void
  onAction: (action: PopoverAction, booking: CalendarBooking) => void
}

/**
 * One day, one row per specialist, time running left to right (design shot
 * 04): avatar column with "n bookings · ₾", hour header, hatched not-working /
 * break areas, red now-line, blocks tinted by status. A click on a free
 * working slot books it (admins); a block opens the popover.
 */
export function SpecialistsView({ date, rows, zoom, query, nowMinutes, isAdmin, busyId, onSlotClick, onAction }: SpecialistsViewProps) {
  const t = useTranslations("bookingsCalendar")
  const isMobile = useIsMobile()
  const leftWidth = isMobile ? LEFT_WIDTH_MOBILE : LEFT_WIDTH
  const [openId, setOpenId] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const range = useMemo(() => timelineRange(rows), [rows])
  const ppm = PX_PER_MINUTE[zoom]
  const width = (range.end - range.start) * ppm
  const hours = useMemo(() => {
    const list: number[] = []
    for (let m = range.start; m < range.end; m += 60) list.push(m)
    return list
  }, [range])
  const showNowLine = nowMinutes !== null && nowMinutes >= range.start && nowMinutes <= range.end

  // Open on the current hour when looking at today (on load / zoom / day change, not every minute)
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollLeft = nowMinutes !== null ? Math.max(0, (nowMinutes - 60 - range.start) * ppm) : 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, date, range.start])

  const dayCount = rows.reduce((sum, row) => sum + row.bookings.length, 0)
  const dayTotal = rows.reduce((sum, row) => sum + row.bookings.reduce((s, b) => s + Number(b.total_amount), 0), 0)

  const clickSlot = (row: SpecialistRow, event: MouseEvent<HTMLDivElement>) => {
    if (!isAdmin || row.staffId === null) return
    const rect = event.currentTarget.getBoundingClientRect()
    const minute = minuteAtOffset(event.clientX - rect.left, ppm, range.start, zoom)
    if (!isWorkingAt(row.availability, minute)) {
      toast(t("timeline.notWorkingTitle"), { description: t("timeline.notWorkingHint") })
      return
    }
    onSlotClick(row.staffId, fromMinutes(minute))
  }

  if (rows.length === 0) {
    return (
      <BookingsEmptyState
        icon={CalendarDays}
        title={t("timeline.noStaff")}
        action={
          <Link href="/bookings/staff" className={rdButton.outlineSm}>
            {t("timeline.goToStaff")}
          </Link>
        }
      />
    )
  }

  return (
    <div ref={scrollRef} className="overflow-x-auto rounded-[10px] border bg-card" data-testid="bkg-specialists-grid">
      <div style={{ width: leftWidth + width, minWidth: "100%" }}>
        {/* Hour header */}
        <div className="flex border-b bg-muted/35" style={{ height: HEADER_HEIGHT }}>
          <div
            className="sticky left-0 z-20 flex items-center gap-1 truncate border-r bg-muted px-3 text-xs font-medium text-muted-foreground"
            style={{ width: leftWidth, flex: "none" }}
            data-testid="bkg-specialists-head"
          >
            {t("timeline.staffColumn")} · {dayCount} · {lari(dayTotal)}
          </div>
          <div className="relative" style={{ width, flex: "none" }}>
            {hours.map((m) => (
              <div key={m} className="absolute top-0 flex h-full items-center border-l pl-1.5 text-[11px] font-medium tabular-nums text-muted-foreground" style={{ left: (m - range.start) * ppm }}>
                {fromMinutes(m)}
              </div>
            ))}
          </div>
        </div>

        {rows.map((row) => {
          const revenue = row.bookings.reduce((s, b) => s + Number(b.total_amount), 0)
          return (
            <div key={row.staffId ?? "unassigned"} className="flex border-b last:border-b-0" style={{ height: ROW_HEIGHT }} data-testid="bkg-specialist-row" data-staff={row.staffId ?? ""}>
              <div className="sticky left-0 z-20 flex items-center gap-2.5 border-r bg-card px-3" style={{ width: leftWidth, flex: "none" }}>
                <Avatar name={row.name} size={28} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{row.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {row.bookings.length > 0
                      ? `${t("timeline.bookingsCount", { n: row.bookings.length })} · ${lari(revenue)}`
                      : row.availability
                        ? `${row.availability.start_time.slice(0, 5)}–${row.availability.end_time.slice(0, 5)}`
                        : t("timeline.dayOff")}
                  </p>
                </div>
              </div>

              <div
                className={cn("relative", isAdmin && row.staffId !== null && "cursor-pointer")}
                style={{
                  width,
                  flex: "none",
                  backgroundImage: `repeating-linear-gradient(to right, hsl(var(--border)) 0 1px, transparent 1px ${zoom * ppm}px)`,
                }}
                onClick={(e) => clickSlot(row, e)}
                data-testid="bkg-specialist-lane"
              >
                {nonWorkingBlocks(row.availability, range.start, range.end).map((block, i) => (
                  <div
                    key={i}
                    className={cn("absolute inset-y-0 flex items-center overflow-hidden px-2 text-[11px] text-muted-foreground", HATCH, block.kind === "break" ? "bg-muted/70" : "bg-muted/50")}
                    style={{ left: (block.start - range.start) * ppm, width: (block.end - block.start) * ppm }}
                    title={block.kind === "break" ? t("timeline.break") : t("timeline.notWorking")}
                    data-testid={block.kind === "break" ? "bkg-timeline-break" : "bkg-timeline-off"}
                  >
                    {(block.end - block.start) * ppm > 70 && (block.kind === "break" ? t("timeline.break") : t("timeline.notWorking"))}
                  </div>
                ))}

                {row.bookings.map((booking) => {
                  const start = toMinutes(booking.start_time)
                  const end = toMinutes(booking.end_time)
                  const matches = bookingMatches(booking, query)
                  return (
                    <Popover key={booking.id} open={openId === booking.id} onOpenChange={(open) => setOpenId(open ? booking.id : null)}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          data-testid="bkg-timeline-block"
                          data-booking={booking.id}
                          data-status={booking.status}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={t("openAria", { label: `${booking.client.full_name} ${booking.start_time.slice(0, 5)}` })}
                          className={cn(
                            "absolute bottom-1.5 top-1.5 overflow-hidden rounded-md border-l-[3px] px-1.5 text-left text-[11px] leading-4 shadow-sm transition-opacity hover:opacity-90",
                            statusSoftClass(booking.status),
                            !matches && "opacity-25"
                          )}
                          style={{ left: (start - range.start) * ppm, width: Math.max(28, (end - start) * ppm - 2) }}
                        >
                          <span className="block truncate font-semibold">{booking.client.full_name}</span>
                          <span className="block truncate tabular-nums opacity-80">
                            {booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-3.5" align="start" onClick={(e) => e.stopPropagation()}>
                        <BookingPopoverBody
                          booking={booking}
                          isAdmin={isAdmin}
                          busy={busyId === booking.id}
                          onAction={(action, b) => {
                            setOpenId(null)
                            onAction(action, b)
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  )
                })}

                {showNowLine && (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-red-500"
                    style={{ left: (nowMinutes - range.start) * ppm }}
                    aria-label={t("timeline.nowLine")}
                    data-testid="bkg-now-line"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
