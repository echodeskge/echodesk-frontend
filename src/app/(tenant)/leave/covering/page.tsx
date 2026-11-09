"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CheckCircle2, Handshake, Loader2, MessageSquareReply, XCircle } from "lucide-react"
import { getApiErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { fetchCovering, respondCovering, type CoveringRequest, type LeaveRequestDetail } from "../_lib/hr-api"
import { useDeepLinkId } from "../_lib/useDeepLinkId"
import { useLeaveFeatures } from "../_lib/useLeaveFeatures"
import { FeatureGate } from "../_components/FeatureGate"
import { LeaveRequestDetailDialog } from "../_components/LeaveRequestDetailDialog"
import {
  LeaveEmptyState,
  LeaveHeaderBridge,
  LeavePage,
  LeaveTable,
  LeaveToolbar,
  Segmented,
  TonePill,
  leaveButton,
  substituteStatusTone,
  type LeaveColumn,
} from "../_components/ui"
import { requestColumns } from "../team-requests/_components/request-columns"

type CoveringTab = "awaiting" | "all"

export default function CoveringPage() {
  const { loaded, features, userId } = useLeaveFeatures()
  return (
    <FeatureGate loaded={loaded} allowed={Boolean(features?.substitutes)}>
      <CoveringList userId={userId} awaitingCount={features?.pending_substitute_count ?? null} />
    </FeatureGate>
  )
}

function CoveringList({ userId, awaitingCount }: { userId?: number; awaitingCount: number | null }) {
  const t = useTranslations("leave")
  const locale = useLocale()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<CoveringTab>("awaiting")
  const [rows, setRows] = useState<CoveringRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [deepLinkId, clearDeepLink] = useDeepLinkId()
  const [openId, setOpenId] = useState<number | null>(null)
  const [declineMode, setDeclineMode] = useState(false)
  const [comment, setComment] = useState("")
  const [responding, setResponding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await fetchCovering(tab, locale))
      setLoadError(null)
    } catch (error) {
      setRows([])
      setLoadError(error)
      toast.error(t("shared.loadFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setLoading(false)
    }
  }, [tab, locale, t])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (deepLinkId !== null) setOpenId(deepLinkId)
  }, [deepLinkId])

  const closeDialog = () => {
    setOpenId(null)
    setDeclineMode(false)
    setComment("")
    if (deepLinkId !== null) clearDeepLink()
  }

  const afterChange = () => {
    load()
    // The sidebar badge counts pending consents (profile.leave_features).
    queryClient.invalidateQueries({ queryKey: ["userProfile"] })
  }

  const respond = async (detail: LeaveRequestDetail, action: "accept" | "reject", reload: () => Promise<void>) => {
    if (responding) return
    const text = comment.trim()
    if (action === "reject" && !text) {
      toast.error(t("hr.covering.declineReasonRequired"))
      return
    }
    setResponding(true)
    try {
      await respondCovering(detail.id, action, text)
      toast.success(action === "accept" ? t("hr.covering.accepted") : t("hr.covering.declined"))
      setDeclineMode(false)
      setComment("")
      await reload()
    } catch (error) {
      toast.error(t("hr.covering.respondFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setResponding(false)
    }
  }

  const renderActions = (detail: LeaveRequestDetail, reload: () => Promise<void>) => {
    const mine = detail.substitutes?.find((s) => s.substitute === userId)
    if (!mine || mine.status !== "pending" || detail.status !== "awaiting_substitutes") return null
    if (declineMode) {
      return (
        <div className="flex w-full flex-col gap-2" data-testid="covering-decline">
          <Label htmlFor="decline-comment" className="text-[13px]">
            {t("hr.covering.declineReason")}
          </Label>
          <Textarea
            id="decline-comment"
            rows={3}
            value={comment}
            className="text-[13px]"
            placeholder={t("hr.covering.declinePlaceholder")}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setDeclineMode(false)}>
              {t("hr.common.cancel")}
            </Button>
            <Button variant="destructive" disabled={responding} onClick={() => respond(detail, "reject", reload)}>
              {responding && <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" />}
              {t("hr.covering.confirmDecline")}
            </Button>
          </div>
        </div>
      )
    }
    return (
      <>
        <Button
          variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setDeclineMode(true)}
        >
          <XCircle className="me-1 h-3.5 w-3.5" />
          {t("hr.covering.decline")}
        </Button>
        <Button disabled={responding} onClick={() => respond(detail, "accept", reload)}>
          {responding ? (
            <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="me-1 h-3.5 w-3.5" />
          )}
          {t("hr.covering.accept")}
        </Button>
      </>
    )
  }

  const extra: LeaveColumn<CoveringRequest>[] = [
    {
      id: "task",
      header: t("hr.substitutes.task"),
      width: "minmax(0,1.2fr)",
      mobile: "meta",
      muted: true,
      className: "max-w-full",
      cell: (r) => (
        <span className="block min-w-0 truncate" title={r.my_task || undefined}>
          {r.my_task || "—"}
        </span>
      ),
    },
    {
      id: "answer",
      header: t("hr.covering.myAnswer"),
      width: "112px",
      mobile: "meta",
      cell: (r) =>
        r.my_status ? (
          <TonePill tone={substituteStatusTone(r.my_status)} dot testId="covering-my-answer">
            {t(`hr.substituteStatus.${r.my_status}`)}
          </TonePill>
        ) : (
          "—"
        ),
    },
  ]
  // Answering happens in the detail dialog (as before); the row button only opens it.
  const columns = requestColumns<CoveringRequest>({
    t,
    locale,
    extra,
    actionsWidth: "96px",
    actions: (r) =>
      r.my_status === "pending" && r.status === "awaiting_substitutes" ? (
        <button type="button" className={leaveButton.primarySm} onClick={() => setOpenId(r.id)} data-testid="covering-answer">
          <MessageSquareReply className="h-3.5 w-3.5" aria-hidden />
          {t("hr.covering.answer")}
        </button>
      ) : null,
  })

  return (
    <>
      <LeaveHeaderBridge
        sub={awaitingCount !== null && awaitingCount > 0 ? t("hr.covering.awaitingSub", { count: awaitingCount }) : null}
      />
      <LeavePage fill testId="covering-page">
        <LeaveToolbar>
          <Segmented<CoveringTab>
            ariaLabel={t("hr.covering.title")}
            value={tab}
            onChange={setTab}
            testId="covering-tabs"
            options={[
              { value: "awaiting", label: t("hr.covering.tabAwaiting"), count: awaitingCount || null },
              { value: "all", label: t("hr.covering.tabAll") },
            ]}
          />
          <span className="ms-auto hidden text-xs text-muted-foreground md:inline">{t("hr.covering.cardDescription")}</span>
        </LeaveToolbar>
        <LeaveTable
          ariaLabel={t("hr.covering.title")}
          columns={columns}
          rows={rows}
          loading={loading}
          rowKey={(r) => r.id}
          onRowClick={(r) => setOpenId(r.id)}
          isRowSelected={(r) => r.id === openId}
          error={loadError}
          onRetry={load}
          empty={
            <LeaveEmptyState
              icon={Handshake}
              title={tab === "awaiting" ? t("hr.covering.emptyAwaiting") : t("hr.covering.emptyAll")}
              description={t("hr.covering.description")}
            />
          }
          footer={!loading && !loadError ? <span>{t("requests.count", { count: rows.length })}</span> : undefined}
          testId="covering-table"
        />
      </LeavePage>

      <LeaveRequestDetailDialog
        requestId={openId}
        scope="covering"
        onClose={closeDialog}
        onChanged={afterChange}
        renderActions={renderActions}
      />
    </>
  )
}
