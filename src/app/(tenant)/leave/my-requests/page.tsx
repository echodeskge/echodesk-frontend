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

interface LeaveRequest {
  id: number
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

interface LeaveType {
  id: number
  name: { en: string; ka: string }
  code: string
  color: string
  is_active: boolean
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
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
      // TODO: Replace with actual API call
      // const response = await apiLeaveEmployeeMyRequestsList()
      setRequests([])
    } catch (error) {
      console.error("Failed to fetch requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLeaveTypes = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await apiLeaveEmployeeLeaveTypesList()
      setLeaveTypes([])
    } catch (error) {
      console.error("Failed to fetch leave types:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // TODO: Replace with actual API call
      // await apiLeaveEmployeeMyRequestsCreate({ ...formData })
      setIsDialogOpen(false)
      fetchRequests()
      setFormData({
        leave_type: "",
        start_date: "",
        end_date: "",
        reason: "",
      })
    } catch (error) {
      console.error("Failed to create request:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
      pending: { label: "Pending", variant: "outline", icon: Clock },
      manager_approved: { label: "Manager Approved", variant: "secondary", icon: CheckCircle2 },
      hr_approved: { label: "HR Approved", variant: "secondary", icon: CheckCircle2 },
      approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
      rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
      cancelled: { label: "Cancelled", variant: "outline", icon: XCircle },
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
          <h1 className="text-3xl font-bold">My Leave Requests</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your leave requests
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create Leave Request</DialogTitle>
                <DialogDescription>
                  Submit a new leave request for approval
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="leave_type">Leave Type</Label>
                  <Select
                    value={formData.leave_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, leave_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type.id} value={String(type.id)}>
                          {type.name.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="start_date">Start Date</Label>
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
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Enter reason for leave..."
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
                  Cancel
                </Button>
                <Button type="submit">Submit Request</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>
            All your leave requests and their approval status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No leave requests</h3>
              <p className="text-muted-foreground mb-4">
                You haven&apos;t submitted any leave requests yet
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Request
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
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
                      {new Date(request.created_at).toLocaleDateString()}
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
