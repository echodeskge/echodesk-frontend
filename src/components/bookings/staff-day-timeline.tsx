"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus, Search } from "lucide-react"
import {
  bookingsAdminBookingsCancelCreate,
  bookingsAdminBookingsCompleteCreate,
  bookingsAdminBookingsConfirmCreate,
  bookingsAdminScheduleRetrieve,
} from "@/api/generated"
import type { BookingList, BookingStaff } from "@/api/generated/interfaces"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import { cn, getApiErrorMessage, localizedName } from "@/lib/utils"
import { NewBookingDialog, NewBookingPreset } from "./new-booking-dialog"
import {
  Availability,
  bookingMatches,
  fromMinutes,
  isWorkingAt,
  minuteAtOffset,
  nonWorkingBlocks,
  timelineRange,
  toMinutes,
} from "./timeline-utils"

interface ScheduleRow {
  staff: BookingStaff
  availability: Availability | null
  bookings: BookingList[]
  booking_count: number
}

const ZOOM_STEPS = [15, 30, 60] as const
type Zoom = (typeof ZOOM_STEPS)[number]
// Pixels per minute at each zoom: an hour is 192 / 96 / 64 px wide
const PX_PER_MINUTE: Record<Zoom, number> = { 15: 3.2, 30: 1.6, 60: 1.0667 }
const ROW_HEIGHT = 64
const LEFT_WIDTH = 230

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-amber-100 border-amber-400 text-amber-950",
  confirmed: "bg-sky-100 border-sky-500 text-sky-950",
  in_progress: "bg-violet-100 border-violet-500 text-violet-950",
  completed: "bg-emerald-100 border-emerald-500 text-emerald-950",
  no_show: "bg-zinc-100 border-zinc-400 text-zinc-700",
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function money(value: string | number): string {
  const n = Number(value)
  return `${Number.isInteger(n) ? n : n.toFixed(2)} ₾`
}

/**
 * One day, one row per specialist, time running left to right. Bookings are
 * blocks; grey stripes are hours the specialist is not working. Clicking a
 * free slot books it; clicking a block shows it and its actions.
 */
export function StaffDayTimeline() {
  const t = useTranslations("bookingsCalendar")
  const locale = useLocale()
  const { toast } = useToast()

  const [date, setDate] = useState(todayIso)
  const [zoom, setZoom] = useState<Zoom>(30)
  const [query, setQuery] = useState("")
  const [rows, setRows] = useState<ScheduleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [preset, setPreset] = useState<NewBookingPreset>({ date })
  const [cancelTarget, setCancelTarget] = useState<BookingList | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const [now, setNow] = useState(() => new Date())
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await bookingsAdminScheduleRetrieve(date)
      setRows((data?.schedule || []) as ScheduleRow[])
      setFailed(false)
    } catch {
      setFailed(true)
      if (!silent) toast({ title: t("error"), description: t("fetchFailed"), variant: "destructive" })
    } finally {
      setLoading(false)
    }
    // `toast` is a new function on every render; depending on it would refetch forever
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  useEffect(() => {
    load()
  }, [load])

  // Keep the "now" line and the day fresh while the page sits open at the desk
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
      load(true)
    }, 60000)
    return () => clearInterval(timer)
  }, [load])

  const range = useMemo(() => timelineRange(rows), [rows])
  const ppm = PX_PER_MINUTE[zoom]
  const width = (range.end - range.start) * ppm
  const hours = useMemo(() => {
    const list: number[] = []
    for (let m = range.start; m < range.end; m += 60) list.push(m)
    return list
  }, [range])

  const isToday = date === todayIso()
  const nowMinute = now.getHours() * 60 + now.getMinutes()
  const showNowLine = isToday && nowMinute >= range.start && nowMinute <= range.end

  // Open on the current hour when looking at today
  useEffect(() => {
    if (!scrollRef.current || loading) return
    const target = isToday ? Math.max(0, (nowMinute - 60 - range.start) * ppm) : 0
    scrollRef.current.scrollLeft = target
    // only on load/zoom change, not every minute
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, zoom, date])

  const openNewBooking = (row: ScheduleRow, event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const minute = minuteAtOffset(event.clientX - rect.left, ppm, range.start, zoom)
    if (!isWorkingAt(row.availability, minute)) {
      toast({ title: t("timeline.notWorkingTitle"), description: t("timeline.notWorkingHint") })
      return
    }
    setPreset({ staffId: row.staff.id, date, time: fromMinutes(minute) })
    setDialogOpen(true)
  }

  const runAction = async (booking: BookingList, action: "confirm" | "complete" | "cancel") => {
    setBusyId(booking.id)
    try {
      if (action === "confirm") await bookingsAdminBookingsConfirmCreate(booking.id, { force: true } as never)
      else if (action === "complete") await bookingsAdminBookingsCompleteCreate(booking.id, {} as never)
      else await bookingsAdminBookingsCancelCreate(booking.id, { reason: "" } as never)
      toast({ title: t(`timeline.${action}Done`) })
      setOpenId(null)
      await load(true)
    } catch (error) {
      toast({ title: t("error"), description: getApiErrorMessage(error, t("timeline.actionFailed")), variant: "destructive" })
    } finally {
      setBusyId(null)
    }
  }

  const staffList = rows.map((r) => r.staff)
  const dayTotal = rows.reduce((sum, row) => sum + row.bookings.reduce((s, b) => s + Number(b.total_amount), 0), 0)
  const dayCount = rows.reduce((sum, row) => sum + row.bookings.length, 0)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setDate(shiftDate(date, -1))} aria-label={t("timeline.previousDay")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <DatePicker value={date} onChange={setDate} className="h-9 w-[190px]" />
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setDate(shiftDate(date, 1))} aria-label={t("timeline.nextDay")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => setDate(todayIso())} disabled={isToday}>
            {t("today")}
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("timeline.searchPlaceholder")} className="h-9 w-[220px] pl-8" />
        </div>

        <div className="ml-auto flex items-center gap-1">
          {ZOOM_STEPS.map((step) => (
            <Button key={step} variant={zoom === step ? "default" : "outline"} size="sm" className="h-9" onClick={() => setZoom(step)}>
              {step === 60 ? t("timeline.oneHour") : t("timeline.minutes", { n: step })}
            </Button>
          ))}
          <Button size="sm" className="ml-2 h-9" onClick={() => { setPreset({ date, staffId: staffList[0]?.id }); setDialogOpen(true) }} disabled={staffList.length === 0}>
            <Plus className="mr-1 h-4 w-4" />
            {t("newBooking")}
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : failed && rows.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
          {t("fetchFailed")}
          <Button variant="outline" size="sm" onClick={() => load()}>{t("timeline.retry")}</Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <CalendarDays className="h-8 w-8" />
          <p>{t("timeline.noStaff")}</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/bookings/staff">{t("timeline.goToStaff")}</Link>
          </Button>
        </div>
      ) : (
        <div ref={scrollRef} className="overflow-x-auto rounded-lg border bg-background">
          <div style={{ width: LEFT_WIDTH + width, minWidth: "100%" }}>
            {/* Hour header */}
            <div className="flex border-b bg-muted/40" style={{ height: 36 }}>
              <div className="sticky left-0 z-20 flex items-center border-r bg-muted/40 px-3 text-xs font-medium text-muted-foreground backdrop-blur" style={{ width: LEFT_WIDTH, flex: "none" }}>
                {t("timeline.staffColumn")} · {dayCount} · {money(dayTotal)}
              </div>
              <div className="relative" style={{ width, flex: "none" }}>
                {hours.map((m) => (
                  <div key={m} className="absolute top-0 flex h-full items-center border-l pl-1.5 text-xs font-medium" style={{ left: (m - range.start) * ppm }}>
                    {fromMinutes(m)}
                  </div>
                ))}
              </div>
            </div>

            {rows.map((row) => {
              const revenue = row.bookings.reduce((s, b) => s + Number(b.total_amount), 0)
              const name = row.staff.user.full_name || row.staff.user.email
              return (
                <div key={row.staff.id} className="flex border-b last:border-b-0" style={{ height: ROW_HEIGHT }}>
                  <div className="sticky left-0 z-20 flex items-center gap-3 border-r bg-background px-3" style={{ width: LEFT_WIDTH, flex: "none" }}>
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                      {name.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.bookings.length > 0
                          ? `${t("timeline.bookingsCount", { n: row.bookings.length })} · ${money(revenue)}`
                          : row.availability
                            ? `${row.availability.start_time.slice(0, 5)}–${row.availability.end_time.slice(0, 5)}`
                            : t("timeline.dayOff")}
                      </p>
                    </div>
                  </div>

                  <div
                    className="relative cursor-pointer"
                    style={{
                      width,
                      flex: "none",
                      backgroundImage: `repeating-linear-gradient(to right, hsl(var(--border)) 0 1px, transparent 1px ${zoom * ppm}px)`,
                    }}
                    onClick={(e) => openNewBooking(row, e)}
                  >
                    {nonWorkingBlocks(row.availability, range.start, range.end).map((block, i) => (
                      <div
                        key={i}
                        className={cn(
                          "absolute inset-y-0 flex items-center overflow-hidden px-2 text-[11px] text-muted-foreground",
                          block.kind === "break" ? "bg-muted/60 bg-[repeating-linear-gradient(135deg,transparent_0_6px,hsl(var(--border))_6px_7px)]" : "bg-muted/70"
                        )}
                        style={{ left: (block.start - range.start) * ppm, width: (block.end - block.start) * ppm }}
                        title={block.kind === "break" ? t("timeline.break") : t("timeline.notWorking")}
                      >
                        {(block.end - block.start) * ppm > 70 && (block.kind === "break" ? t("timeline.break") : t("timeline.notWorking"))}
                      </div>
                    ))}

                    {row.bookings.map((booking) => {
                      const start = toMinutes(booking.start_time)
                      const end = toMinutes(booking.end_time)
                      const matches = bookingMatches(booking, query)
                      const status = String(booking.status || "pending")
                      return (
                        <Popover key={booking.id} open={openId === booking.id} onOpenChange={(open) => setOpenId(open ? booking.id : null)}>
                          <Tooltip delayDuration={150}>
                          <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              data-booking={booking.id}
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                "absolute top-1.5 bottom-1.5 overflow-hidden rounded-md border-l-4 px-2 text-left text-xs shadow-sm transition-opacity hover:opacity-90",
                                STATUS_CLASSES[status] || STATUS_CLASSES.pending,
                                !matches && "opacity-25"
                              )}
                              style={{ left: (start - range.start) * ppm, width: Math.max(28, (end - start) * ppm - 2) }}
                            >
                              <span className="block truncate font-semibold">
                                {booking.client.full_name}
                                {booking.client.phone_number ? ` · ${booking.client.phone_number}` : ""}
                              </span>
                              <span className="block truncate opacity-80">
                                {booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)} {localizedName(booking.service.name, locale)}
                              </span>
                            </button>
                          </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="px-3 py-2">
                            <p className="text-sm font-semibold tabular-nums">
                              {booking.start_time.slice(0, 5)} – {booking.end_time.slice(0, 5)}
                              <span className="ml-2 font-normal opacity-80">{t("timeline.minutes", { n: end - start })}</span>
                            </p>
                            <p className="text-xs">{booking.client.full_name}{booking.client.phone_number ? ` · ${booking.client.phone_number}` : ""}</p>
                            <p className="text-xs opacity-80">{localizedName(booking.service.name, locale)} · {money(booking.total_amount)}</p>
                          </TooltipContent>
                          </Tooltip>
                          <PopoverContent className="w-80" align="start" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold">{booking.client.full_name}</p>
                                  {booking.client.phone_number && (
                                    <a href={`tel:${booking.client.phone_number}`} className="text-sm text-muted-foreground hover:underline">
                                      {booking.client.phone_number}
                                    </a>
                                  )}
                                </div>
                                <Badge variant="outline">{t(statusKey(status))}</Badge>
                              </div>
                              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                                <dt className="text-muted-foreground">{t("timeline.service")}</dt>
                                <dd>{localizedName(booking.service.name, locale)}</dd>
                                <dt className="text-muted-foreground">{t("timeline.time")}</dt>
                                <dd>{booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)}</dd>
                                <dt className="text-muted-foreground">{t("timeline.price")}</dt>
                                <dd>{money(booking.total_amount)}</dd>
                                {booking.client_notes && (
                                  <>
                                    <dt className="text-muted-foreground">{t("timeline.notes")}</dt>
                                    <dd className="whitespace-pre-wrap">{booking.client_notes}</dd>
                                  </>
                                )}
                              </dl>
                              <div className="flex flex-wrap gap-2">
                                {status === "pending" && (
                                  <Button size="sm" disabled={busyId === booking.id} onClick={() => runAction(booking, "confirm")}>
                                    {t("timeline.confirm")}
                                  </Button>
                                )}
                                {(status === "confirmed" || status === "in_progress") && (
                                  <Button size="sm" disabled={busyId === booking.id} onClick={() => runAction(booking, "complete")}>
                                    {t("timeline.complete")}
                                  </Button>
                                )}
                                {(status === "pending" || status === "confirmed") && (
                                  <Button size="sm" variant="outline" disabled={busyId === booking.id} onClick={() => { setOpenId(null); setCancelTarget(booking) }}>
                                    {t("timeline.cancel")}
                                  </Button>
                                )}
                                <Button asChild size="sm" variant="ghost" className="ml-auto">
                                  <Link href={`/bookings/bookings/${booking.id}`}>{t("timeline.open")}</Link>
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )
                    })}

                    {showNowLine && (
                      <div className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-red-500" style={{ left: (nowMinute - range.start) * ppm }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{t("timeline.hint")}</p>

      <NewBookingDialog open={dialogOpen} onOpenChange={setDialogOpen} staffList={staffList} preset={preset} onCreated={() => load(true)} />

      <AlertDialog open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("timeline.cancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && t("timeline.cancelDescription", { name: cancelTarget.client.full_name, time: cancelTarget.start_time.slice(0, 5) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("timeline.keep")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (cancelTarget) { runAction(cancelTarget, "cancel"); setCancelTarget(null) } }}
            >
              {t("timeline.cancelYes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function statusKey(status: string): string {
  return status === "in_progress" ? "inProgress" : ["pending", "confirmed", "completed", "cancelled"].includes(status) ? status : "pending"
}
