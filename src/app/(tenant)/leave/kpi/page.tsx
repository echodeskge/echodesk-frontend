"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  CheckCircle2,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Send,
  Target,
  Trash2,
  Undo2,
} from "lucide-react"
import { getApiErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { cn } from "@/lib/utils"
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
import {
  currentPeriod,
  formatPercent,
  formatPeriod,
  kpiProgressWidth,
  kpiStatusVariant,
  kpiTone,
  type KpiTone,
} from "../_lib/hr-utils"
import { deepLinkId, formatKpiValue, isValidKpiNumber, summarizeKpis } from "../_lib/kpi-utils"
import { useLeaveFeatures } from "../_lib/useLeaveFeatures"
import { FeatureGate } from "../_components/FeatureGate"
import { MonthPicker } from "../_components/MonthPicker"
import { UserPicker, useLiteUsers } from "../_components/UserPicker"

const TONE_CLASS: Record<KpiTone, string> = {
  good: "bg-green-500",
  warn: "bg-amber-500",
  bad: "bg-red-500",
  none: "bg-muted-foreground/30",
}

const HISTORY_ACTIONS = ["created", "target_changed", "submitted", "approved", "returned", "deleted"]

function KpiProgress({ percent }: { percent: string | null }) {
  const width = kpiProgressWidth(percent)
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", TONE_CLASS[kpiTone(percent)])}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-xs tabular-nums w-12 text-right">{formatPercent(percent)}</span>
    </div>
  )
}

interface TargetForm {
  employee: number | null
  title: string
  target: string
  unit: string
  direction: KpiDirection
}

const EMPTY_TARGET: TargetForm = { employee: null, title: "", target: "", unit: "", direction: "higher" }

export default function KpiPage() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const { loaded, features, isStaff, isLeaveManager, userId } = useLeaveFeatures()

  const [scope, setScope] = useState<KpiScope>("mine")
  const [period, setPeriod] = useState(currentPeriod())
  const [goals, setGoals] = useState<KpiGoal[]>([])
  const [loading, setLoading] = useState(true)
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
    try {
      setGoals(await fetchKpis({ scope, period }))
    } catch (error) {
      setGoals([])
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

  const rowActions = (goal: KpiGoal) => (
    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
      {goal.can_submit && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => openSubmit(goal)}>
          <Send className="h-4 w-4 mr-1" />
          {goal.actual !== null ? t("hr.kpi.resubmit") : t("hr.kpi.submitResult")}
        </Button>
      )}
      {goal.can_review && (
        <>
          <Button size="sm" disabled={busy} onClick={() => openReview(goal, "approve")}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {t("hr.kpi.approve")}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => openReview(goal, "return")}>
            <Undo2 className="h-4 w-4 mr-1" />
            {t("hr.kpi.return")}
          </Button>
        </>
      )}
      {goal.can_edit_target && (
        <Button size="icon" variant="ghost" disabled={busy} aria-label={t("hr.common.edit")} onClick={() => openEdit(goal)}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {canDelete(goal) && (
        <Button size="icon" variant="ghost" disabled={busy} aria-label={t("hr.common.delete")} onClick={() => handleDelete(goal)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  )

  return (
    <FeatureGate loaded={loaded} allowed={enabled}>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("hr.kpi.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("hr.kpi.description")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker value={period} onChange={setPeriod} />
            {isLeaveManager && (
              <>
                <Button variant="outline" disabled={busy} onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t("hr.kpi.copyLastMonth")}
                </Button>
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("hr.kpi.newTarget")}
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs value={scope} onValueChange={(v) => setScope(v as KpiScope)}>
          <TabsList>
            <TabsTrigger value="mine">{t("hr.kpi.tabs.mine")}</TabsTrigger>
            {isLeaveManager && <TabsTrigger value="team">{t("hr.kpi.tabs.team")}</TabsTrigger>}
            {isStaff && <TabsTrigger value="all">{t("hr.kpi.tabs.all")}</TabsTrigger>}
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>{formatPeriod(period, locale)}</CardTitle>
            <CardDescription>
              {t("hr.kpi.summary", {
                total: summary.total,
                approved: summary.approved,
                pending: summary.pending,
                met: summary.met,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : goals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("hr.kpi.emptyTitle")}</h3>
                <p className="text-muted-foreground">
                  {scope === "mine" ? t("hr.kpi.emptyMine") : t("hr.kpi.emptyTeam")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {showEmployee && <TableHead>{t("shared.employee")}</TableHead>}
                      <TableHead>{t("hr.kpi.goal")}</TableHead>
                      <TableHead>{t("hr.kpi.target")}</TableHead>
                      <TableHead>{t("hr.kpi.actual")}</TableHead>
                      <TableHead>{t("hr.kpi.progress")}</TableHead>
                      <TableHead>{t("shared.statusLabel")}</TableHead>
                      <TableHead>{t("shared.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goals.map((goal) => (
                      <TableRow
                        key={goal.id}
                        className="cursor-pointer"
                        onClick={() => openDetail(goal.id)}
                      >
                        {showEmployee && <TableCell className="font-medium">{goal.employee_name}</TableCell>}
                        <TableCell>
                          <div className="font-medium">{goal.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {goal.direction === "higher" ? t("hr.kpi.directionHigher") : t("hr.kpi.directionLower")}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatKpiValue(goal.target, goal.unit)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatKpiValue(goal.actual, goal.unit)}</TableCell>
                        <TableCell>
                          <KpiProgress percent={goal.percent} />
                        </TableCell>
                        <TableCell>
                          <Badge variant={kpiStatusVariant(goal.status)}>{t(`hr.kpi.status.${goal.status}`)}</Badge>
                        </TableCell>
                        <TableCell>{rowActions(goal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / edit target */}
      <Dialog open={targetOpen} onOpenChange={setTargetOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={saveTarget}>
            <DialogHeader>
              <DialogTitle>{editing ? t("hr.kpi.editTarget") : t("hr.kpi.newTarget")}</DialogTitle>
              <DialogDescription>
                {editing ? t("hr.kpi.editTargetHint") : t("hr.kpi.newTargetHint", { month: formatPeriod(period, locale) })}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t("shared.employee")}</Label>
                {editing ? (
                  <Input value={editing.employee_name} disabled />
                ) : (
                  <UserPicker
                    users={employeeOptions}
                    value={targetForm.employee}
                    onChange={(id) => setTargetForm({ ...targetForm, employee: id })}
                  />
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="kpi-title">{t("hr.kpi.goal")}</Label>
                <Input
                  id="kpi-title"
                  value={targetForm.title}
                  maxLength={200}
                  placeholder={t("hr.kpi.goalPlaceholder")}
                  onChange={(e) => setTargetForm({ ...targetForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="kpi-target">{t("hr.kpi.target")}</Label>
                  <Input
                    id="kpi-target"
                    inputMode="decimal"
                    value={targetForm.target}
                    onChange={(e) => setTargetForm({ ...targetForm, target: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="kpi-unit">{t("hr.kpi.unit")}</Label>
                  <Input
                    id="kpi-unit"
                    value={targetForm.unit}
                    maxLength={30}
                    placeholder={t("hr.kpi.unitPlaceholder")}
                    onChange={(e) => setTargetForm({ ...targetForm, unit: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>{t("hr.kpi.direction")}</Label>
                <Select
                  value={targetForm.direction}
                  onValueChange={(v) => setTargetForm({ ...targetForm, direction: v as KpiDirection })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="higher">{t("hr.kpi.directionHigher")}</SelectItem>
                    <SelectItem value="lower">{t("hr.kpi.directionLower")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editing && editing.actual !== null && (
                <p className="text-sm text-amber-600">{t("hr.kpi.editResetsResult")}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTargetOpen(false)}>
                {t("hr.common.cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("hr.common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit result */}
      <Dialog open={!!submitGoal} onOpenChange={(o) => !o && setSubmitGoal(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <form onSubmit={saveSubmit}>
            <DialogHeader>
              <DialogTitle>{t("hr.kpi.submitResult")}</DialogTitle>
              <DialogDescription>
                {submitGoal &&
                  `${submitGoal.title} — ${t("hr.kpi.target")}: ${formatKpiValue(submitGoal.target, submitGoal.unit)}`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="kpi-actual">
                  {t("hr.kpi.actual")} {submitGoal?.unit ? `(${submitGoal.unit})` : ""}
                </Label>
                <Input
                  id="kpi-actual"
                  inputMode="decimal"
                  value={submitForm.actual}
                  onChange={(e) => setSubmitForm({ ...submitForm, actual: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="kpi-note">{t("hr.kpi.note")}</Label>
                <Textarea
                  id="kpi-note"
                  rows={3}
                  value={submitForm.note}
                  onChange={(e) => setSubmitForm({ ...submitForm, note: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSubmitGoal(null)}>
                {t("hr.common.cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("hr.kpi.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve / return */}
      <Dialog open={!!reviewGoal} onOpenChange={(o) => !o && setReviewGoal(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <form onSubmit={saveReview}>
            <DialogHeader>
              <DialogTitle>
                {reviewDecision === "approve" ? t("hr.kpi.approveTitle") : t("hr.kpi.returnTitle")}
              </DialogTitle>
              <DialogDescription>
                {reviewGoal &&
                  `${reviewGoal.employee_name} · ${reviewGoal.title}: ${formatKpiValue(reviewGoal.actual, reviewGoal.unit)} / ${formatKpiValue(reviewGoal.target, reviewGoal.unit)} (${formatPercent(reviewGoal.percent)})`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {reviewGoal?.employee_note && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <div className="text-xs text-muted-foreground mb-1">{t("hr.kpi.employeeNote")}</div>
                  {reviewGoal.employee_note}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="kpi-feedback">
                  {t("hr.kpi.feedback")}
                  {reviewDecision === "approve" && (
                    <span className="text-muted-foreground font-normal"> ({t("hr.kpi.optional")})</span>
                  )}
                </Label>
                <Textarea
                  id="kpi-feedback"
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  required={reviewDecision === "return"}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReviewGoal(null)}>
                {t("hr.common.cancel")}
              </Button>
              <Button
                type="submit"
                variant={reviewDecision === "return" ? "destructive" : "default"}
                disabled={busy}
              >
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {reviewDecision === "approve" ? t("hr.kpi.approve") : t("hr.kpi.return")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={!!detail || detailLoading} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {detailLoading && !detail ? (
            <div className="flex items-center justify-center h-40">
              <DialogTitle className="sr-only">{t("hr.common.loading")}</DialogTitle>
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : detail ? (
            <>
              <DialogHeader>
                <DialogTitle>{detail.title}</DialogTitle>
                <DialogDescription>
                  {detail.employee_name} · {formatPeriod(detail.period, locale)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">{t("hr.kpi.target")}</div>
                    <div className="font-medium">{formatKpiValue(detail.target, detail.unit)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("hr.kpi.actual")}</div>
                    <div className="font-medium">{formatKpiValue(detail.actual, detail.unit)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("hr.kpi.direction")}</div>
                    <div>{detail.direction === "higher" ? t("hr.kpi.directionHigher") : t("hr.kpi.directionLower")}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("shared.statusLabel")}</div>
                    <Badge variant={kpiStatusVariant(detail.status)}>{t(`hr.kpi.status.${detail.status}`)}</Badge>
                  </div>
                </div>
                <KpiProgress percent={detail.percent} />
                {detail.employee_note && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <div className="text-xs text-muted-foreground mb-1">{t("hr.kpi.employeeNote")}</div>
                    {detail.employee_note}
                  </div>
                )}
                {detail.manager_feedback && (
                  <div className="rounded-md border p-3 text-sm">
                    <div className="text-xs text-muted-foreground mb-1">
                      {t("hr.kpi.feedback")}
                      {detail.reviewed_by_name ? ` · ${detail.reviewed_by_name}` : ""}
                    </div>
                    {detail.manager_feedback}
                  </div>
                )}
                {detail.history && detail.history.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">{t("hr.kpi.historyTitle")}</h4>
                    <ol className="space-y-2 border-l pl-4">
                      {detail.history.map((ev) => (
                        <li key={ev.id} className="text-sm">
                          <div className="font-medium">
                            {HISTORY_ACTIONS.includes(ev.action) ? t(`hr.kpi.history.${ev.action}`) : ev.action}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {[ev.actor_name, new Date(ev.created_at).toLocaleString()].filter(Boolean).join(" · ")}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {rowActions(detail)}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </FeatureGate>
  )
}
