"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Loader2, SkipForward } from "lucide-react"
import { getApiErrorMessage } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/app/(tenant)/tickets/_lib/format"
import {
  fetchLeaveRequestDetail,
  skipSubstitutes,
  type LeaveRequestDetail,
  type LeaveRequestScope,
} from "../_lib/hr-api"
import { leaveStatusKey } from "../_lib/hr-utils"
import { approvalSteps, detailTypeName, type ApprovalStep } from "../_lib/lv02-utils"
import { historyActionKey, historyNote } from "../_lib/substitutes-utils"
import { useLeaveFeatures } from "../_lib/useLeaveFeatures"
import {
  LeaveAvatar,
  LeaveLoading,
  LeaveTypeChip,
  RequestStatusPill,
  TonePill,
  formatDays,
  formatLeaveDate,
  formatLeaveRange,
  parseDays,
  substituteStatusTone,
} from "./ui"

interface Props {
  /** Request to show; null closes the dialog. */
  requestId: number | null
  /** Which detail endpoint may read the request for this user. */
  scope: LeaveRequestScope
  onClose: () => void
  /** Called after an action in the dialog changed the request. */
  onChanged?: () => void
  /** Extra footer actions (e.g. accept/decline) given the loaded request. */
  renderActions?: (detail: LeaveRequestDetail, reload: () => Promise<void>) => ReactNode
}

const STEP_LABEL: Record<ApprovalStep["key"], string> = {
  manager: "hr.detail.managerApproval",
  hr: "hr.detail.hrApproval",
  final: "hr.detail.finalApproval",
  rejected: "hr.detail.rejectedBy",
}

/**
 * Leave request details (LV-02 redesign): a 560px dialog (a bottom sheet
 * below `sm`) with the type and status in the header, definition rows,
 * the approval timeline, substitutes with their answers, the audit trail and
 * the caller's `renderActions` in the footer.
 */
export function LeaveRequestDetailDialog({ requestId, scope, onClose, onChanged, renderActions }: Props) {
  const t = useTranslations("leave")
  const locale = useLocale()
  const { isStaff } = useLeaveFeatures()
  const [detail, setDetail] = useState<LeaveRequestDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [skipOpen, setSkipOpen] = useState(false)
  const [skipReason, setSkipReason] = useState("")
  const [skipping, setSkipping] = useState(false)

  const load = useCallback(async () => {
    if (requestId === null) return
    setLoading(true)
    try {
      setDetail(await fetchLeaveRequestDetail(scope, requestId, locale))
    } catch (error) {
      toast.error(t("hr.detail.loadFailed"), { description: getApiErrorMessage(error) || undefined })
      onClose()
    } finally {
      setLoading(false)
    }
  }, [requestId, scope, locale, t, onClose])

  useEffect(() => {
    setDetail(null)
    setSkipOpen(false)
    setSkipReason("")
    if (requestId !== null) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, scope])

  const reload = async () => {
    await load()
    onChanged?.()
  }

  const handleSkip = async () => {
    if (!detail || skipping) return
    const reason = skipReason.trim()
    if (!reason) {
      toast.error(t("hr.detail.skipReasonRequired"))
      return
    }
    setSkipping(true)
    try {
      setDetail(await skipSubstitutes(detail.id, reason))
      toast.success(t("hr.detail.skipped"))
      setSkipOpen(false)
      setSkipReason("")
      onChanged?.()
    } catch (error) {
      toast.error(t("hr.detail.skipFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setSkipping(false)
    }
  }

  const fmtDateTime = (value: string | null | undefined) => (value ? formatDateTime(value, locale) || "—" : "—")
  const days = (value: string | null | undefined) => {
    const n = parseDays(value)
    return n === null ? "—" : t("ui.days", { count: Number(formatDays(n)) })
  }

  const substitutes = detail?.substitutes ?? []
  const history = detail?.history ?? []
  const steps = detail ? approvalSteps(detail) : []
  const canSkip = isStaff && detail?.status === "awaiting_substitutes"

  return (
    <Dialog open={requestId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="leave-request-detail"
        className={cn(
          "flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 text-[13px] sm:max-w-[560px]",
          // Bottom sheet on phones.
          "max-sm:bottom-0 max-sm:top-auto max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0"
        )}
      >
        <DialogHeader className="shrink-0 gap-2 space-y-0 border-b px-5 pb-4 pe-12 pt-5 text-start">
          <DialogTitle className="text-[15px] font-semibold leading-5">{t("hr.detail.title")}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex min-w-0 flex-col gap-2.5 text-[13px] text-foreground">
              {detail ? (
                <>
                  <span className="flex min-w-0 items-center gap-2">
                    <LeaveAvatar name={detail.employee_name} size={28} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{detail.employee_name}</span>
                      {detail.employee_email && (
                        <span className="truncate text-xs text-muted-foreground">{detail.employee_email}</span>
                      )}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <LeaveTypeChip
                      variant="chip"
                      name={detailTypeName(detail)}
                      color={detail.leave_type_details?.color}
                    />
                    <RequestStatusPill status={detail.status} />
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">{t("hr.common.loading")}</span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading && !detail ? (
            <LeaveLoading className="py-10" />
          ) : detail ? (
            <div className="flex flex-col gap-5">
              <dl className="grid grid-cols-[minmax(96px,auto)_minmax(0,1fr)] gap-x-4 gap-y-2.5" data-testid="detail-fields">
                <DefRow label={t("hr.detail.period")}>
                  <span className="tabular-nums">
                    {formatLeaveRange(detail.start_date, detail.end_date, locale, { year: "always" })}
                  </span>
                </DefRow>
                <DefRow label={t("shared.days")}>
                  <span className="tabular-nums">{days(detail.total_days)}</span>
                </DefRow>
                <DefRow label={t("shared.submitted")}>
                  <span className="tabular-nums">{formatLeaveDate(detail.created_at, locale, { year: "always" })}</span>
                </DefRow>
                {detail.reason && (
                  <DefRow label={t("shared.reason")}>
                    <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{detail.reason}</p>
                  </DefRow>
                )}
                {detail.cancelled_at && (
                  <DefRow label={t("hr.detail.cancelled")}>
                    <span>
                      <span className="tabular-nums">{fmtDateTime(detail.cancelled_at)}</span>
                      {detail.cancellation_reason ? (
                        <span className="text-muted-foreground"> — {detail.cancellation_reason}</span>
                      ) : null}
                    </span>
                  </DefRow>
                )}
              </dl>

              {steps.length > 0 && (
                <DetailSection title={t("hr.detail.approvals")} testId="detail-approvals">
                  <ol className="flex flex-col gap-3">
                    {steps.map((s) => (
                      <li key={s.key} className="flex min-w-0 gap-2.5">
                        <LeaveAvatar name={s.name} className={s.key === "rejected" ? "bg-destructive/10 text-destructive" : undefined} />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                            <span className="truncate font-medium">{s.name}</span>
                            <span className="text-xs text-muted-foreground">{t(STEP_LABEL[s.key])}</span>
                            <span className="ms-auto text-xs tabular-nums text-muted-foreground">{fmtDateTime(s.at)}</span>
                          </div>
                          {s.note && (
                            <p className="whitespace-pre-wrap text-xs text-muted-foreground [overflow-wrap:anywhere]">{s.note}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </DetailSection>
              )}

              {(substitutes.length > 0 || detail.substitutes_skipped_at) && (
                <DetailSection title={t("hr.detail.substitutes")} testId="detail-substitutes">
                  {substitutes.length > 0 && (
                    <ul className="overflow-hidden rounded-lg border">
                      {substitutes.map((s) => (
                        <li key={s.id} className="flex min-w-0 flex-col gap-1 border-b px-3 py-2 last:border-b-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <LeaveAvatar name={s.substitute_name} />
                            <span className="min-w-0 flex-1 truncate font-medium">{s.substitute_name}</span>
                            <TonePill tone={substituteStatusTone(s.status)} dot>
                              {t(`hr.substituteStatus.${s.status}`)}
                            </TonePill>
                          </div>
                          {s.task && <p className="ps-[30px] text-xs [overflow-wrap:anywhere]">{s.task}</p>}
                          {(s.responded_at || s.comment) && (
                            <p className="ps-[30px] text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                              {s.responded_at ? <span className="tabular-nums">{fmtDateTime(s.responded_at)}</span> : null}
                              {s.comment ? ` — ${s.comment}` : ""}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {detail.substitutes_skipped_at && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("hr.detail.skippedInfo", {
                        name: detail.substitutes_skipped_by_name || "—",
                        date: fmtDateTime(detail.substitutes_skipped_at),
                      })}
                      {detail.substitutes_skip_reason ? ` — ${detail.substitutes_skip_reason}` : ""}
                    </p>
                  )}
                </DetailSection>
              )}

              {history.length > 0 && (
                <DetailSection title={t("hr.detail.historyTitle")} testId="detail-history">
                  <ol className="relative ms-[5px] flex flex-col gap-3 border-s ps-4">
                    {history.map((event) => {
                      const note = historyNote(event)
                      return (
                        <li key={event.id} className="relative">
                          <span
                            aria-hidden
                            className="absolute -start-[21px] top-[5px] h-[9px] w-[9px] rounded-full border-2 border-background bg-primary"
                          />
                          <div className="font-medium">
                            {t(historyActionKey(event))}
                            {event.kind === "request" && event.to_status && (
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                {event.from_status && event.from_status !== "new"
                                  ? `${t(leaveStatusKey(event.from_status))} → `
                                  : ""}
                                {t(leaveStatusKey(event.to_status))}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {event.actor_name || t("hr.detail.system")} ·{" "}
                            <span className="tabular-nums">{fmtDateTime(event.created_at)}</span>
                          </div>
                          {note && <div className="mt-0.5 whitespace-pre-wrap text-xs [overflow-wrap:anywhere]">{note}</div>}
                        </li>
                      )
                    })}
                  </ol>
                </DetailSection>
              )}

              {canSkip && skipOpen && (
                <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3" data-testid="detail-skip-panel">
                  <Label htmlFor="skip-reason" className="text-[13px]">
                    {t("hr.detail.skipReason")}
                  </Label>
                  <Textarea
                    id="skip-reason"
                    rows={3}
                    value={skipReason}
                    className="text-[13px]"
                    placeholder={t("hr.detail.skipReasonPlaceholder")}
                    onChange={(e) => setSkipReason(e.target.value)}
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[13px]" onClick={() => setSkipOpen(false)}>
                      {t("hr.common.cancel")}
                    </Button>
                    <Button size="sm" className="h-8 text-[13px]" onClick={handleSkip} disabled={skipping}>
                      {skipping && <Loader2 className="me-1 h-4 w-4 animate-spin" />}
                      {t("hr.detail.confirmSkip")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter
          className="shrink-0 flex-row flex-wrap items-center justify-end gap-2 border-t px-5 py-3 [&_button]:h-8 [&_button]:text-[13px]"
          data-testid="detail-footer"
        >
          {detail && canSkip && !skipOpen && (
            <Button variant="outline" className="me-auto" onClick={() => setSkipOpen(true)}>
              <SkipForward className="me-1 h-3.5 w-3.5" />
              {t("hr.detail.skipPending")}
            </Button>
          )}
          {detail && renderActions?.(detail, reload)}
          <Button variant="outline" onClick={onClose}>
            {t("hr.common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DefRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="pt-px text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  )
}

function DetailSection({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <section className="flex flex-col gap-2.5 border-t pt-4" data-testid={testId}>
      <h4 className="text-[11px] font-medium uppercase tracking-[.03em] text-muted-foreground">{title}</h4>
      {children}
    </section>
  )
}
