"use client"

import { useState, useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { localizedName } from "@/lib/utils"
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

interface LeaveRequest {
  id: number
  employee: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  leave_type: {
    id: number
    name: { en: string; ka: string }
    color: string
  }
  start_date: string
  end_date: string
  total_days: string
  reason: string
  status: string
  created_at: string
}

export default function TeamRequestsPage() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [comments, setComments] = useState("")

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await leaveManagerTeamRequestsList()
      setRequests([])
    } catch (error) {
      console.error("Failed to fetch requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return

    try {
      // TODO: Replace with actual API call
      if (actionType === "approve") {
        // await leaveManagerTeamRequestsApprove(selectedRequest.id, { comments })
      } else {
        // await leaveManagerTeamRequestsReject(selectedRequest.id, { comments })
      }
      setSelectedRequest(null)
      setActionType(null)
      setComments("")
      fetchRequests()
    } catch (error) {
      console.error(`Failed to ${actionType} request:`, error)
    }
  }

  const openActionDialog = (request: LeaveRequest, action: "approve" | "reject") => {
    setSelectedRequest(request)
    setActionType(action)
    setComments("")
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
            <div className="text-2xl font-bold">{requests.length}</div>
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
                  <TableHead>{t("shared.reason")}</TableHead>
                  <TableHead>{t("shared.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {request.employee.first_name} {request.employee.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {request.employee.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{ backgroundColor: request.leave_type.color }}
                        className="text-white"
                      >
                        {localizedName(request.leave_type.name, locale)}
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
                    <TableCell className="max-w-xs truncate">
                      {request.reason || "-"}
                    </TableCell>
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
        onOpenChange={() => {
          setSelectedRequest(null)
          setActionType(null)
          setComments("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? t("teamRequests.approveDialogTitle") : t("teamRequests.rejectDialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <div className="space-y-2 mt-2">
                  <p>
                    <strong>{t("shared.employee")}:</strong> {selectedRequest.employee.first_name}{" "}
                    {selectedRequest.employee.last_name}
                  </p>
                  <p>
                    <strong>{t("shared.leaveType")}:</strong> {localizedName(selectedRequest.leave_type.name, locale)}
                  </p>
                  <p>
                    <strong>{t("teamRequests.duration")}:</strong>{" "}
                    {new Date(selectedRequest.start_date).toLocaleDateString()} -{" "}
                    {new Date(selectedRequest.end_date).toLocaleDateString()} (
                    {t("teamRequests.totalDays", { count: selectedRequest.total_days })})
                  </p>
                  {selectedRequest.reason && (
                    <p>
                      <strong>{t("shared.reason")}:</strong> {selectedRequest.reason}
                    </p>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="comments">{t("teamRequests.commentsOptional")}</Label>
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
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null)
                setActionType(null)
                setComments("")
              }}
            >
              {t("shared.cancel")}
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleAction}
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
