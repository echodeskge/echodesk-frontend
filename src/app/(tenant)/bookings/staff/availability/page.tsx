"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import {
  bookingsAdminStaffList,
  bookingsAdminAvailabilityList,
  bookingsAdminAvailabilityCreate,
  bookingsAdminAvailabilityPartialUpdate,
  bookingsAdminAvailabilityDestroy,
  bookingsAdminExceptionsList,
  bookingsAdminExceptionsCreate,
  bookingsAdminExceptionsDestroy,
} from "@/api/generated"
import { BookingStaff, StaffAvailability, StaffException } from "@/api/generated/interfaces"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Clock, Plus, Trash2, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const DAYS_OF_WEEK = [
  { value: 0, key: "monday" },
  { value: 1, key: "tuesday" },
  { value: 2, key: "wednesday" },
  { value: 3, key: "thursday" },
  { value: 4, key: "friday" },
  { value: 5, key: "saturday" },
  { value: 6, key: "sunday" },
] as const

export default function StaffAvailabilityPage() {
  const t = useTranslations("bookingsAvailability")
  const { toast } = useToast()

  const [staffList, setStaffList] = useState<BookingStaff[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>("")
  const [availability, setAvailability] = useState<StaffAvailability[]>([])
  const [exceptions, setExceptions] = useState<StaffException[]>([])
  const [loading, setLoading] = useState(true)

  // Edit schedule dialog
  const [editDialog, setEditDialog] = useState(false)
  const [editDay, setEditDay] = useState<number>(0)
  const [editData, setEditData] = useState({
    is_available: true,
    start_time: "09:00",
    end_time: "18:00",
    break_start: "",
    break_end: "",
  })
  const [editingId, setEditingId] = useState<number | null>(null)

  // Add exception dialog
  const [exceptionDialog, setExceptionDialog] = useState(false)
  const [exceptionData, setExceptionData] = useState({
    date: "",
    is_available: false,
    start_time: "",
    end_time: "",
    reason: "",
  })

  useEffect(() => {
    fetchStaff()
  }, [])

  useEffect(() => {
    if (selectedStaffId) {
      fetchAvailability()
      fetchExceptions()
    }
  }, [selectedStaffId])

  const fetchStaff = async () => {
    try {
      const response = await bookingsAdminStaffList()
      const list = (response.results || response) as BookingStaff[]
      setStaffList(list)
      if (list.length > 0) setSelectedStaffId(list[0].id.toString())
    } catch {
      toast({ title: t("error"), description: t("fetchFailed"), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailability = async () => {
    try {
      const response = await bookingsAdminAvailabilityList(undefined, undefined, undefined, parseInt(selectedStaffId))
      setAvailability((response.results || response) as StaffAvailability[])
    } catch {
      setAvailability([])
    }
  }

  const fetchExceptions = async () => {
    try {
      const response = await bookingsAdminExceptionsList(undefined, undefined, undefined, parseInt(selectedStaffId))
      setExceptions((response.results || response) as StaffException[])
    } catch {
      setExceptions([])
    }
  }

  const getAvailabilityForDay = (dayOfWeek: number): StaffAvailability | undefined => {
    return availability.find((a) => (a.day_of_week as unknown as number) === dayOfWeek)
  }

  const handleEditDay = (dayOfWeek: number) => {
    const existing = getAvailabilityForDay(dayOfWeek)
    setEditDay(dayOfWeek)
    if (existing) {
      setEditingId(existing.id)
      setEditData({
        is_available: existing.is_available ?? true,
        start_time: existing.start_time?.slice(0, 5) || "09:00",
        end_time: existing.end_time?.slice(0, 5) || "18:00",
        break_start: existing.break_start?.slice(0, 5) || "",
        break_end: existing.break_end?.slice(0, 5) || "",
      })
    } else {
      setEditingId(null)
      setEditData({
        is_available: true,
        start_time: "09:00",
        end_time: "18:00",
        break_start: "",
        break_end: "",
      })
    }
    setEditDialog(true)
  }

  const handleSaveSchedule = async () => {
    try {
      const payload = {
        staff: parseInt(selectedStaffId),
        day_of_week: editDay,
        is_available: editData.is_available,
        start_time: editData.start_time,
        end_time: editData.end_time,
        break_start: editData.break_start || null,
        break_end: editData.break_end || null,
      }

      if (editingId) {
        await bookingsAdminAvailabilityPartialUpdate(editingId, payload as any)
      } else {
        await bookingsAdminAvailabilityCreate(payload as any)
      }
      toast({ title: t("success"), description: t("scheduleSaved") })
      setEditDialog(false)
      fetchAvailability()
    } catch {
      toast({ title: t("error"), description: t("saveFailed"), variant: "destructive" })
    }
  }

  const handleAddException = async () => {
    if (!exceptionData.date) return
    try {
      await bookingsAdminExceptionsCreate({
        staff: parseInt(selectedStaffId),
        date: exceptionData.date,
        is_available: exceptionData.is_available,
        start_time: exceptionData.start_time || undefined,
        end_time: exceptionData.end_time || undefined,
        reason: exceptionData.reason || undefined,
      } as any)
      toast({ title: t("success"), description: t("exceptionAdded") })
      setExceptionDialog(false)
      setExceptionData({ date: "", is_available: false, start_time: "", end_time: "", reason: "" })
      fetchExceptions()
    } catch {
      toast({ title: t("error"), description: t("saveFailed"), variant: "destructive" })
    }
  }

  const handleDeleteException = async (id: number) => {
    if (!confirm(t("confirmDeleteException"))) return
    try {
      await bookingsAdminExceptionsDestroy(id)
      toast({ title: t("success"), description: t("exceptionDeleted") })
      fetchExceptions()
    } catch {
      toast({ title: t("error"), description: t("saveFailed"), variant: "destructive" })
    }
  }

  const selectedStaff = staffList.find((s) => s.id.toString() === selectedStaffId)

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Staff Selector */}
      <div className="w-full sm:w-72">
        <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
          <SelectTrigger>
            <SelectValue placeholder={t("selectStaffMember")} />
          </SelectTrigger>
          <SelectContent>
            {staffList.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.user.first_name} {s.user.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedStaffId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("weeklySchedule")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {DAYS_OF_WEEK.map(({ value, key }) => {
                  const avail = getAvailabilityForDay(value)
                  const isAvailable = avail?.is_available ?? false
                  return (
                    <div
                      key={value}
                      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleEditDay(value)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium w-28">{t(key)}</span>
                        {avail && isAvailable ? (
                          <div className="text-sm text-muted-foreground">
                            {avail.start_time?.slice(0, 5)} - {avail.end_time?.slice(0, 5)}
                            {avail.break_start && (
                              <span className="ml-2 text-xs">
                                ({t("breakStart")}: {avail.break_start?.slice(0, 5)} - {avail.break_end?.slice(0, 5)})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {avail ? t("dayOff") : t("noScheduleSet")}
                          </span>
                        )}
                      </div>
                      <Badge variant={isAvailable ? "default" : "secondary"}>
                        {isAvailable ? t("working") : t("dayOff")}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Exceptions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t("exceptions")}
                </CardTitle>
                <Button size="sm" onClick={() => setExceptionDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addException")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {exceptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("noExceptions")}</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("date")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead>{t("reason")}</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exceptions.map((exc) => (
                        <TableRow key={exc.id}>
                          <TableCell className="font-medium">{exc.date}</TableCell>
                          <TableCell>
                            <Badge variant={exc.is_available ? "default" : "secondary"}>
                              {exc.is_available ? t("available") : t("unavailable")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {exc.reason || t("noReason")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteException(exc.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Schedule Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("editSchedule")} - {t(DAYS_OF_WEEK[editDay]?.key || "monday")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label>{t("available")}</Label>
              <Switch
                checked={editData.is_available}
                onCheckedChange={(checked) =>
                  setEditData({ ...editData, is_available: checked })
                }
              />
            </div>
            {editData.is_available && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("startTime")}</Label>
                    <Input
                      type="time"
                      value={editData.start_time}
                      onChange={(e) =>
                        setEditData({ ...editData, start_time: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>{t("endTime")}</Label>
                    <Input
                      type="time"
                      value={editData.end_time}
                      onChange={(e) =>
                        setEditData({ ...editData, end_time: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("breakStart")}</Label>
                    <Input
                      type="time"
                      value={editData.break_start}
                      onChange={(e) =>
                        setEditData({ ...editData, break_start: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>{t("breakEnd")}</Label>
                    <Input
                      type="time"
                      value={editData.break_end}
                      onChange={(e) =>
                        setEditData({ ...editData, break_end: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSaveSchedule}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Exception Dialog */}
      <Dialog open={exceptionDialog} onOpenChange={setExceptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addException")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t("date")}</Label>
              <Input
                type="date"
                value={exceptionData.date}
                onChange={(e) =>
                  setExceptionData({ ...exceptionData, date: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("available")}</Label>
              <Switch
                checked={exceptionData.is_available}
                onCheckedChange={(checked) =>
                  setExceptionData({ ...exceptionData, is_available: checked })
                }
              />
            </div>
            {exceptionData.is_available && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("startTime")}</Label>
                  <Input
                    type="time"
                    value={exceptionData.start_time}
                    onChange={(e) =>
                      setExceptionData({ ...exceptionData, start_time: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{t("endTime")}</Label>
                  <Input
                    type="time"
                    value={exceptionData.end_time}
                    onChange={(e) =>
                      setExceptionData({ ...exceptionData, end_time: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            <div>
              <Label>{t("reason")}</Label>
              <Input
                value={exceptionData.reason}
                onChange={(e) =>
                  setExceptionData({ ...exceptionData, reason: e.target.value })
                }
                placeholder={t("reason")}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExceptionDialog(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleAddException} disabled={!exceptionData.date}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
