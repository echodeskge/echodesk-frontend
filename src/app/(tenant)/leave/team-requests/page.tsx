"use client"

import { useState, useEffect } from "react"
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
      // const response = await apiLeaveManagerTeamRequestsList()
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
        // await apiLeaveManagerTeamRequestsApprove(selectedRequest.id, { comments })
      } else {
        // await apiLeaveManagerTeamRequestsReject(selectedRequest.id, { comments })
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
      pending: { label: "Pending", variant: "outline" },
      manager_approved: { label: "Manager Approved", variant: "secondary" },
      hr_approved: { label: "HR Approved", variant: "secondary" },
      approved: { label: "Approved", variant: "default" },
      rejected: { label: "Rejected", variant: "destructive" },
      cancelled: { label: "Cancelled", variant: "outline" },
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
        <h1 className="text-3xl font-bold">Team Leave Requests</h1>
        <p className="text-muted-foreground mt-1">
          Approve or reject leave requests from your team members
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">Require your action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">From your team</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter((r) => r.status.includes("approved")).length}
            </div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>
            Manage leave requests from your direct reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No team requests</h3>
              <p className="text-muted-foreground">
                There are no leave requests from your team members yet
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Actions</TableHead>
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
                        {request.leave_type.name.en}
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
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openActionDialog(request, "reject")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
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
              {actionType === "approve" ? "Approve" : "Reject"} Leave Request
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <div className="space-y-2 mt-2">
                  <p>
                    <strong>Employee:</strong> {selectedRequest.employee.first_name}{" "}
                    {selectedRequest.employee.last_name}
                  </p>
                  <p>
                    <strong>Leave Type:</strong> {selectedRequest.leave_type.name.en}
                  </p>
                  <p>
                    <strong>Duration:</strong>{" "}
                    {new Date(selectedRequest.start_date).toLocaleDateString()} -{" "}
                    {new Date(selectedRequest.end_date).toLocaleDateString()} (
                    {selectedRequest.total_days} days)
                  </p>
                  {selectedRequest.reason && (
                    <p>
                      <strong>Reason:</strong> {selectedRequest.reason}
                    </p>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                placeholder="Add your comments here..."
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
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleAction}
            >
              {actionType === "approve" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Approval
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
