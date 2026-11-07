"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Loader2, SkipForward } from "lucide-react"
import { getApiErrorMessage } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  fetchLeaveRequestDetail,
  skipSubstitutes,
  type LeaveRequestDetail,
  type LeaveRequestScope,
} from "../_lib/hr-api"
import { leaveStatusKey, substituteStatusVariant } from "../_lib/hr-utils"
import { historyActionKey, historyNote } from "../_lib/substitutes-utils"
import { useLeaveFeatures } from "../_lib/useLeaveFeatures"
import { LeaveStatusBadge } from "./LeaveStatusBadge"

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

const fmtDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString() : "—"
const fmtDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : "—"

/** Leave request details: fields, approvals, substitutes and the audit trail. */
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

  const typeName =
    detail?.leave_type_details?.name_display ||
    (typeof detail?.leave_type_details?.name === "string" ? (detail.leave_type_details.name as string) : "") ||
    detail?.leave_type_details?.code ||
    ""
  const substitutes = detail?.substitutes ?? []
  const history = detail?.history ?? []
  const canSkip = isStaff && detail?.status === "awaiting_substitutes"

  const approvals = detail
    ? [
        { label: t("hr.detail.managerApproval"), name: detail.manager_approver_name, at: detail.manager_approved_at, note: detail.manager_comments },
        { label: t("hr.detail.hrApproval"), name: detail.hr_approver_name, at: detail.hr_approved_at, note: detail.hr_comments },
        { label: t("hr.detail.finalApproval"), name: detail.final_approver_name, at: detail.final_approved_at, note: detail.final_comments },
        { label: t("hr.detail.rejectedBy"), name: detail.rejected_by_name, at: detail.rejected_at, note: detail.rejection_reason },
      ].filter((a) => a.name)
    : []

  return (
    <Dialog open={requestId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("hr.detail.title")}</DialogTitle>
          <DialogDescription>
            {detail ? `${detail.employee_name}${detail.employee_email ? ` · ${detail.employee_email}` : ""}` : t("hr.common.loading")}
          </DialogDescription>
        </DialogHeader>

        {loading && !detail ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : detail ? (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Field label={t("shared.leaveType")}>
                <Badge
                  style={{ backgroundColor: detail.leave_type_details?.color || undefined }}
                  className="text-white"
                >
                  {typeName}
                </Badge>
              </Field>
              <Field label={t("shared.statusLabel")}>
                <LeaveStatusBadge status={detail.status} />
              </Field>
              <Field label={t("shared.days")}>{detail.total_days}</Field>
              <Field label={t("shared.startDate")}>{fmtDate(detail.start_date)}</Field>
              <Field label={t("shared.endDate")}>{fmtDate(detail.end_date)}</Field>
              <Field label={t("shared.submitted")}>{fmtDate(detail.created_at)}</Field>
            </div>
            {detail.reason && (
              <Field label={t("shared.reason")}>
                <p className="whitespace-pre-wrap">{detail.reason}</p>
              </Field>
            )}
            {detail.cancelled_at && (
              <Field label={t("hr.detail.cancelled")}>
                {fmtDateTime(detail.cancelled_at)}
                {detail.cancellation_reason ? ` — ${detail.cancellation_reason}` : ""}
              </Field>
            )}

            {approvals.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <h4 className="font-semibold">{t("hr.detail.approvals")}</h4>
                {approvals.map((a) => (
                  <div key={a.label} className="flex flex-col sm:flex-row sm:gap-2">
                    <span className="text-muted-foreground">{a.label}:</span>
                    <span>
                      {a.name} · {fmtDateTime(a.at)}
                      {a.note ? ` — ${a.note}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {(substitutes.length > 0 || detail.substitutes_skipped_at) && (
              <div className="space-y-2">
                <Separator />
                <h4 className="font-semibold">{t("hr.detail.substitutes")}</h4>
                <div className="space-y-2">
                  {substitutes.map((s) => (
                    <div key={s.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-medium">{s.substitute_name}</div>
                          <div className="text-muted-foreground">{s.task}</div>
                        </div>
                        <Badge variant={substituteStatusVariant(s.status)}>
                          {t(`hr.substituteStatus.${s.status}`)}
                        </Badge>
                      </div>
                      {(s.responded_at || s.comment) && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {s.responded_at ? fmtDateTime(s.responded_at) : ""}
                          {s.comment ? ` — ${s.comment}` : ""}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {detail.substitutes_skipped_at && (
                  <p className="text-muted-foreground">
                    {t("hr.detail.skippedInfo", {
                      name: detail.substitutes_skipped_by_name || "—",
                      date: fmtDateTime(detail.substitutes_skipped_at),
                    })}
                    {detail.substitutes_skip_reason ? ` — ${detail.substitutes_skip_reason}` : ""}
                  </p>
                )}
              </div>
            )}

            {history.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <h4 className="font-semibold">{t("hr.detail.historyTitle")}</h4>
                <ol className="relative ms-2 border-s ps-4 space-y-3">
                  {history.map((event) => {
                    const note = historyNote(event)
                    return (
                      <li key={event.id} className="relative">
                        <span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
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
                        <div className="text-xs text-muted-foreground">
                          {event.actor_name || t("hr.detail.system")} · {fmtDateTime(event.created_at)}
                        </div>
                        {note && <div className="text-xs mt-0.5 whitespace-pre-wrap">{note}</div>}
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}

            {canSkip && skipOpen && (
              <div className="space-y-2 rounded-md border p-3">
                <Label htmlFor="skip-reason">{t("hr.detail.skipReason")}</Label>
                <Textarea
                  id="skip-reason"
                  rows={3}
                  value={skipReason}
                  placeholder={t("hr.detail.skipReasonPlaceholder")}
                  onChange={(e) => setSkipReason(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSkipOpen(false)}>
                    {t("hr.common.cancel")}
                  </Button>
                  <Button size="sm" onClick={handleSkip} disabled={skipping}>
                    {skipping && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    {t("hr.detail.confirmSkip")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="flex-wrap gap-2">
          {detail && canSkip && !skipOpen && (
            <Button variant="outline" onClick={() => setSkipOpen(true)}>
              <SkipForward className="h-4 w-4 mr-1" />
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  )
}
