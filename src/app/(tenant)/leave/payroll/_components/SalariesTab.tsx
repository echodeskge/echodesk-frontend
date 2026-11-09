"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Wallet } from "lucide-react"
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
import { UserPicker, useLiteUsers } from "../../_components/UserPicker"
import {
  createCompensation,
  deleteCompensation,
  fetchCompensations,
  type Compensation,
} from "../../_lib/hr-api"
import { formatMoney } from "../../_lib/hr-utils"
import { isValidAmount, normalizeCurrency } from "../../_lib/payroll-utils"
import {
  LeaveEmptyState,
  LeaveTable,
  PersonCell,
  SectionCard,
  formatLeaveDate,
  leaveButton,
  type LeaveColumn,
} from "../../_components/ui"
import { MoneyCell } from "./money"

const emptyForm = { monthly_salary: "", currency: "GEL", effective_from: "", note: "" }

export function SalariesTab() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const { users } = useLiteUsers()
  const [userId, setUserId] = useState<number | null>(null)
  const [records, setRecords] = useState<Compensation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formUser, setFormUser] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setRecords(await fetchCompensations(userId ?? undefined))
    } catch (error) {
      setRecords([])
      setLoadError(error)
      toast.error(t("shared.loadFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setLoading(false)
    }
  }, [userId, t])

  useEffect(() => {
    load()
  }, [load])

  const openAdd = () => {
    // Prefill the currency from the latest record of the chosen user.
    const latest = records.find((r) => r.user === userId)
    setForm({ ...emptyForm, currency: latest?.currency || emptyForm.currency })
    setFormUser(userId)
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    const currency = normalizeCurrency(form.currency)
    if (!formUser) return toast.error(t("hr.payroll.salaries.userRequired"))
    if (!isValidAmount(form.monthly_salary)) return toast.error(t("hr.payroll.salaries.amountInvalid"))
    if (!currency) return toast.error(t("hr.payroll.currencyInvalid"))
    if (!form.effective_from) return toast.error(t("hr.payroll.salaries.dateRequired"))
    setSaving(true)
    try {
      await createCompensation({
        user: formUser,
        monthly_salary: form.monthly_salary.trim(),
        currency,
        effective_from: form.effective_from,
        note: form.note.trim(),
      })
      toast.success(t("hr.payroll.salaries.added"))
      setDialogOpen(false)
      await load()
    } catch (error) {
      toast.error(t("hr.payroll.salaries.saveFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (rec: Compensation) => {
    if (!confirm(t("hr.payroll.salaries.confirmDelete"))) return
    setDeletingId(rec.id)
    try {
      await deleteCompensation(rec.id)
      toast.success(t("hr.payroll.salaries.deleted"))
      await load()
    } catch (error) {
      toast.error(t("hr.payroll.salaries.deleteFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setDeletingId(null)
    }
  }

  const columns: LeaveColumn<Compensation>[] = [
    {
      id: "employee",
      header: t("hr.payroll.columns.employee"),
      width: "minmax(160px,1.2fr)",
      mobile: "title",
      cell: (rec) => <PersonCell name={rec.user_name} />,
    },
    {
      id: "salary",
      header: t("hr.payroll.columns.monthly_salary"),
      width: "140px",
      align: "end",
      mobile: "end",
      cell: (rec) => <MoneyCell amount={formatMoney(rec.monthly_salary, locale)} currency={rec.currency} />,
    },
    {
      id: "from",
      header: t("hr.payroll.salaries.effectiveFrom"),
      width: "120px",
      mobile: "meta",
      className: "@3xl:ps-3",
      cell: (rec) => <span className="tabular-nums">{formatLeaveDate(rec.effective_from, locale, { year: "always" })}</span>,
    },
    {
      id: "note",
      header: t("hr.payroll.salaries.note"),
      width: "minmax(0,1.4fr)",
      mobile: "meta",
      muted: true,
      cell: (rec) =>
        rec.note ? (
          <span className="truncate" title={rec.note}>
            {rec.note}
          </span>
        ) : null,
      className: "empty:hidden @3xl:empty:flex",
    },
    {
      id: "actions",
      header: "",
      width: "36px",
      align: "end",
      mobile: "actions",
      cell: (rec) => (
        <button
          type="button"
          className={cn(leaveButton.ghostIconSm, "hover:bg-destructive/10 hover:text-destructive")}
          aria-label={t("hr.common.delete")}
          title={t("hr.common.delete")}
          disabled={deletingId === rec.id}
          onClick={() => handleDelete(rec)}
        >
          {deletingId === rec.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
      ),
    },
  ]

  return (
    <>
      <SectionCard
        testId="payroll-salaries"
        title={t("hr.payroll.salaries.title")}
        hint={t("hr.payroll.salaries.description")}
        actions={
          <>
            <div className="w-[150px] sm:w-[200px]">
              <UserPicker
                users={users}
                value={userId}
                onChange={setUserId}
                allowClear
                placeholder={t("hr.payroll.salaries.allEmployees")}
                className="h-7 px-2 text-xs"
              />
            </div>
            <button type="button" className={leaveButton.primarySm} onClick={openAdd} data-testid="salary-add">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {t("hr.payroll.salaries.add")}
            </button>
          </>
        }
      >
        <LeaveTable
          variant="flush"
          ariaLabel={t("hr.payroll.salaries.title")}
          testId="salaries-table"
          rowTestId="salary-row"
          columns={columns}
          rows={loading ? undefined : records}
          rowKey={(rec) => rec.id}
          error={loadError}
          onRetry={load}
          skeletonRows={4}
          empty={<LeaveEmptyState icon={Wallet} title={t("hr.payroll.salaries.empty")} />}
        />
      </SectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSave} className="grid gap-4">
            <DialogHeader>
              <DialogTitle className="text-base">{t("hr.payroll.salaries.addTitle")}</DialogTitle>
              <DialogDescription className="text-[13px]">{t("hr.payroll.salaries.addDescription")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <span className="text-[13px] font-medium">{t("hr.payroll.columns.employee")}</span>
                <UserPicker users={users} value={formUser} onChange={setFormUser} className="h-[34px] px-3 text-[13px]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 grid gap-1.5">
                  <label htmlFor="comp-salary" className="text-[13px] font-medium">
                    {t("hr.payroll.columns.monthly_salary")}
                  </label>
                  <Input
                    id="comp-salary"
                    className="h-[34px] text-[13px] tabular-nums"
                    inputMode="decimal"
                    value={form.monthly_salary}
                    onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })}
                    placeholder="1500.00"
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="comp-currency" className="text-[13px] font-medium">
                    {t("hr.payroll.columns.currency")}
                  </label>
                  <Input
                    id="comp-currency"
                    className="h-[34px] font-mono text-[13px] uppercase"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="comp-from" className="text-[13px] font-medium">
                  {t("hr.payroll.salaries.effectiveFrom")}
                </label>
                <Input
                  id="comp-from"
                  type="date"
                  className="h-[34px] text-[13px]"
                  value={form.effective_from}
                  onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="comp-note" className="text-[13px] font-medium">
                  {t("hr.payroll.salaries.note")}
                </label>
                <Input
                  id="comp-note"
                  className="h-[34px] text-[13px]"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <button type="button" className={leaveButton.outline} onClick={() => setDialogOpen(false)}>
                {t("hr.common.cancel")}
              </button>
              <button type="submit" className={leaveButton.primary} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                {t("hr.common.save")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
