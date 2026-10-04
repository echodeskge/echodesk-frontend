"use client"

import { useState, useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import axios from "@/api/axios"
import {
  leaveManagerTeamRequestsApproveCreate,
  leaveManagerTeamRequestsRejectCreate,
  leaveManagerTeamRequestsRetrieve,
} from "@/api/generated/api"
import { getApiErrorMessage } from "@/lib/utils"
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
import { CheckCircle2, XCircle, Loader2, User, Calendar } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

// Shape of LeaveRequestListSerializer: flat ids/names. `reason` and the
// employee e-mail only exist on the detail endpoint and are loaded when the
// approve/reject dialog opens.
interface LeaveRequest {
  id: number
  employee: number
  employee_name: string
  leave_type: number
  leave_type_name: string
  leave_type_color?: string
  start_date: string
  end_date: string
  total_days: string
  status: string
  created_at: string
}

interface LeaveRequestExtra {
  reason?: string
  employee_email?: string
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const results = (data as { results?: unknown } | null | undefined)?.results
  return Array.isArray(results) ? (results as T[]) : []
}

export default function TeamRequestsPage() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [comments, setComments] = useState("")
  const [totalCount, setTotalCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [selectedExtra, setSelectedExtra] = useState<LeaveRequestExtra | null>(null)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      // Direct call: the generated list function cannot send `lang`, which the
      // API uses to localise `leave_type_name`.
      const response = await axios.get("/api/leave/manager/team-requests/", {
        params: { lang: locale, page_size: 100 },
      })
      const list = unwrapList<LeaveRequest>(response.data)
      setRequests(list)
      const count = (response.data as { count?: unknown } | null)?.count
      setTotalCount(typeof count === "number" ? count : list.length)
    } catch (error) {
      // Non-managers get 403 here: show the empty state and say why.
      console.error("Failed to fetch requests:", error)
      setRequests([])
      setTotalCount(0)
      toast.error(t("shared.loadFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  const closeDialog = () => {
    setSelectedRequest(null)
    setActionType(null)
    setComments("")
    setSelectedExtra(null)
  }

  const handleAction = async () => {
    if (!selectedRequest || !actionType || submitting) return

    const trimmed = comments.trim()
    // The API rejects a rejection without comments.
    if (actionType === "reject" && !trimmed) {
      toast.error(t("teamRequests.rejectCommentsRequired"))
      return
    }

    setSubmitting(true)
    try {
      const id = String(selectedRequest.id)
      if (actionType === "approve") {
        await leaveManagerTeamRequestsApproveCreate(id, { action: "approve", comments: trimmed })
        toast.success(t("teamRequests.approvedSuccess"))
      } else {
        await leaveManagerTeamRequestsRejectCreate(id, { action: "reject", comments: trimmed })
        toast.success(t("teamRequests.rejectedSuccess"))
      }
      closeDialog()
      await fetchRequests()
    } catch (error) {
      // Keep the dialog open so the user sees the reason and can retry.
      console.error(`Failed to ${actionType} request:`, error)
      toast.error(
        actionType === "approve" ? t("teamRequests.approveFailed") : t("teamRequests.rejectFailed"),
        { description: getApiErrorMessage(error) || undefined }
      )
    } finally {
      setSubmitting(false)
    }
  }

  const openActionDialog = async (request: LeaveRequest, action: "approve" | "reject") => {
    setSelectedRequest(request)
    setActionType(action)
    setComments("")
    setSelectedExtra(null)

    // The list has no `reason`; load it so the approver can read it.
    try {
      const detail = await leaveManagerTeamRequestsRetrieve(String(request.id))
      setSelectedExtra({ reason: detail.reason, employee_email: detail.employee_email })
    } catch (error) {
      console.error("Failed to load request details:", error)
      toast.error(t("teamRequests.detailsLoadFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      pending: { label: t("shared.status.pending"), variant: "outline" },
      manager_approved: { label: t("shared.status.manager_approved"), variant: "secondary" },
      hr_approved: { label: t("shared.status.hr_approved"), variant: "secondary" },
      approved: { label: t("shared.status.approved"), variant: "default" },
      rejected: { label: t("shared.status.rejected"), variant: "destructive" },
      cancelled: { label: t("shared.status.cancelled"), variant: "outline" },
    }

    const config = statusConfig[status] || statusConfig.pending

    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const pendingRequests = requests.filter((r) => r.status === "pending")

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("teamRequests.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("teamRequests.description")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("teamRequests.pendingApproval")}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">{t("teamRequests.requireYourAction")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("teamRequests.totalRequests")}</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">{t("teamRequests.fromYourTeam")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("shared.status.approved")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter((r) => r.status.includes("approved")).length}
            </div>
            <p className="text-xs text-muted-foreground">{t("teamRequests.thisPeriod")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("shared.leaveRequests")}</CardTitle>
          <CardDescription>
            {t("teamRequests.cardDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("teamRequests.noRequestsTitle")}</h3>
              <p className="text-muted-foreground">
                {t("teamRequests.noRequestsDescription")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("shared.employee")}</TableHead>
                  <TableHead>{t("shared.leaveType")}</TableHead>
                  <TableHead>{t("shared.startDate")}</TableHead>
                  <TableHead>{t("shared.endDate")}</TableHead>
                  <TableHead>{t("shared.days")}</TableHead>
                  <TableHead>{t("shared.statusLabel")}</TableHead>
                  <TableHead>{t("shared.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{request.employee_name}</div>
                    </TableCell>
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
                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => openActionDialog(request, "approve")}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            {t("teamRequests.approve")}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openActionDialog(request, "reject")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            {t("teamRequests.reject")}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={selectedRequest !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? t("teamRequests.approveDialogTitle") : t("teamRequests.rejectDialogTitle")}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                {selectedRequest && (
                  <div className="space-y-2 mt-2">
                    <p>
                      <strong>{t("shared.employee")}:</strong> {selectedRequest.employee_name}
                      {selectedExtra?.employee_email ? ` (${selectedExtra.employee_email})` : ""}
                    </p>
                    <p>
                      <strong>{t("shared.leaveType")}:</strong> {selectedRequest.leave_type_name}
                    </p>
                    <p>
                      <strong>{t("teamRequests.duration")}:</strong>{" "}
                      {new Date(selectedRequest.start_date).toLocaleDateString()} -{" "}
                      {new Date(selectedRequest.end_date).toLocaleDateString()} (
                      {t("teamRequests.totalDays", { count: selectedRequest.total_days })})
                    </p>
                    {selectedExtra?.reason && (
                      <p>
                        <strong>{t("shared.reason")}:</strong> {selectedExtra.reason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="comments">
                {actionType === "reject"
                  ? t("teamRequests.commentsRequired")
                  : t("teamRequests.commentsOptional")}
              </Label>
              <Textarea
                id="comments"
                placeholder={t("teamRequests.commentsPlaceholder")}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t("shared.cancel")}
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={submitting}
            >
              {actionType === "approve" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t("teamRequests.confirmApproval")}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  {t("teamRequests.confirmRejection")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
