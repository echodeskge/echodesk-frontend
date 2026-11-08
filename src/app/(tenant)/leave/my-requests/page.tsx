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
import { Plus, Calendar, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"
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
import { fetchMySubstitutes, type SubstituteAssignment } from "../_lib/hr-api"
import {
  buildSubstitutesPayload,
  fieldErrors,
  leaveTypeLimitError,
  validateSubstituteRows,
  type SubstituteDraftRow,
} from "../_lib/substitutes-utils"
import { useDeepLinkId } from "../_lib/useDeepLinkId"
import { useLeaveFeatures } from "../_lib/useLeaveFeatures"
import { LeaveRequestDetailDialog } from "../_components/LeaveRequestDetailDialog"
import { LeaveStatusBadge } from "../_components/LeaveStatusBadge"
import { SubstituteRowsEditor } from "../_components/SubstituteRowsEditor"
import { useLiteUsers } from "../_components/UserPicker"

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
  requires_substitutes?: boolean
}

// Statuses the API lets an employee cancel (see CanCancelLeave).
const CANCELLABLE_STATUSES = ["awaiting_substitutes", "pending", "manager_approved", "hr_approved"]

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
  const { features, userId } = useLeaveFeatures()
  const [deepLinkId, clearDeepLink] = useDeepLinkId()
  const [detailId, setDetailId] = useState<number | null>(null)
  // Field errors from the last create attempt (limits, balance, substitutes...).
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  // Substitutes: the saved "My substitutes" list (null = not loaded yet) or
  // inline rows when that list is empty.
  const [savedSubstitutes, setSavedSubstitutes] = useState<SubstituteAssignment[] | null>(null)
  const [substituteRows, setSubstituteRows] = useState<SubstituteDraftRow[]>([])
  const selectedType = leaveTypes.find((type) => String(type.id) === formData.leave_type)
  const needsSubstitutes = Boolean(features?.substitutes && selectedType?.requires_substitutes)
  const needsInlineSubstitutes = needsSubstitutes && savedSubstitutes !== null && savedSubstitutes.length === 0
  const { users: substituteUsers } = useLiteUsers({}, needsInlineSubstitutes)

  useEffect(() => {
    if (deepLinkId !== null) setDetailId(deepLinkId)
  }, [deepLinkId])

  useEffect(() => {
    if (!needsSubstitutes || savedSubstitutes !== null) return
    fetchMySubstitutes()
      .then(setSavedSubstitutes)
      .catch(() => setSavedSubstitutes([]))
  }, [needsSubstitutes, savedSubstitutes])

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
    setFormErrors({})
    setSubstituteRows([])
    // Re-read the saved list next time (it may have changed meanwhile).
    setSavedSubstitutes(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!formData.leave_type) {
      toast.error(t("myRequests.leaveTypeRequired"))
      return
    }

    if (needsInlineSubstitutes) {
      const rowsError = validateSubstituteRows(substituteRows, { selfId: userId })
      if (rowsError) {
        toast.error(t(`hr.substitutes.errors.${rowsError}`))
        return
      }
    }

    setSubmitting(true)
    setFormErrors({})
    try {
      const payload = {
        leave_type: Number(formData.leave_type),
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
        ...(needsInlineSubstitutes ? { substitutes: buildSubstitutesPayload(substituteRows) } : {}),
      }
      // `substitutes` is not in the generated request type yet.
      await leaveEmployeeMyRequestsCreate(payload as Parameters<typeof leaveEmployeeMyRequestsCreate>[0])
      toast.success(t("myRequests.submitted"))
      setIsDialogOpen(false)
      resetForm()
      await fetchRequests()
    } catch (error) {
      // Keep the dialog open so the user can fix the input and retry.
      console.error("Failed to create request:", error)
      // A per-type limit (e.g. one day off a month) comes with a code: show it translated.
      const limit = leaveTypeLimitError(error)
      const limitMessage = limit ? t(`hr.limits.${limit.limit}`, { max: limit.max }) : null
      const errors = fieldErrors(error)
      delete errors.code
      delete errors.limit
      delete errors.max
      setFormErrors(limitMessage ? { ...errors, leave_type: limitMessage } : errors)
      toast.error(t("myRequests.submitFailed"), {
        description: limitMessage || getApiErrorMessage(error) || undefined,
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
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) setFormErrors({})
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("myRequests.newRequest")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
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
                    onValueChange={(value) => {
                      setFormData({ ...formData, leave_type: value })
                      setFormErrors({})
                    }}
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
                  <FieldError message={formErrors.leave_type} />
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
                  <FieldError message={formErrors.start_date} />
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
                {needsSubstitutes && (
                  <div className="grid gap-2">
                    <Label>{t("hr.substitutes.requestSectionTitle")}</Label>
                    {savedSubstitutes === null ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : savedSubstitutes.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {t("hr.substitutes.savedListHint")}{" "}
                          <Link href="/leave/my-substitutes" className="underline">
                            {t("hr.substitutes.editSavedList")}
                          </Link>
                        </p>
                        <ol className="space-y-1 text-sm">
                          {[...savedSubstitutes]
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((s, i) => (
                              <li key={s.id} className="rounded-md border px-3 py-2">
                                <span className="font-medium">
                                  {i + 1}. {s.substitute_name}
                                </span>
                                <span className="text-muted-foreground"> — {s.task}</span>
                              </li>
                            ))}
                        </ol>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{t("hr.substitutes.inlineHint")}</p>
                        <SubstituteRowsEditor
                          rows={substituteRows}
                          onChange={setSubstituteRows}
                          users={substituteUsers}
                          selfId={userId}
                          disabled={submitting}
                          reorderable={false}
                        />
                      </div>
                    )}
                    <FieldError message={formErrors.substitutes} />
                  </div>
                )}
                <FieldError
                  message={[formErrors.end_date, formErrors.non_field_errors, formErrors.detail]
                    .filter(Boolean)
                    .join(" ")}
                />
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
                  <TableRow
                    key={request.id}
                    className="cursor-pointer"
                    onClick={() => setDetailId(request.id)}
                  >
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
                    <TableCell><LeaveStatusBadge status={request.status} /></TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {CANCELLABLE_STATUSES.includes(request.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={cancellingId === request.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCancel(request.id)
                          }}
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

      <LeaveRequestDetailDialog
        requestId={detailId}
        scope="employee"
        onClose={() => {
          setDetailId(null)
          if (deepLinkId !== null) clearDeepLink()
        }}
        onChanged={fetchRequests}
      />
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-destructive">{message}</p>
}
