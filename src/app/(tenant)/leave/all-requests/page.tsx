"use client"

import { useState, useEffect, useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Calendar, Lock, SearchX } from "lucide-react"
import axios from "@/api/axios"
import { getApiErrorMessage } from "@/lib/utils"
import { LEAVE_STATUSES } from "../_lib/hr-utils"
import { isForbidden, matchesRequestSearch } from "../_lib/lv02-utils"
import { useDeepLinkId } from "../_lib/useDeepLinkId"
import { LeaveRequestDetailDialog } from "../_components/LeaveRequestDetailDialog"
import {
  LeaveEmptyState,
  LeaveHeaderBridge,
  LeavePage,
  LeaveTable,
  LeaveToolbar,
  Segmented,
  ToolbarSearch,
  leaveButton,
} from "../_components/ui"
import { requestColumns } from "../_components/request-columns"

// Shape of LeaveRequestListSerializer: flat ids/names, no nested objects and
// no `reason` / employee e-mail (those are only on the detail endpoint).
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

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const results = (data as { results?: unknown } | null | undefined)?.results
  return Array.isArray(results) ? (results as T[]) : []
}

export default function AllRequestsPage() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  // Bumped after the detail dialog changes a request (or on retry), to reload the list.
  const [reloadKey, setReloadKey] = useState(0)
  const [deepLinkId, clearDeepLink] = useDeepLinkId()
  const [detailId, setDetailId] = useState<number | null>(null)

  useEffect(() => {
    if (deepLinkId !== null) setDetailId(deepLinkId)
  }, [deepLinkId])

  useEffect(() => {
    let ignore = false

    const fetchRequests = async () => {
      setLoading(true)
      try {
        // Direct call: the generated list function has no `status` / `lang`
        // params (its positional args are ordering, page, pageSize, search).
        const response = await axios.get("/api/leave/admin/leave-requests/", {
          params: {
            status: statusFilter !== "all" ? statusFilter : undefined,
            lang: locale,
            page_size: 100,
          },
        })
        if (!ignore) {
          setRequests(unwrapList<LeaveRequest>(response.data))
          setLoadError(null)
        }
      } catch (error) {
        if (ignore) return
        console.error("Failed to fetch requests:", error)
        setRequests([])
        setLoadError(error)
        toast.error(t("shared.loadFailed"), {
          description: getApiErrorMessage(error) || undefined,
        })
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    fetchRequests()
    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, locale, reloadKey])

  const shown = useMemo(() => requests.filter((r) => matchesRequestSearch(r, search)), [requests, search])
  const columns = requestColumns<LeaveRequest>({ t, locale, submitted: true })

  // Non-admins get 403: say so instead of "check your connection".
  const forbidden = isForbidden(loadError)
  const empty = forbidden ? (
    <LeaveEmptyState icon={Lock} title={t("requests.noAccessTitle")} description={t("requests.noAccessHint")} />
  ) : search.trim() && requests.length > 0 ? (
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
      icon={Calendar}
      title={t("shared.noLeaveRequests")}
      description={t("allRequests.noMatchDescription")}
      action={
        statusFilter !== "all" ? (
          <button type="button" className={leaveButton.outlineSm} onClick={() => setStatusFilter("all")}>
            {t("ui.clearFilters")}
          </button>
        ) : undefined
      }
    />
  )

  return (
    <>
      <LeaveHeaderBridge sub={loading || loadError ? null : t("requests.count", { count: requests.length })} />
      <LeavePage fill testId="all-requests-page">
        <LeaveToolbar>
          <Segmented<string>
            ariaLabel={t("allRequests.filterByStatus")}
            value={statusFilter}
            onChange={setStatusFilter}
            testId="all-requests-filter"
            className="max-w-full"
            options={[
              { value: "all", label: t("allRequests.filterAllShort") },
              ...LEAVE_STATUSES.map((status) => ({ value: status, label: t(`shared.status.${status}`) })),
            ]}
          />
          <ToolbarSearch
            value={search}
            onChange={setSearch}
            placeholder={t("requests.searchPlaceholder")}
            clearLabel={t("ui.clearSearch")}
            className="ms-auto max-w-none sm:max-w-[260px]"
            testId="all-requests-search"
          />
        </LeaveToolbar>
        <LeaveTable
          ariaLabel={t("allRequests.title")}
          columns={columns}
          rows={shown}
          loading={loading}
          rowKey={(r) => r.id}
          onRowClick={(r) => setDetailId(r.id)}
          isRowSelected={(r) => r.id === detailId}
          error={forbidden ? null : loadError}
          onRetry={() => setReloadKey((k) => k + 1)}
          empty={empty}
          footer={!loading && !loadError ? <span>{t("requests.count", { count: shown.length })}</span> : undefined}
          testId="all-requests-table"
        />
      </LeavePage>

      <LeaveRequestDetailDialog
        requestId={detailId}
        scope="admin"
        onClose={() => {
          setDetailId(null)
          if (deepLinkId !== null) clearDeepLink()
        }}
        onChanged={() => setReloadKey((k) => k + 1)}
      />
    </>
  )
}
