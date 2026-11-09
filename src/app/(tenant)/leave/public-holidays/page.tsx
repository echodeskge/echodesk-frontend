"use client"

import { useState, useEffect } from "react"
import { isForbidden } from "../_lib/lv02-utils"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { getApiErrorMessage, localizedName } from "@/lib/utils"
import {
  leaveAdminPublicHolidaysCreate,
  leaveAdminPublicHolidaysDestroy,
  leaveAdminPublicHolidaysList,
  leaveAdminPublicHolidaysRetrieve,
  leaveAdminPublicHolidaysUpdate,
} from "@/api/generated/api"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Loader2, CalendarRange, Flag } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { loadGeorgianHolidays } from "../_lib/hr-api"
import { filterHolidaysByYear, holidayYears } from "../_lib/lv04-utils"
import {
  LeaveEmptyState,
  LeaveHeaderBridge,
  LeavePage,
  LeavePageHeader,
  LeaveTable,
  LeaveToolbar,
  Segmented,
  TonePill,
  formatLeaveDate,
  leaveButton,
  type LeaveColumn,
} from "../_components/ui"
import { DialogField, SwitchList, SwitchRow, dialogControl } from "../_components/lv04/dialog-fields"

type LocalizedText = { en?: string; ka?: string } | string | null | undefined

// Shape of PublicHolidayListSerializer. `applies_to_all` is only returned by
// the detail endpoint, so it is fetched when a holiday is opened for editing.
interface PublicHoliday {
  id: number
  name: LocalizedText
  name_display?: string
  date: string
  is_recurring?: boolean
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const results = (data as { results?: unknown } | null | undefined)?.results
  return Array.isArray(results) ? (results as T[]) : []
}

function textPart(value: LocalizedText, key: "en" | "ka"): string {
  if (!value) return ""
  if (typeof value === "string") return value
  return value[key] || ""
}

export default function PublicHolidaysPage() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  // A failed list load shows the error state (with retry) instead of an empty table.
  const [loadError, setLoadError] = useState<unknown>(null)
  // Client-side year filter over the loaded list ("all" = everything, as before).
  const [year, setYear] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<PublicHoliday | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name_en: "",
    name_ka: "",
    date: "",
    is_recurring: false,
    applies_to_all: true,
  })

  useEffect(() => {
    fetchHolidays()
  }, [])

  const thisYear = new Date().getFullYear()
  const [georgianOpen, setGeorgianOpen] = useState(false)
  const [georgianYear, setGeorgianYear] = useState(String(thisYear))
  const [loadingGeorgian, setLoadingGeorgian] = useState(false)

  const handleLoadGeorgian = async () => {
    if (loadingGeorgian) return
    setLoadingGeorgian(true)
    try {
      const result = await loadGeorgianHolidays(Number(georgianYear))
      toast.success(
        t("hr.holidays.loaded", {
          year: result.year,
          created: result.created.length,
          skipped: result.skipped.length,
        })
      )
      setGeorgianOpen(false)
      await fetchHolidays()
    } catch (error) {
      console.error("Failed to load Georgian holidays:", error)
      toast.error(t("hr.holidays.loadFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    } finally {
      setLoadingGeorgian(false)
    }
  }

  const fetchHolidays = async () => {
    try {
      // Positional: (appliesToAll, isRecurring, lang, ordering, page, pageSize, year)
      const response = await leaveAdminPublicHolidaysList(undefined, undefined, undefined, "date", undefined, 100)
      setHolidays(unwrapList<PublicHoliday>(response))
      setLoadError(null)
    } catch (error) {
      console.error("Failed to fetch holidays:", error)
      setHolidays([])
      setLoadError(error)
      // A 403 already shows the translated "no access" state; the API reason is often English.
      if (!isForbidden(error)) {
        toast.error(t("shared.loadFailed"), {
          description: getApiErrorMessage(error) || undefined,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const payload = {
        name: { en: formData.name_en.trim(), ka: formData.name_ka.trim() },
        date: formData.date,
        is_recurring: formData.is_recurring,
        applies_to_all: formData.applies_to_all,
      }

      if (editingHoliday) {
        await leaveAdminPublicHolidaysUpdate(String(editingHoliday.id), payload)
        toast.success(t("publicHolidays.updated"))
      } else {
        await leaveAdminPublicHolidaysCreate(payload)
        toast.success(t("publicHolidays.created"))
      }

      setIsDialogOpen(false)
      setEditingHoliday(null)
      resetForm()
      await fetchHolidays()
    } catch (error) {
      // Keep the dialog open so the user can fix the input and retry.
      console.error("Failed to save holiday:", error)
      toast.error(t("publicHolidays.saveFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (holiday: PublicHoliday) => {
    setBusyId(holiday.id)
    try {
      // The list does not include `applies_to_all`; load the full record.
      const detail = await leaveAdminPublicHolidaysRetrieve(String(holiday.id))
      setEditingHoliday(holiday)
      setFormData({
        name_en: textPart(detail.name, "en"),
        name_ka: textPart(detail.name, "ka"),
        date: detail.date,
        is_recurring: !!detail.is_recurring,
        applies_to_all: detail.applies_to_all ?? true,
      })
      setIsDialogOpen(true)
    } catch (error) {
      console.error("Failed to load holiday:", error)
      toast.error(t("shared.loadFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("publicHolidays.confirmDelete"))) return

    setBusyId(id)
    try {
      await leaveAdminPublicHolidaysDestroy(String(id))
      toast.success(t("publicHolidays.deleted"))
      await fetchHolidays()
    } catch (error) {
      console.error("Failed to delete holiday:", error)
      toast.error(t("publicHolidays.deleteFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    } finally {
      setBusyId(null)
    }
  }

  const holidayName = (holiday: PublicHoliday) =>
    typeof holiday.name === "string"
      ? holiday.name
      : localizedName(holiday.name, locale) || holiday.name_display || ""

  const resetForm = () => {
    setFormData({
      name_en: "",
      name_ka: "",
      date: "",
      is_recurring: false,
      applies_to_all: true,
    })
  }


  const retry = () => {
    setLoading(true)
    setLoadError(null)
    fetchHolidays()
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingHoliday(null)
    resetForm()
  }

  const openCreate = () => {
    setEditingHoliday(null)
    resetForm()
    setIsDialogOpen(true)
  }

  const years = holidayYears(holidays)
  // A year that disappeared after a delete falls back to every year.
  const activeYear = year !== "all" && !years.includes(Number(year)) ? "all" : year
  const visible = filterHolidaysByYear(holidays, activeYear)

  const columns: LeaveColumn<PublicHoliday>[] = [
    {
      id: "date",
      header: t("publicHolidays.tableDate"),
      width: "128px",
      mobile: "meta",
      cell: (holiday) => (
        <span className="tabular-nums" data-testid="holiday-date">
          {formatLeaveDate(holiday.date, locale, { year: "always" })}
        </span>
      ),
    },
    {
      id: "name",
      header: t("publicHolidays.tableName"),
      width: "minmax(0,1fr)",
      mobile: "title",
      cell: (holiday) => <span className="truncate font-medium">{holidayName(holiday)}</span>,
    },
    {
      id: "recurring",
      header: t("publicHolidays.tableRecurring"),
      width: "128px",
      mobile: "end",
      cell: (holiday) =>
        holiday.is_recurring ? (
          <TonePill tone="info">{t("publicHolidays.annual")}</TonePill>
        ) : (
          <TonePill tone="neutral">{t("publicHolidays.oneTime")}</TonePill>
        ),
    },
    {
      id: "actions",
      header: <span className="sr-only">{t("publicHolidays.tableActions")}</span>,
      width: "60px",
      align: "end",
      mobile: "end",
      cell: (holiday) => {
        const name = holidayName(holiday)
        return (
          <span className="flex items-center gap-0.5">
            <button
              type="button"
              className={leaveButton.ghostIconSm}
              disabled={busyId === holiday.id}
              onClick={() => handleEdit(holiday)}
              aria-label={t("lv04.editHoliday", { name })}
              title={t("hr.common.edit")}
              data-testid="holiday-edit"
            >
              {busyId === holiday.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              className={cn(leaveButton.ghostIconSm, "hover:bg-destructive/10 hover:text-destructive")}
              disabled={busyId === holiday.id}
              onClick={() => handleDelete(holiday.id)}
              aria-label={t("lv04.deleteHoliday", { name })}
              title={t("hr.common.delete")}
              data-testid="holiday-delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
        )
      },
    },
  ]

  const loaded = !loading && !loadError
  // Non-admins get a 403 and the "no access" state: don't offer actions that can only fail.
  const canCreate = !isForbidden(loadError)
  const newLabel = t("publicHolidays.newHoliday")
  const georgianLabel = t("hr.holidays.loadGeorgian")

  return (
    <>
      <LeaveHeaderBridge
        sub={loaded ? t("lv04.holidaysCount", { count: holidays.length }) : null}
        // The page header carries both buttons on wider screens.
        primary={isMobile && canCreate ? { label: newLabel, icon: Plus, onClick: openCreate, testId: "holidays-new-header" } : null}
        secondary={
          isMobile && canCreate
            ? [{ label: georgianLabel, icon: Flag, onClick: () => setGeorgianOpen(true), testId: "holidays-georgian-header" }]
            : []
        }
      />
      <LeavePage width="wide" testId="public-holidays-page">
        <LeavePageHeader
          icon={CalendarRange}
          title={t("publicHolidays.title")}
          description={t("publicHolidays.description")}
          action={
            canCreate ? (
              <div className="hidden items-center gap-2 md:flex">
                <button
                  type="button"
                  onClick={() => setGeorgianOpen(true)}
                  className={leaveButton.outline}
                  data-testid="holidays-georgian"
                >
                  <Flag className="h-3.5 w-3.5" aria-hidden />
                  {georgianLabel}
                </button>
                <button type="button" onClick={openCreate} className={leaveButton.primary} data-testid="holidays-new">
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {newLabel}
                </button>
              </div>
            ) : null
          }
        />

        {loaded && years.length > 1 && (
          <LeaveToolbar inset className="min-h-0">
            <Segmented
              ariaLabel={t("lv04.yearFilter")}
              value={activeYear}
              onChange={setYear}
              testId="holidays-year"
              options={[
                { value: "all", label: t("lv04.allYears"), count: holidays.length },
                ...years.map((y) => ({
                  value: String(y),
                  label: String(y),
                  count: filterHolidaysByYear(holidays, String(y)).length,
                })),
              ]}
            />
          </LeaveToolbar>
        )}

        <LeaveTable
          variant="card"
          ariaLabel={t("publicHolidays.cardTitle")}
          columns={columns}
          rows={loading ? undefined : visible}
          rowKey={(holiday) => holiday.id}
          onRowClick={(holiday) => {
            if (busyId !== holiday.id) handleEdit(holiday)
          }}
          error={loadError}
          onRetry={retry}
          skeletonRows={6}
          testId="holidays-table"
          empty={
            <LeaveEmptyState
              icon={CalendarRange}
              title={t("publicHolidays.noHolidays")}
              description={t("publicHolidays.addFirstHoliday")}
              action={
                <button type="button" onClick={openCreate} className={leaveButton.primary}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {t("publicHolidays.createHoliday")}
                </button>
              }
            />
          }
          footer={
            loaded && visible.length > 0 ? (
              <span className="truncate">
                {t("lv04.holidaysCount", { count: visible.length })} · {t("lv04.clickToEdit")}
              </span>
            ) : undefined
          }
        />
      </LeavePage>

      <Dialog open={georgianOpen} onOpenChange={setGeorgianOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-[400px]" data-testid="holidays-georgian-dialog">
          <DialogHeader className="border-b px-5 py-4 text-start">
            <DialogTitle className="text-base">{t("hr.holidays.loadGeorgianTitle")}</DialogTitle>
            <DialogDescription className="text-[13px]">{t("hr.holidays.loadGeorgianDesc")}</DialogDescription>
          </DialogHeader>
          <div className="px-5 py-4">
            <DialogField label={t("hr.holidays.year")} htmlFor="georgian-year">
              <Select value={georgianYear} onValueChange={setGeorgianYear}>
                <SelectTrigger id="georgian-year" className={cn(dialogControl, "w-full tabular-nums")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[thisYear - 1, thisYear, thisYear + 1, thisYear + 2].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DialogField>
          </div>
          <DialogFooter className="gap-2 border-t px-5 py-3">
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setGeorgianOpen(false)}>
              {t("shared.cancel")}
            </Button>
            <Button type="button" size="sm" className="h-8" onClick={handleLoadGeorgian} disabled={loadingGeorgian}>
              {loadingGeorgian && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("hr.holidays.load")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingHoliday(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-[500px]" data-testid="holiday-dialog">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="border-b px-5 py-4 text-start">
              <DialogTitle className="text-base">
                {editingHoliday ? t("publicHolidays.editHoliday") : t("publicHolidays.createHoliday")}
              </DialogTitle>
              <DialogDescription className="text-[13px]">{t("publicHolidays.dialogDescription")}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <DialogField label={t("publicHolidays.nameEnglish")} htmlFor="name_en">
                  <Input
                    id="name_en"
                    className={dialogControl}
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    required
                  />
                </DialogField>
                <DialogField label={t("publicHolidays.nameGeorgian")} htmlFor="name_ka">
                  <Input
                    id="name_ka"
                    className={dialogControl}
                    value={formData.name_ka}
                    onChange={(e) => setFormData({ ...formData, name_ka: e.target.value })}
                    required
                  />
                </DialogField>
              </div>

              <DialogField label={t("publicHolidays.date")} htmlFor="date">
                <Input
                  id="date"
                  type="date"
                  className={cn(dialogControl, "tabular-nums sm:w-[200px]")}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </DialogField>

              <SwitchList>
                <SwitchRow
                  id="is_recurring"
                  label={t("publicHolidays.recurringAnnually")}
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                />
                <SwitchRow
                  id="applies_to_all"
                  label={t("publicHolidays.appliesToAll")}
                  checked={formData.applies_to_all}
                  onCheckedChange={(checked) => setFormData({ ...formData, applies_to_all: checked })}
                />
              </SwitchList>
            </div>
            <DialogFooter className="gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={closeDialog}>
                {t("publicHolidays.cancel")}
              </Button>
              <Button type="submit" size="sm" className="h-8" disabled={submitting} data-testid="holiday-submit">
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingHoliday ? t("publicHolidays.update") : t("publicHolidays.create")} {t("publicHolidays.holiday")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
