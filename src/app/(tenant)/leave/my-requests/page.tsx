"use client"

import { useState, useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import axios from "@/api/axios"
import {
  leaveEmployeeLeaveTypesList,
  leaveEmployeeMyRequestsCancelCreate,
  leaveEmployeeMyRequestsCreate,
} from "@/api/generated/api"
import { getApiErrorMessage, localizedName } from "@/lib/utils"
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
import { Plus, Calendar, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Shape of LeaveRequestListSerializer: flat ids/names, no nested objects and
// no `reason` (that is only on the detail endpoint).
interface LeaveRequest {
  id: number
  leave_type: number
  leave_type_name: string
  leave_type_color?: string
  start_date: string
  end_date: string
  total_days: string
  status: string
  created_at: string
}

interface LeaveType {
  id: number
  name: { en?: string; ka?: string } | string | null
  name_display?: string
  code: string
  color?: string
}

// Statuses the API lets an employee cancel (see CanCancelLeave).
const CANCELLABLE_STATUSES = ["pending", "manager_approved", "hr_approved"]

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const results = (data as { results?: unknown } | null | undefined)?.results
  return Array.isArray(results) ? (results as T[]) : []
}

export default function MyRequestsPage() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  })

  useEffect(() => {
    fetchRequests()
    fetchLeaveTypes()
  }, [])

  const fetchRequests = async () => {
    try {
      // Direct call: the generated list function cannot send `lang`, which the
      // API uses to localise `leave_type_name`.
      const response = await axios.get("/api/leave/employee/my-requests/", {
        params: { lang: locale, page_size: 100 },
      })
      setRequests(unwrapList<LeaveRequest>(response.data))
    } catch (error) {
      console.error("Failed to fetch requests:", error)
      setRequests([])
      toast.error(t("shared.loadFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchLeaveTypes = async () => {
    try {
      // Positional: (ordering, page, pageSize)
      const response = await leaveEmployeeLeaveTypesList(undefined, undefined, 100)
      setLeaveTypes(unwrapList<LeaveType>(response))
    } catch (error) {
      console.error("Failed to fetch leave types:", error)
      setLeaveTypes([])
      toast.error(t("myRequests.leaveTypesLoadFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    }
  }

  const resetForm = () => {
    setFormData({
      leave_type: "",
      start_date: "",
      end_date: "",
      reason: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!formData.leave_type) {
      toast.error(t("myRequests.leaveTypeRequired"))
      return
    }

    setSubmitting(true)
    try {
      await leaveEmployeeMyRequestsCreate({
        leave_type: Number(formData.leave_type),
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
      })
      toast.success(t("myRequests.submitted"))
      setIsDialogOpen(false)
      resetForm()
      await fetchRequests()
    } catch (error) {
      // Keep the dialog open so the user can fix the input and retry.
      console.error("Failed to create request:", error)
      toast.error(t("myRequests.submitFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id: number) => {
    if (!confirm(t("myRequests.confirmCancel"))) return

    setCancellingId(id)
    try {
      await leaveEmployeeMyRequestsCancelCreate(String(id), {})
      toast.success(t("myRequests.cancelled"))
      await fetchRequests()
    } catch (error) {
      console.error("Failed to cancel request:", error)
      toast.error(t("myRequests.cancelFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    } finally {
      setCancellingId(null)
    }
  }

  const typeName = (type: LeaveType) =>
    typeof type.name === "string"
      ? type.name
      : localizedName(type.name, locale) || type.name_display || type.code

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
      pending: { label: t("shared.status.pending"), variant: "outline", icon: Clock },
      manager_approved: { label: t("shared.status.manager_approved"), variant: "secondary", icon: CheckCircle2 },
      hr_approved: { label: t("shared.status.hr_approved"), variant: "secondary", icon: CheckCircle2 },
      approved: { label: t("shared.status.approved"), variant: "default", icon: CheckCircle2 },
      rejected: { label: t("shared.status.rejected"), variant: "destructive", icon: XCircle },
      cancelled: { label: t("shared.status.cancelled"), variant: "outline", icon: XCircle },
    }

    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
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
          <h1 className="text-3xl font-bold">{t("myRequests.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("myRequests.description")}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("myRequests.newRequest")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{t("myRequests.createTitle")}</DialogTitle>
                <DialogDescription>
                  {t("myRequests.createDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="leave_type">{t("shared.leaveType")}</Label>
                  <Select
                    value={formData.leave_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, leave_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("myRequests.selectLeaveType")} />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {t("myRequests.noLeaveTypesAvailable")}
                        </div>
                      )}
                      {leaveTypes.map((type) => (
                        <SelectItem key={type.id} value={String(type.id)}>
                          {typeName(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="start_date">{t("shared.startDate")}</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_date">{t("shared.endDate")}</Label>
                  <Input
                    id="end_date"
                    type="date"
                    min={formData.start_date || undefined}
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reason">{t("shared.reason")}</Label>
                  <Textarea
                    id="reason"
                    placeholder={t("myRequests.reasonPlaceholder")}
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t("shared.cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("myRequests.submitRequest")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("shared.leaveRequests")}</CardTitle>
          <CardDescription>
            {t("myRequests.cardDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("shared.noLeaveRequests")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("myRequests.emptyDescription")}
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("myRequests.createFirst")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("shared.leaveType")}</TableHead>
                  <TableHead>{t("shared.startDate")}</TableHead>
                  <TableHead>{t("shared.endDate")}</TableHead>
                  <TableHead>{t("shared.days")}</TableHead>
                  <TableHead>{t("shared.statusLabel")}</TableHead>
                  <TableHead>{t("shared.submitted")}</TableHead>
                  <TableHead>{t("shared.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <Badge
                        style={{ backgroundColor: request.leave_type_color || undefined }}
                        className="text-white"
                      >
                        {request.leave_type_name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(request.start_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(request.end_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{request.total_days}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {CANCELLABLE_STATUSES.includes(request.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={cancellingId === request.id}
                          onClick={() => handleCancel(request.id)}
                        >
                          {cancellingId === request.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-1" />
                          )}
                          {t("myRequests.cancelRequest")}
                        </Button>
                      )}
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
