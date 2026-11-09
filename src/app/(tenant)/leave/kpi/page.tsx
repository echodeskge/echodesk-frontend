"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Send,
  Target,
  Trash2,
  Undo2,
} from "lucide-react"
import { cn, getApiErrorMessage } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/app/(tenant)/tickets/_lib/format"
import {
  approveKpi,
  copyPreviousKpis,
  createKpi,
  deleteKpi,
  fetchKpi,
  fetchKpis,
  returnKpi,
  submitKpi,
  updateKpi,
  type KpiDirection,
  type KpiGoal,
  type KpiScope,
} from "../_lib/hr-api"
import { currentPeriod, formatPercent, formatPeriod } from "../_lib/hr-utils"
import { deepLinkId, formatKpiValue, isValidKpiNumber, summarizeKpis } from "../_lib/kpi-utils"
import { useLeaveFeatures } from "../_lib/useLeaveFeatures"
import { FeatureGate } from "../_components/FeatureGate"
import { MonthPicker } from "../_components/MonthPicker"
import { UserPicker, useLiteUsers } from "../_components/UserPicker"
import {
  LeaveEmptyState,
  LeaveHeaderBridge,
  LeavePage,
  LeaveTable,
  LeaveToolbar,
  PersonCell,
  Segmented,
  StatGrid,
  TonePill,
  kpiStatusTone,
  leaveButton,
  type LeaveColumn,
} from "../_components/ui"
import { kpiActionsWidth, kpiMetShare } from "../_lib/lv03-utils"
import { KpiProgress } from "./_components/kpi-progress"

const HISTORY_ACTIONS = ["created", "target_changed", "submitted", "approved", "returned", "deleted"]

/** Dialog form styles (LV-03): 13px labels, 34px inputs. */
const LABEL = "text-[13px] font-medium"
const INPUT = "h-[34px] text-[13px]"

interface TargetForm {
  employee: number | null
  title: string
  target: string
  unit: string
  direction: KpiDirection
}

const EMPTY_TARGET: TargetForm = { employee: null, title: "", target: "", unit: "", direction: "higher" }

function Field({ label, htmlFor, children }: { label: React.ReactNode; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className={LABEL}>
        {label}
      </label>
      {children}
    </div>
  )
}

/** Quoted note block (employee note / manager feedback). */
function NoteBlock({ label, children, bordered }: { label: string; children: React.ReactNode; bordered?: boolean }) {
  return (
    <div className={cn("rounded-md px-3 py-2.5 text-[13px]", bordered ? "border" : "bg-muted")}>
      <div className="mb-1 text-[11px] text-muted-foreground">{label}</div>
      <p className="whitespace-pre-wrap break-words">{children}</p>
    </div>
  )
}

export default function KpiPage() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const { loaded, features, isStaff, isLeaveManager, userId } = useLeaveFeatures()

  const [scope, setScope] = useState<KpiScope>("mine")
  const [period, setPeriod] = useState(currentPeriod())
  const [goals, setGoals] = useState<KpiGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  // Dialog state
  const [targetOpen, setTargetOpen] = useState(false)
  const [editing, setEditing] = useState<KpiGoal | null>(null)
  const [targetForm, setTargetForm] = useState<TargetForm>(EMPTY_TARGET)
  const [submitGoal, setSubmitGoal] = useState<KpiGoal | null>(null)
  const [submitForm, setSubmitForm] = useState({ actual: "", note: "" })
  const [reviewGoal, setReviewGoal] = useState<KpiGoal | null>(null)
  const [reviewDecision, setReviewDecision] = useState<"approve" | "return">("approve")
  const [feedback, setFeedback] = useState("")
  const [detail, setDetail] = useState<KpiGoal | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const enabled = Boolean(features?.kpi)
  // Managers pick from their direct reports; staff from everyone.
  const userParams = useMemo(
    () => (isStaff ? {} : { manager: userId }),
    [isStaff, userId]
  )
  const { users } = useLiteUsers(userParams, enabled && isLeaveManager && !!userId)
  const employeeOptions = useMemo(() => users.filter((u) => u.id !== userId), [users, userId])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setGoals(await fetchKpis({ scope, period }))
    } catch (error) {
      setGoals([])
      setLoadError(error)
      toast.error(t("shared.loadFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setLoading(false)
    }
  }, [scope, period, t])

  useEffect(() => {
    if (enabled) load()
  }, [enabled, load])

  const openDetail = useCallback(
    async (id: number) => {
      setDetailLoading(true)
      try {
        setDetail(await fetchKpi(id))
      } catch (error) {
        toast.error(t("shared.loadFailed"), { description: getApiErrorMessage(error) || undefined })
      } finally {
        setDetailLoading(false)
      }
    },
    [t]
  )

  // Notification deep link: /leave/kpi?id=<kpiId>
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    const id = deepLinkId(window.location.search)
    if (id) openDetail(id)
  }, [enabled, openDetail])

  /** Replace a goal in the list (and the open detail) after an action. */
  const applyGoal = (goal: KpiGoal) => {
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...goal, history: g.history } : g)))
    setDetail((prev) => (prev && prev.id === goal.id ? goal : prev))
  }

  const run = async (fn: () => Promise<void>, success: string | (() => string)) => {
    if (busy) return false
    setBusy(true)
    try {
      await fn()
      toast.success(typeof success === "function" ? success() : success)
      return true
    } catch (error) {
      toast.error(t("hr.kpi.actionFailed"), { description: getApiErrorMessage(error) || undefined })
      return false
    } finally {
      setBusy(false)
    }
  }

  // ---- target create / edit ----
  const openCreate = () => {
    setEditing(null)
    setTargetForm(EMPTY_TARGET)
    setTargetOpen(true)
  }
  const openEdit = (goal: KpiGoal) => {
    setEditing(goal)
    setTargetForm({
      employee: goal.employee,
      title: goal.title,
      target: String(Number(goal.target)),
      unit: goal.unit,
      direction: goal.direction,
    })
    setTargetOpen(true)
  }
  const saveTarget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing && !targetForm.employee) {
      toast.error(t("hr.kpi.employeeRequired"))
      return
    }
    if (!targetForm.title.trim() || !targetForm.unit.trim()) {
      toast.error(t("hr.kpi.titleUnitRequired"))
      return
    }
    if (!isValidKpiNumber(targetForm.target)) {
      toast.error(t("hr.kpi.invalidNumber"))
      return
    }
    const body = {
      title: targetForm.title.trim(),
      target: targetForm.target.trim(),
      unit: targetForm.unit.trim(),
      direction: targetForm.direction,
    }
    const ok = await run(async () => {
      if (editing) {
        applyGoal(await updateKpi(editing.id, body))
      } else {
        await createKpi({ ...body, employee: targetForm.employee as number, period })
        await load()
      }
    }, editing ? t("hr.kpi.targetUpdated") : t("hr.kpi.targetCreated"))
    if (ok) setTargetOpen(false)
  }

  // ---- submit result ----
  const openSubmit = (goal: KpiGoal) => {
    setSubmitGoal(goal)
    setSubmitForm({ actual: goal.actual ? String(Number(goal.actual)) : "", note: goal.employee_note || "" })
  }
  const saveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!submitGoal) return
    if (!isValidKpiNumber(submitForm.actual)) {
      toast.error(t("hr.kpi.invalidNumber"))
      return
    }
    const ok = await run(async () => {
      applyGoal(await submitKpi(submitGoal.id, submitForm.actual.trim(), submitForm.note))
    }, t("hr.kpi.submitted"))
    if (ok) setSubmitGoal(null)
  }

  // ---- review ----
  const openReview = (goal: KpiGoal, decision: "approve" | "return") => {
    setReviewGoal(goal)
    setReviewDecision(decision)
    setFeedback("")
  }
  const saveReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewGoal) return
    if (reviewDecision === "return" && !feedback.trim()) {
      toast.error(t("hr.kpi.feedbackRequired"))
      return
    }
    const ok = await run(async () => {
      applyGoal(
        reviewDecision === "approve"
          ? await approveKpi(reviewGoal.id, feedback.trim())
          : await returnKpi(reviewGoal.id, feedback.trim())
      )
    }, reviewDecision === "approve" ? t("hr.kpi.approved") : t("hr.kpi.returned"))
    if (ok) setReviewGoal(null)
  }

  // ---- delete / copy ----
  const canDelete = (goal: KpiGoal) =>
    goal.status === "draft" && (isStaff || goal.created_by === userId)

  const handleDelete = async (goal: KpiGoal) => {
    if (!confirm(t("hr.kpi.confirmDelete", { title: goal.title }))) return
    const ok = await run(async () => {
      await deleteKpi(goal.id)
      setGoals((prev) => prev.filter((g) => g.id !== goal.id))
    }, t("hr.kpi.deleted"))
    if (ok && detail?.id === goal.id) setDetail(null)
  }

  const handleCopy = async () => {
    if (!confirm(t("hr.kpi.confirmCopy", { month: formatPeriod(period, locale) }))) return
    let count = 0
    const ok = await run(async () => {
      count = (await copyPreviousKpis(period)).length
    }, () => (count === 0 ? t("hr.kpi.copiedNone") : t("hr.kpi.copiedCount", { count })))
    if (ok) {
      if (scope === "mine") setScope("team")
      else await load()
    }
  }

  const summary = summarizeKpis(goals)
  const showEmployee = scope !== "mine"
  const periodLabel = formatPeriod(period, locale)
  const directionLabel = (d: KpiDirection) => (d === "higher" ? t("hr.kpi.directionHigher") : t("hr.kpi.directionLower"))

  const rowActions = (goal: KpiGoal, placement: "row" | "dialog" = "row") => (
    <div className={cn("flex flex-wrap items-center gap-1.5", placement === "row" && "justify-end")}>
      {goal.can_submit && (
        <button type="button" className={leaveButton.outlineSm} disabled={busy} onClick={() => openSubmit(goal)}>
          <Send className="h-3.5 w-3.5" aria-hidden />
          {goal.actual !== null ? t("hr.kpi.resubmit") : t("hr.kpi.submitResult")}
        </button>
      )}
      {goal.can_review && (
        <>
          <button type="button" className={leaveButton.primarySm} disabled={busy} onClick={() => openReview(goal, "approve")}>
            <Check className="h-3.5 w-3.5" aria-hidden />
            {t("hr.kpi.approve")}
          </button>
          <button type="button" className={leaveButton.dangerSm} disabled={busy} onClick={() => openReview(goal, "return")}>
            <Undo2 className="h-3.5 w-3.5" aria-hidden />
            {t("hr.kpi.return")}
          </button>
        </>
      )}
      {goal.can_edit_target && (
        <button
          type="button"
          className={leaveButton.ghostIconSm}
          disabled={busy}
          aria-label={t("hr.common.edit")}
          title={t("hr.common.edit")}
          onClick={() => openEdit(goal)}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
      {canDelete(goal) && (
        <button
          type="button"
          className={cn(leaveButton.ghostIconSm, "hover:bg-destructive/10 hover:text-destructive")}
          disabled={busy}
          aria-label={t("hr.common.delete")}
          title={t("hr.common.delete")}
          onClick={() => handleDelete(goal)}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  )

  const columns: LeaveColumn<KpiGoal>[] = [
    ...(showEmployee
      ? [
          {
            id: "employee",
            header: t("shared.employee"),
            width: "minmax(140px,1fr)",
            mobile: "title" as const,
            cell: (g: KpiGoal) => <PersonCell name={g.employee_name} />,
          },
        ]
      : []),
    {
      id: "goal",
      header: t("hr.kpi.goal"),
      width: "minmax(160px,1.6fr)",
      mobile: showEmployee ? "meta" : "title",
      cell: (g) => {
        const Arrow = g.direction === "higher" ? ArrowUp : ArrowDown
        return (
          <span className="flex min-w-0 items-center gap-1.5" title={`${g.title} · ${directionLabel(g.direction)}`}>
            <span className={cn("truncate", !showEmployee && "font-medium text-foreground")}>{g.title}</span>
            <Arrow className="h-3 w-3 shrink-0 text-muted-foreground" aria-label={directionLabel(g.direction)} />
          </span>
        )
      },
    },
    {
      id: "result",
      header: `${t("hr.kpi.actual")} / ${t("hr.kpi.target")}`,
      width: "minmax(120px,0.8fr)",
      align: "end",
      mobile: "meta",
      cell: (g) => (
        <span className="truncate tabular-nums">
          <span className={g.actual === null ? "text-muted-foreground" : undefined}>{formatKpiValue(g.actual, "")}</span>
          <span className="text-muted-foreground"> / {formatKpiValue(g.target, g.unit)}</span>
        </span>
      ),
    },
    {
      id: "progress",
      header: t("hr.kpi.progress"),
      width: "150px",
      mobile: "meta",
      cell: (g) => <KpiProgress percent={g.percent} className="w-[120px] @3xl:w-full" />,
    },
    {
      id: "status",
      header: t("shared.statusLabel"),
      width: "136px",
      mobile: "end",
      cell: (g) => (
        <TonePill tone={kpiStatusTone(g.status)} dot>
          {t(`hr.kpi.status.${g.status}`)}
        </TonePill>
      ),
    },
    {
      id: "actions",
      header: "",
      width: kpiActionsWidth(goals, canDelete, locale),
      align: "end",
      mobile: "actions",
      cell: (g) => rowActions(g),
    },
  ]

  const scopeOptions = [
    { value: "mine" as KpiScope, label: t("hr.kpi.tabs.mine") },
    ...(isLeaveManager ? [{ value: "team" as KpiScope, label: t("hr.kpi.tabs.team") }] : []),
    ...(isStaff ? [{ value: "all" as KpiScope, label: t("hr.kpi.tabs.all") }] : []),
  ]

  return (
    <FeatureGate loaded={loaded} allowed={enabled}>
      <LeaveHeaderBridge
        sub={periodLabel}
        primary={isLeaveManager ? { label: t("hr.kpi.newTarget"), icon: Plus, onClick: openCreate, testId: "kpi-new-target" } : null}
      />
      <LeavePage testId="kpi-page">
        <LeaveToolbar inset>
          <MonthPicker value={period} onChange={setPeriod} />
          {scopeOptions.length > 1 && (
            <Segmented
              ariaLabel={t("hr.kpi.scopeLabel")}
              value={scope}
              onChange={setScope}
              options={scopeOptions}
              testId="kpi-scope"
            />
          )}
          {isLeaveManager && (
            <button
              type="button"
              className={cn(leaveButton.outlineSm, "ms-auto")}
              disabled={busy}
              onClick={handleCopy}
              data-testid="kpi-copy-last-month"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {t("hr.kpi.copyLastMonth")}
            </button>
          )}
        </LeaveToolbar>

        <StatGrid
          loading={loading}
          testId="kpi-stats"
          items={[
            { key: "total", label: t("hr.kpi.stats.goals"), value: summary.total },
            { key: "pending", label: t("hr.kpi.status.pending"), value: summary.pending, hintTone: "warning" },
            { key: "approved", label: t("hr.kpi.status.approved"), value: summary.approved },
            {
              key: "met",
              label: t("hr.kpi.stats.met"),
              value: summary.met,
              hint: summary.total > 0 ? t("hr.kpi.stats.metHint", { percent: kpiMetShare(summary) }) : undefined,
              hintTone: "success",
            },
          ]}
        />

        <LeaveTable
          variant="card"
          ariaLabel={t("hr.kpi.title")}
          testId="kpi-table"
          rowTestId="kpi-row"
          columns={columns}
          rows={loading ? undefined : goals}
          rowKey={(g) => g.id}
          onRowClick={(g) => openDetail(g.id)}
          error={loadError}
          onRetry={load}
          skeletonRows={4}
          empty={
            <LeaveEmptyState
              icon={Target}
              title={t("hr.kpi.emptyTitle")}
              description={scope === "mine" ? t("hr.kpi.emptyMine") : t("hr.kpi.emptyTeam")}
              action={
                isLeaveManager && scope !== "mine" ? (
                  <button type="button" className={leaveButton.primary} onClick={openCreate}>
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    {t("hr.kpi.newTarget")}
                  </button>
                ) : undefined
              }
            />
          }
          footer={
            !loading && !loadError && goals.length > 0 ? (
              <span className="truncate">
                {t("hr.kpi.summary", {
                  total: summary.total,
                  approved: summary.approved,
                  pending: summary.pending,
                  met: summary.met,
                })}
              </span>
            ) : undefined
          }
        />
      </LeavePage>

      {/* Create / edit target */}
      <Dialog open={targetOpen} onOpenChange={setTargetOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={saveTarget} className="grid gap-4">
            <DialogHeader>
              <DialogTitle className="text-base">{editing ? t("hr.kpi.editTarget") : t("hr.kpi.newTarget")}</DialogTitle>
              <DialogDescription className="text-[13px]">
                {editing ? t("hr.kpi.editTargetHint") : t("hr.kpi.newTargetHint", { month: periodLabel })}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <Field label={t("shared.employee")}>
                {editing ? (
                  <Input className={INPUT} value={editing.employee_name} disabled />
                ) : (
                  <UserPicker
                    users={employeeOptions}
                    value={targetForm.employee}
                    onChange={(id) => setTargetForm({ ...targetForm, employee: id })}
                    className="h-[34px] px-3 text-[13px]"
                  />
                )}
              </Field>
              <Field label={t("hr.kpi.goal")} htmlFor="kpi-title">
                <Input
                  id="kpi-title"
                  className={INPUT}
                  value={targetForm.title}
                  maxLength={200}
                  placeholder={t("hr.kpi.goalPlaceholder")}
                  onChange={(e) => setTargetForm({ ...targetForm, title: e.target.value })}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("hr.kpi.target")} htmlFor="kpi-target">
                  <Input
                    id="kpi-target"
                    className={cn(INPUT, "tabular-nums")}
                    inputMode="decimal"
                    value={targetForm.target}
                    onChange={(e) => setTargetForm({ ...targetForm, target: e.target.value })}
                    required
                  />
                </Field>
                <Field label={t("hr.kpi.unit")} htmlFor="kpi-unit">
                  <Input
                    id="kpi-unit"
                    className={INPUT}
                    value={targetForm.unit}
                    maxLength={30}
                    placeholder={t("hr.kpi.unitPlaceholder")}
                    onChange={(e) => setTargetForm({ ...targetForm, unit: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <div className="grid gap-1.5">
                <span className={LABEL}>{t("hr.kpi.direction")}</span>
                <Segmented
                  size="md"
                  stretch
                  ariaLabel={t("hr.kpi.direction")}
                  value={targetForm.direction}
                  onChange={(v) => setTargetForm({ ...targetForm, direction: v })}
                  options={[
                    { value: "higher", label: t("hr.kpi.directionHigher"), icon: ArrowUp },
                    { value: "lower", label: t("hr.kpi.directionLower"), icon: ArrowDown },
                  ]}
                  testId="kpi-direction"
                />
              </div>
              {editing && editing.actual !== null && (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  {t("hr.kpi.editResetsResult")}
                </p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <button type="button" className={leaveButton.outline} onClick={() => setTargetOpen(false)}>
                {t("hr.common.cancel")}
              </button>
              <button type="submit" className={leaveButton.primary} disabled={busy}>
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                {t("hr.common.save")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit result */}
      <Dialog open={!!submitGoal} onOpenChange={(o) => !o && setSubmitGoal(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <form onSubmit={saveSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle className="text-base">{t("hr.kpi.submitResult")}</DialogTitle>
              <DialogDescription className="text-[13px]">
                {submitGoal &&
                  `${submitGoal.title} — ${t("hr.kpi.target")}: ${formatKpiValue(submitGoal.target, submitGoal.unit)}`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <Field
                htmlFor="kpi-actual"
                label={
                  <>
                    {t("hr.kpi.actual")}
                    {submitGoal?.unit ? <span className="font-normal text-muted-foreground"> ({submitGoal.unit})</span> : null}
                  </>
                }
              >
                <Input
                  id="kpi-actual"
                  className={cn(INPUT, "tabular-nums")}
                  inputMode="decimal"
                  value={submitForm.actual}
                  onChange={(e) => setSubmitForm({ ...submitForm, actual: e.target.value })}
                  required
                />
              </Field>
              <Field label={t("hr.kpi.note")} htmlFor="kpi-note">
                <Textarea
                  id="kpi-note"
                  rows={3}
                  className="text-[13px]"
                  value={submitForm.note}
                  onChange={(e) => setSubmitForm({ ...submitForm, note: e.target.value })}
                />
              </Field>
            </div>
            <DialogFooter className="gap-2">
              <button type="button" className={leaveButton.outline} onClick={() => setSubmitGoal(null)}>
                {t("hr.common.cancel")}
              </button>
              <button type="submit" className={leaveButton.primary} disabled={busy}>
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                {t("hr.kpi.submit")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve / return */}
      <Dialog open={!!reviewGoal} onOpenChange={(o) => !o && setReviewGoal(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <form onSubmit={saveReview} className="grid gap-4">
            <DialogHeader>
              <DialogTitle className="text-base">
                {reviewDecision === "approve" ? t("hr.kpi.approveTitle") : t("hr.kpi.returnTitle")}
              </DialogTitle>
              <DialogDescription className="text-[13px]">
                {reviewGoal && `${reviewGoal.employee_name} · ${reviewGoal.title}`}
              </DialogDescription>
            </DialogHeader>
            {reviewGoal && (
              <div className="grid gap-2 rounded-lg border px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="tabular-nums">
                    {formatKpiValue(reviewGoal.actual, reviewGoal.unit)}
                    <span className="text-muted-foreground"> / {formatKpiValue(reviewGoal.target, reviewGoal.unit)}</span>
                  </span>
                </div>
                <KpiProgress percent={reviewGoal.percent} />
              </div>
            )}
            {reviewGoal?.employee_note && <NoteBlock label={t("hr.kpi.employeeNote")}>{reviewGoal.employee_note}</NoteBlock>}
            <Field
              htmlFor="kpi-feedback"
              label={
                <>
                  {t("hr.kpi.feedback")}
                  {reviewDecision === "approve" && (
                    <span className="font-normal text-muted-foreground"> ({t("hr.kpi.optional")})</span>
                  )}
                </>
              }
            >
              <Textarea
                id="kpi-feedback"
                rows={3}
                className="text-[13px]"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                required={reviewDecision === "return"}
              />
            </Field>
            <DialogFooter className="gap-2">
              <button type="button" className={leaveButton.outline} onClick={() => setReviewGoal(null)}>
                {t("hr.common.cancel")}
              </button>
              <button
                type="submit"
                className={cn(
                  leaveButton.primary,
                  reviewDecision === "return" && "bg-destructive text-white hover:bg-destructive/90"
                )}
                disabled={busy}
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                {reviewDecision === "approve" ? t("hr.kpi.approve") : t("hr.kpi.return")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={!!detail || detailLoading} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]" data-testid="kpi-detail">
          {detailLoading && !detail ? (
            <div className="flex h-40 items-center justify-center">
              <DialogTitle className="sr-only">{t("hr.common.loading")}</DialogTitle>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : detail ? (
            <>
              <DialogHeader className="gap-1.5">
                <div className="flex flex-wrap items-center gap-2 pe-6">
                  <TonePill tone={kpiStatusTone(detail.status)} dot>
                    {t(`hr.kpi.status.${detail.status}`)}
                  </TonePill>
                  <span className="text-xs text-muted-foreground">{formatPeriod(detail.period, locale)}</span>
                </div>
                <DialogTitle className="text-base">{detail.title}</DialogTitle>
                <DialogDescription className="text-[13px]">{detail.employee_name}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border text-[13px]">
                  {[
                    [t("hr.kpi.target"), formatKpiValue(detail.target, detail.unit)],
                    [t("hr.kpi.actual"), formatKpiValue(detail.actual, detail.unit)],
                    [t("hr.kpi.direction"), directionLabel(detail.direction)],
                    [t("hr.kpi.progress"), formatPercent(detail.percent)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex min-w-0 flex-col gap-0.5 bg-card px-3 py-2.5">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="truncate font-medium tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
                <KpiProgress percent={detail.percent} />
                {detail.employee_note && <NoteBlock label={t("hr.kpi.employeeNote")}>{detail.employee_note}</NoteBlock>}
                {detail.manager_feedback && (
                  <NoteBlock
                    bordered
                    label={`${t("hr.kpi.feedback")}${detail.reviewed_by_name ? ` · ${detail.reviewed_by_name}` : ""}`}
                  >
                    {detail.manager_feedback}
                  </NoteBlock>
                )}
                {detail.history && detail.history.length > 0 && (
                  <section className="grid gap-2">
                    <h4 className="text-[13px] font-semibold">{t("hr.kpi.historyTitle")}</h4>
                    <ol className="grid gap-2.5 border-s ps-4">
                      {detail.history.map((ev) => (
                        <li key={ev.id} className="relative text-[13px]">
                          <span
                            aria-hidden
                            className="absolute -start-[21px] top-1.5 h-2 w-2 rounded-full border-2 border-background bg-muted-foreground/60"
                          />
                          <div className="font-medium">
                            {HISTORY_ACTIONS.includes(ev.action) ? t(`hr.kpi.history.${ev.action}`) : ev.action}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {[ev.actor_name, formatDateTime(ev.created_at, locale)].filter(Boolean).join(" · ")}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
                {(detail.can_submit || detail.can_review || detail.can_edit_target || canDelete(detail)) && (
                  <div className="border-t pt-3">{rowActions(detail, "dialog")}</div>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </FeatureGate>
  )
}
