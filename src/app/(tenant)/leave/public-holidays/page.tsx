"use client"

import { useState, useEffect } from "react"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Loader2, CalendarRange } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

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
  const [loading, setLoading] = useState(true)
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

  const fetchHolidays = async () => {
    try {
      // Positional: (ordering, page, pageSize)
      const response = await leaveAdminPublicHolidaysList("date", undefined, 100)
      setHolidays(unwrapList<PublicHoliday>(response))
    } catch (error) {
      console.error("Failed to fetch holidays:", error)
      setHolidays([])
      toast.error(t("shared.loadFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t("publicHolidays.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("publicHolidays.description")}
          </p>
        </div>
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
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("publicHolidays.newHoliday")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingHoliday ? t("publicHolidays.editHoliday") : t("publicHolidays.createHoliday")}
                </DialogTitle>
                <DialogDescription>
                  {t("publicHolidays.dialogDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name_en">{t("publicHolidays.nameEnglish")}</Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={(e) =>
                        setFormData({ ...formData, name_en: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name_ka">{t("publicHolidays.nameGeorgian")}</Label>
                    <Input
                      id="name_ka"
                      value={formData.name_ka}
                      onChange={(e) =>
                        setFormData({ ...formData, name_ka: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="date">{t("publicHolidays.date")}</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_recurring"
                      checked={formData.is_recurring}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_recurring: checked })
                      }
                    />
                    <Label htmlFor="is_recurring">{t("publicHolidays.recurringAnnually")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="applies_to_all"
                      checked={formData.applies_to_all}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, applies_to_all: checked })
                      }
                    />
                    <Label htmlFor="applies_to_all">{t("publicHolidays.appliesToAll")}</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingHoliday(null)
                    resetForm()
                  }}
                >
                  {t("publicHolidays.cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingHoliday ? t("publicHolidays.update") : t("publicHolidays.create")} {t("publicHolidays.holiday")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("publicHolidays.cardTitle")}</CardTitle>
          <CardDescription>
            {t("publicHolidays.cardDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {holidays.length === 0 ? (
            <div className="text-center py-12">
              <CalendarRange className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("publicHolidays.noHolidays")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("publicHolidays.addFirstHoliday")}
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("publicHolidays.createHoliday")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("publicHolidays.tableName")}</TableHead>
                  <TableHead>{t("publicHolidays.tableDate")}</TableHead>
                  <TableHead>{t("publicHolidays.tableRecurring")}</TableHead>
                  <TableHead>{t("publicHolidays.tableActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell>{holidayName(holiday)}</TableCell>
                    <TableCell>
                      {new Date(holiday.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {holiday.is_recurring ? (
                        <Badge variant="default">{t("publicHolidays.annual")}</Badge>
                      ) : (
                        <Badge variant="outline">{t("publicHolidays.oneTime")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === holiday.id}
                          onClick={() => handleEdit(holiday)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === holiday.id}
                          onClick={() => handleDelete(holiday.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
