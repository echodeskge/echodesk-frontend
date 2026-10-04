"use client"

import { useState, useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { localizedName } from "@/lib/utils"
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
import { Loader2, Calendar } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

export default function AllRequestsPage() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchRequests()
  }, [statusFilter])

  const fetchRequests = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await leaveAdminLeaveRequestsList({ status: statusFilter !== 'all' ? statusFilter : undefined })
      setRequests([])
    } catch (error) {
      console.error("Failed to fetch requests:", error)
    } finally {
      setLoading(false)
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t("allRequests.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("allRequests.description")}
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("allRequests.filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allRequests.filterAll")}</SelectItem>
            <SelectItem value="pending">{t("shared.status.pending")}</SelectItem>
            <SelectItem value="approved">{t("shared.status.approved")}</SelectItem>
            <SelectItem value="rejected">{t("shared.status.rejected")}</SelectItem>
            <SelectItem value="cancelled">{t("shared.status.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("shared.leaveRequests")}</CardTitle>
          <CardDescription>
            {t("allRequests.cardDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("shared.noLeaveRequests")}</h3>
              <p className="text-muted-foreground">
                {t("allRequests.noMatchDescription")}
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
                  <TableHead>{t("shared.submitted")}</TableHead>
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
