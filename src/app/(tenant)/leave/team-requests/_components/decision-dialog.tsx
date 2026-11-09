"use client"

import type { ReactNode } from "react"
import { useLocale, useTranslations } from "next-intl"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { LeaveAvatar, LeaveTypeChip, formatDays, formatLeaveRange, parseDays } from "../../_components/ui"

export interface DecisionRequest {
  employee_name: string
  leave_type_name: string
  leave_type_color?: string
  start_date: string
  end_date: string
  total_days: string
}

export interface DecisionExtra {
  reason?: string
  employee_email?: string
}

/**
 * Approve / reject confirmation (LV-02 redesign): the request as a
 * three-row summary, the employee's reason quoted, the comments field and
 * Cancel + Confirm. The page owns the state and the API calls.
 */
export function DecisionDialog({
  request,
  action,
  extra,
  comments,
  onCommentsChange,
  submitting,
  onConfirm,
  onClose,
}: {
  request: DecisionRequest | null
  action: "approve" | "reject" | null
  extra: DecisionExtra | null
  comments: string
  onCommentsChange: (value: string) => void
  submitting: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const t = useTranslations("leave")
  const locale = useLocale()
  const approve = action === "approve"
  const n = request ? parseDays(request.total_days) : null

  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 p-0 text-[13px] sm:max-w-[480px]" data-testid="leave-decision-dialog">
        <DialogHeader className="space-y-1 border-b px-5 pb-4 pe-12 pt-5 text-start">
          <DialogTitle className="text-[15px] font-semibold leading-5">
            {approve ? t("teamRequests.approveDialogTitle") : t("teamRequests.rejectDialogTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs">{t("teamRequests.description")}</DialogDescription>
        </DialogHeader>

        {request && (
          <div className="flex flex-col gap-4 px-5 py-4">
            <dl className="grid grid-cols-[minmax(88px,auto)_minmax(0,1fr)] items-center gap-x-4 gap-y-2.5 rounded-lg border bg-muted/30 px-3 py-3">
              <SummaryRow label={t("shared.employee")}>
                <span className="flex min-w-0 items-center gap-2">
                  <LeaveAvatar name={request.employee_name} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{request.employee_name}</span>
                    {extra?.employee_email && (
                      <span className="truncate text-[11px] text-muted-foreground">{extra.employee_email}</span>
                    )}
                  </span>
                </span>
              </SummaryRow>
              <SummaryRow label={t("shared.leaveType")}>
                <LeaveTypeChip name={request.leave_type_name} color={request.leave_type_color} />
              </SummaryRow>
              <SummaryRow label={t("teamRequests.duration")}>
                <span className="tabular-nums">
                  {formatLeaveRange(request.start_date, request.end_date, locale, { year: "always" })}
                  {n !== null && (
                    <span className="text-muted-foreground"> · {t("ui.days", { count: Number(formatDays(n)) })}</span>
                  )}
                </span>
              </SummaryRow>
            </dl>

            {extra?.reason && (
              <figure className="flex flex-col gap-1">
                <figcaption className="text-xs text-muted-foreground">{t("shared.reason")}</figcaption>
                <blockquote className="whitespace-pre-wrap border-s-2 ps-3 text-[13px] [overflow-wrap:anywhere]" data-testid="decision-reason">
                  {extra.reason}
                </blockquote>
              </figure>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="comments" className="text-[13px]">
                {approve ? t("teamRequests.commentsOptional") : t("teamRequests.commentsRequired")}
              </Label>
              <Textarea
                id="comments"
                placeholder={t("teamRequests.commentsPlaceholder")}
                value={comments}
                onChange={(e) => onCommentsChange(e.target.value)}
                rows={4}
                className="text-[13px]"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-row flex-wrap justify-end gap-2 border-t px-5 py-3">
          <Button variant="outline" className="h-8 text-[13px]" onClick={onClose}>
            {t("shared.cancel")}
          </Button>
          <Button
            variant={approve ? "default" : "destructive"}
            className="h-8 text-[13px]"
            onClick={onConfirm}
            disabled={submitting}
            data-testid="decision-confirm"
          >
            {submitting ? (
              <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" />
            ) : approve ? (
              <CheckCircle2 className="me-1 h-3.5 w-3.5" />
            ) : (
              <XCircle className="me-1 h-3.5 w-3.5" />
            )}
            {approve ? t("teamRequests.confirmApproval") : t("teamRequests.confirmRejection")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SummaryRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0", className)}>{children}</dd>
    </>
  )
}
