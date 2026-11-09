"use client"

import { useState, useEffect, useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import axios from "@/api/axios"
import {
  leaveManagerTeamRequestsApproveCreate,
  leaveManagerTeamRequestsRejectCreate,
  leaveManagerTeamRequestsRetrieve,
} from "@/api/generated/api"
import { getApiErrorMessage } from "@/lib/utils"
import { useMyAccess } from "@/hooks/useMyAccess"
import { Button } from "@/components/ui/button"
import { Check, CheckCircle2, Inbox, Lock, SearchX, Users, X, XCircle } from "lucide-react"
import { useDeepLinkId } from "../_lib/useDeepLinkId"
import { canDecideRequest, filterTeamRequests, isForbidden, teamRequestStats, type TeamFilter } from "../_lib/lv02-utils"
import { LeaveRequestDetailDialog } from "../_components/LeaveRequestDetailDialog"
import {
  LeaveEmptyState,
  LeaveHeaderBridge,
  LeavePage,
  LeaveTable,
  LeaveToolbar,
  Segmented,
  StatStrip,
  ToolbarSearch,
  leaveButton,
} from "../_components/ui"
import { DecisionDialog } from "./_components/decision-dialog"
import { requestColumns } from "../_components/request-columns"

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
  // Nobody but a superuser may approve or reject their own leave request.
  const { userId, isSuperuser } = useMyAccess()
  const canDecide = (request: LeaveRequest) => canDecideRequest(request, userId, isSuperuser)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [filter, setFilter] = useState<TeamFilter>("pending")
  const [search, setSearch] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [comments, setComments] = useState("")
  const [totalCount, setTotalCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [selectedExtra, setSelectedExtra] = useState<LeaveRequestExtra | null>(null)
  const [deepLinkId, clearDeepLink] = useDeepLinkId()
  const [detailId, setDetailId] = useState<number | null>(null)

  useEffect(() => {
    if (deepLinkId !== null) setDetailId(deepLinkId)
  }, [deepLinkId])

  useEffect(() => {
    fetchRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setLoadError(null)
    } catch (error) {
      // Non-managers get 403 here: show the error state and say why.
      console.error("Failed to fetch requests:", error)
      setRequests([])
      setTotalCount(0)
      setLoadError(error)
      toast.error(t("shared.loadFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  const retry = () => {
    setLoading(true)
    fetchRequests()
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

  const stats = teamRequestStats(requests, totalCount)
  const shown = useMemo(() => filterTeamRequests(requests, filter, search), [requests, filter, search])

  const columns = requestColumns<LeaveRequest>({
    t,
    locale,
    actions: (request) =>
      canDecide(request) ? (
        <span className="flex gap-1.5">
          <button
            type="button"
            className={leaveButton.dangerSm}
            onClick={() => openActionDialog(request, "reject")}
            data-testid="team-reject"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            {t("teamRequests.reject")}
          </button>
          <button
            type="button"
            className={leaveButton.primarySm}
            onClick={() => openActionDialog(request, "approve")}
            data-testid="team-approve"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            {t("teamRequests.approve")}
          </button>
        </span>
      ) : null,
  })

  // Non-managers get 403: say so instead of "check your connection".
  const forbidden = isForbidden(loadError)
  const failed = !!loadError
  const empty = forbidden ? (
    <LeaveEmptyState icon={Lock} title={t("requests.noAccessTitle")} description={t("requests.noAccessHint")} />
  ) : requests.length === 0 ? (
    <LeaveEmptyState
      icon={Users}
      title={t("teamRequests.noRequestsTitle")}
      description={t("teamRequests.noRequestsDescription")}
    />
  ) : search.trim() ? (
    <LeaveEmptyState
      icon={SearchX}
      title={t("ui.noMatches")}
      description={t("ui.noMatchesHint")}
      action={
        <button type="button" className={leaveButton.outlineSm} onClick={() => setSearch("")}>
          {t("ui.clearFilters")}
        </button>
      }
    />
  ) : (
    <LeaveEmptyState
      icon={Inbox}
      title={t("teamRequests.emptyPendingTitle")}
      description={t("teamRequests.emptyPendingHint")}
      action={
        <button type="button" className={leaveButton.outlineSm} onClick={() => setFilter("all")}>
          {t("teamRequests.showAll")}
        </button>
      }
    />
  )

  return (
    <>
      <LeaveHeaderBridge sub={loading || loadError ? null : t("teamRequests.pendingSub", { count: stats.pending })} />
      <LeavePage fill testId="team-requests-page">
        <StatStrip
          loading={loading}
          testId="team-requests-stats"
          items={[
            { key: "pending", label: t("teamRequests.pendingApproval"), value: loadError ? null : stats.pending, hint: t("teamRequests.requireYourAction") },
            { key: "total", label: t("teamRequests.totalRequests"), value: loadError ? null : stats.total, hint: t("teamRequests.fromYourTeam") },
            { key: "approved", label: t("shared.status.approved"), value: loadError ? null : stats.approved, hint: t("teamRequests.thisPeriod") },
          ]}
        />
        <LeaveToolbar>
          <Segmented<TeamFilter>
            ariaLabel={t("allRequests.filterByStatus")}
            value={filter}
            onChange={setFilter}
            testId="team-requests-filter"
            options={[
              { value: "pending", label: t("shared.status.pending"), count: loading || failed ? null : stats.pending },
              { value: "all", label: t("allRequests.filterAllShort"), count: loading || failed ? null : requests.length },
            ]}
          />
          <ToolbarSearch
            value={search}
            onChange={setSearch}
            placeholder={t("requests.searchPlaceholder")}
            clearLabel={t("ui.clearSearch")}
            className="ms-auto max-w-none sm:max-w-[260px]"
            testId="team-requests-search"
          />
        </LeaveToolbar>
        <LeaveTable
          ariaLabel={t("teamRequests.title")}
          columns={columns}
          rows={loading ? undefined : shown}
          rowKey={(r) => r.id}
          onRowClick={(r) => setDetailId(r.id)}
          isRowSelected={(r) => r.id === detailId}
          error={forbidden ? null : loadError}
          onRetry={retry}
          empty={empty}
          footer={!loading && !failed ? <span>{t("requests.count", { count: shown.length })}</span> : undefined}
          testId="team-requests-table"
        />
      </LeavePage>

      <LeaveRequestDetailDialog
        requestId={detailId}
        scope="manager"
        onClose={() => {
          setDetailId(null)
          if (deepLinkId !== null) clearDeepLink()
        }}
        onChanged={fetchRequests}
        renderActions={(detail) => {
          const row = requests.find((r) => r.id === detail.id)
          if (!row || !canDecide(row)) return null
          const open = (action: "approve" | "reject") => {
            setDetailId(null)
            if (deepLinkId !== null) clearDeepLink()
            openActionDialog(row, action)
          }
          return (
            <>
              <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => open("reject")}>
                <XCircle className="me-1 h-3.5 w-3.5" />
                {t("teamRequests.reject")}
              </Button>
              <Button onClick={() => open("approve")}>
                <CheckCircle2 className="me-1 h-3.5 w-3.5" />
                {t("teamRequests.approve")}
              </Button>
            </>
          )
        }}
      />

      <DecisionDialog
        request={selectedRequest}
        action={actionType}
        extra={selectedExtra}
        comments={comments}
        onCommentsChange={setComments}
        submitting={submitting}
        onConfirm={handleAction}
        onClose={closeDialog}
      />
    </>
  )
}
