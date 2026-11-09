"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Calendar, Loader2, Plus, SearchX, XCircle } from "lucide-react"
import axios from "@/api/axios"
import { leaveEmployeeMyRequestsCancelCreate } from "@/api/generated/api"
import { getApiErrorMessage } from "@/lib/utils"
import { useDeepLinkId } from "../_lib/useDeepLinkId"
import {
  REQUEST_FILTERS,
  filterRequests,
  isCancellable,
  requestFilterCounts,
  type RequestFilter,
} from "../_lib/lv01-utils"
import { LeaveRequestDetailDialog } from "../_components/LeaveRequestDetailDialog"
import { LeaveStatusBadge } from "../_components/LeaveStatusBadge"
import {
  LeaveEmptyState,
  LeaveHeaderBridge,
  LeavePage,
  LeaveTable,
  LeaveToolbar,
  LeaveTypeChip,
  Segmented,
  formatDays,
  formatLeaveDate,
  formatLeaveRange,
  leaveButton,
  parseDays,
  type LeaveColumn,
} from "../_components/ui"
import { NewRequestDialog } from "./_components/new-request-dialog"

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

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const results = (data as { results?: unknown } | null | undefined)?.results
  return Array.isArray(results) ? (results as T[]) : []
}

export default function MyRequestsPage() {
  const t = useTranslations("leave")
  const locale = useLocale()
  // undefined = first load still running.
  const [requests, setRequests] = useState<LeaveRequest[] | undefined>(undefined)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [filter, setFilter] = useState<RequestFilter>("all")
  const [deepLinkId, clearDeepLink] = useDeepLinkId()
  const [detailId, setDetailId] = useState<number | null>(null)

  useEffect(() => {
    if (deepLinkId !== null) setDetailId(deepLinkId)
  }, [deepLinkId])

  const fetchRequests = useCallback(async () => {
    try {
      // Direct call: the generated list function cannot send `lang`, which the
      // API uses to localise `leave_type_name`.
      const response = await axios.get("/api/leave/employee/my-requests/", {
        params: { lang: locale, page_size: 100 },
      })
      setRequests(unwrapList<LeaveRequest>(response.data))
      setLoadError(null)
    } catch (error) {
      console.error("Failed to fetch requests:", error)
      setRequests([])
      setLoadError(error)
      toast.error(t("shared.loadFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    }
  }, [locale, t])

  useEffect(() => {
    fetchRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const all = useMemo(() => requests ?? [], [requests])
  const counts = useMemo(() => requestFilterCounts(all), [all])
  const visible = useMemo(() => (requests ? filterRequests(requests, filter) : undefined), [requests, filter])

  const columns: LeaveColumn<LeaveRequest>[] = [
    {
      id: "type",
      header: t("shared.leaveType"),
      width: "minmax(0,1.4fr)",
      mobile: "title",
      cell: (r) => <LeaveTypeChip name={r.leave_type_name} color={r.leave_type_color} className="font-medium @3xl:font-normal" />,
    },
    {
      id: "period",
      header: t("myRequests.period"),
      width: "minmax(0,1fr)",
      mobile: "meta",
      cell: (r) => <span className="truncate tabular-nums">{formatLeaveRange(r.start_date, r.end_date, locale)}</span>,
    },
    {
      id: "days",
      header: t("shared.days"),
      width: "64px",
      align: "end",
      mobile: "meta",
      cell: (r) => (
        <span className="tabular-nums">
          <span className="@3xl:hidden">{t("ui.days", { count: parseDays(r.total_days) ?? 0 })}</span>
          <span className="hidden @3xl:inline">{formatDays(r.total_days)}</span>
        </span>
      ),
    },
    {
      id: "status",
      header: t("shared.statusLabel"),
      // Wide enough for the longest Georgian status ("manager approved").
      width: "224px",
      mobile: "end",
      cell: (r) => <LeaveStatusBadge status={r.status} />,
    },
    {
      id: "submitted",
      header: t("shared.submitted"),
      width: "96px",
      mobile: "hidden",
      muted: true,
      cell: (r) => <span className="tabular-nums">{formatLeaveDate(r.created_at, locale)}</span>,
    },
    {
      id: "actions",
      header: <span className="sr-only">{t("shared.actions")}</span>,
      width: "168px",
      align: "end",
      mobile: "actions",
      cell: (r) =>
        isCancellable(r.status) ? (
          <button
            type="button"
            className={leaveButton.dangerSm}
            disabled={cancellingId === r.id}
            onClick={() => handleCancel(r.id)}
            data-testid="cancel-request"
          >
            {cancellingId === r.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <XCircle className="h-3.5 w-3.5" aria-hidden />
            )}
            {t("myRequests.cancelRequest")}
          </button>
        ) : null,
    },
  ]

  const filterLabels: Record<RequestFilter, string> = {
    all: t("myRequests.filters.all"),
    active: t("myRequests.filters.active"),
    approved: t("myRequests.filters.approved"),
    closed: t("myRequests.filters.closed"),
  }

  const empty =
    all.length === 0 ? (
      <LeaveEmptyState
        icon={Calendar}
        title={t("shared.noLeaveRequests")}
        description={t("myRequests.emptyDescription")}
        testId="my-requests-empty"
        action={
          <button type="button" className={leaveButton.primary} onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t("myRequests.createFirst")}
          </button>
        }
      />
    ) : (
      <LeaveEmptyState
        icon={SearchX}
        title={t("ui.noMatches")}
        testId="my-requests-no-matches"
        action={
          <button type="button" className={leaveButton.outlineSm} onClick={() => setFilter("all")}>
            {t("ui.clearFilters")}
          </button>
        }
      />
    )

  return (
    <>
      <LeaveHeaderBridge
        sub={requests && !loadError ? t("myRequests.count", { count: all.length }) : null}
        primary={{
          label: t("myRequests.newRequest"),
          icon: Plus,
          onClick: () => setIsDialogOpen(true),
          testId: "new-request",
        }}
      />
      <LeavePage fill testId="my-requests-page">
        <LeaveToolbar>
          <Segmented
            value={filter}
            onChange={setFilter}
            ariaLabel={t("myRequests.filters.label")}
            testId="my-requests-filter"
            options={REQUEST_FILTERS.map((value) => ({
              value,
              label: filterLabels[value],
              count: requests ? counts[value] : null,
            }))}
          />
        </LeaveToolbar>
        <LeaveTable
          ariaLabel={t("shared.leaveRequests")}
          testId="my-requests-table"
          columns={columns}
          rows={visible}
          rowKey={(r) => r.id}
          onRowClick={(r) => setDetailId(r.id)}
          isRowSelected={(r) => r.id === detailId}
          error={loadError}
          onRetry={() => {
            setRequests(undefined)
            setLoadError(null)
            fetchRequests()
          }}
          empty={empty}
          footer={
            visible && visible.length > 0 ? (
              <>
                <span>{t("myRequests.count", { count: visible.length })}</span>
                <span className="hidden sm:inline">· {t("myRequests.rowHint")}</span>
              </>
            ) : undefined
          }
        />
      </LeavePage>

      <NewRequestDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSubmitted={fetchRequests} />

      <LeaveRequestDetailDialog
        requestId={detailId}
        scope="employee"
        onClose={() => {
          setDetailId(null)
          if (deepLinkId !== null) clearDeepLink()
        }}
        onChanged={fetchRequests}
      />
    </>
  )
}
