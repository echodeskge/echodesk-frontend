"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { HandCoins, Loader2, Pencil, Trash2 } from "lucide-react"
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
  deleteSubstitutionRate,
  fetchSubstitutionRates,
  setSubstitutionRate,
  type RateMode,
  type SubstitutionRate,
} from "../../_lib/hr-api"
import { formatMoney } from "../../_lib/hr-utils"
import { isValidAmount, normalizeCurrency } from "../../_lib/payroll-utils"
import {
  LeaveEmptyState,
  LeaveTable,
  PersonCell,
  SectionCard,
  Segmented,
  TonePill,
  leaveButton,
  type LeaveColumn,
} from "../../_components/ui"
import { MoneyCell } from "./money"

export function RatesTab() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const { users } = useLiteUsers()
  const [owner, setOwner] = useState<number | null>(null)
  const [rows, setRows] = useState<SubstitutionRate[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [editing, setEditing] = useState<SubstitutionRate | null>(null)
  const [form, setForm] = useState<{ mode: RateMode; amount: string; currency: string }>({
    mode: "day",
    amount: "",
    currency: "",
  })
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setRows(await fetchSubstitutionRates(owner ?? undefined))
    } catch (error) {
      setRows([])
      setLoadError(error)
      toast.error(t("shared.loadFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setLoading(false)
    }
  }, [owner, t])

  useEffect(() => {
    load()
  }, [load])

  const openEdit = (row: SubstitutionRate) => {
    setEditing(row)
    setForm({
      mode: row.rate?.mode ?? "day",
      amount: row.rate?.amount ?? "",
      currency: row.rate?.currency ?? "",
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing || saving) return
    if (!isValidAmount(form.amount)) return toast.error(t("hr.payroll.rates.amountInvalid"))
    // Blank currency = the tenant's payroll currency (server default).
    const currency = form.currency.trim() ? normalizeCurrency(form.currency) : undefined
    if (currency === null) return toast.error(t("hr.payroll.currencyInvalid"))
    setSaving(true)
    try {
      await setSubstitutionRate(editing.id, { mode: form.mode, amount: form.amount.trim(), currency })
      toast.success(t("hr.payroll.rates.saved"))
      setEditing(null)
      await load()
    } catch (error) {
      toast.error(t("hr.payroll.rates.saveFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (row: SubstitutionRate) => {
    if (!confirm(t("hr.payroll.rates.confirmRemove"))) return
    setRemovingId(row.id)
    try {
      await deleteSubstitutionRate(row.id)
      toast.success(t("hr.payroll.rates.removed"))
      await load()
    } catch (error) {
      toast.error(t("hr.payroll.rates.removeFailed"), { description: getApiErrorMessage(error) || undefined })
    } finally {
      setRemovingId(null)
    }
  }

  const columns: LeaveColumn<SubstitutionRate>[] = [
    {
      id: "owner",
      header: t("hr.payroll.rates.owner"),
      width: "minmax(150px,1fr)",
      mobile: "title",
      cell: (row) => <PersonCell name={row.owner_name} />,
    },
    {
      id: "substitute",
      header: t("hr.payroll.rates.substitute"),
      width: "minmax(130px,1fr)",
      mobile: "meta",
      cell: (row) => <span className="truncate">{row.substitute_name}</span>,
    },
    {
      id: "task",
      header: t("hr.payroll.rates.task"),
      width: "minmax(0,1.6fr)",
      mobile: "meta",
      muted: true,
      cell: (row) => (
        <span className="truncate" title={row.task}>
          {row.task}
        </span>
      ),
    },
    {
      id: "rate",
      header: t("hr.payroll.rates.rate"),
      width: "170px",
      align: "end",
      mobile: "end",
      cell: (row) =>
        row.rate ? (
          <span className="flex items-baseline gap-1 whitespace-nowrap">
            <MoneyCell amount={formatMoney(row.rate.amount, locale)} currency={row.rate.currency} />
            <span className="text-[11px] text-muted-foreground">/ {t(`hr.payroll.rates.per.${row.rate.mode}`)}</span>
          </span>
        ) : (
          <TonePill tone="neutral">{t("hr.payroll.rates.noRate")}</TonePill>
        ),
    },
    {
      id: "actions",
      header: "",
      width: "64px",
      align: "end",
      mobile: "actions",
      cell: (row) => (
        <span className="flex items-center gap-1">
          <button
            type="button"
            className={leaveButton.ghostIconSm}
            aria-label={t("hr.common.edit")}
            title={t("hr.common.edit")}
            onClick={() => openEdit(row)}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
          {row.rate && (
            <button
              type="button"
              className={cn(leaveButton.ghostIconSm, "hover:bg-destructive/10 hover:text-destructive")}
              aria-label={t("hr.payroll.rates.remove")}
              title={t("hr.payroll.rates.remove")}
              disabled={removingId === row.id}
              onClick={() => handleRemove(row)}
            >
              {removingId === row.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <SectionCard
        testId="payroll-rates"
        title={t("hr.payroll.rates.title")}
        hint={t("hr.payroll.rates.description")}
        actions={
          <div className="w-[170px] sm:w-[200px]">
            <UserPicker
              users={users}
              value={owner}
              onChange={setOwner}
              allowClear
              placeholder={t("hr.payroll.rates.allOwners")}
              className="h-7 px-2 text-xs"
            />
          </div>
        }
      >
        <LeaveTable
          variant="flush"
          ariaLabel={t("hr.payroll.rates.title")}
          testId="rates-table"
          rowTestId="rate-row"
          columns={columns}
          rows={loading ? undefined : rows}
          rowKey={(row) => row.id}
          onRowClick={openEdit}
          error={loadError}
          onRetry={load}
          skeletonRows={4}
          empty={<LeaveEmptyState icon={HandCoins} title={t("hr.payroll.rates.empty")} />}
        />
      </SectionCard>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <form onSubmit={handleSave} className="grid gap-4">
            <DialogHeader>
              <DialogTitle className="text-base">{t("hr.payroll.rates.editTitle")}</DialogTitle>
              <DialogDescription className="text-[13px]">
                {editing &&
                  t("hr.payroll.rates.editDescription", {
                    substitute: editing.substitute_name,
                    owner: editing.owner_name,
                  })}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              {editing && (
                <p className="whitespace-pre-wrap break-words rounded-md bg-muted px-3 py-2.5 text-[13px]">{editing.task}</p>
              )}
              <div className="grid gap-1.5">
                <span className="text-[13px] font-medium">{t("hr.payroll.rates.mode")}</span>
                <Segmented
                  size="md"
                  stretch
                  ariaLabel={t("hr.payroll.rates.mode")}
                  value={form.mode}
                  onChange={(v) => setForm({ ...form, mode: v })}
                  options={[
                    { value: "day" as RateMode, label: t("hr.payroll.rates.modeDay") },
                    { value: "month" as RateMode, label: t("hr.payroll.rates.modeMonth") },
                  ]}
                  testId="rate-mode"
                />
                <p className="text-xs leading-[17px] text-muted-foreground">
                  {form.mode === "day" ? t("hr.payroll.rates.modeDayHint") : t("hr.payroll.rates.modeMonthHint")}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 grid gap-1.5">
                  <label htmlFor="rate-amount" className="text-[13px] font-medium">
                    {t("hr.payroll.rates.amount")}
                  </label>
                  <Input
                    id="rate-amount"
                    className="h-[34px] text-[13px] tabular-nums"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="rate-currency" className="text-[13px] font-medium">
                    {t("hr.payroll.columns.currency")}
                  </label>
                  <Input
                    id="rate-currency"
                    className="h-[34px] font-mono text-[13px] uppercase"
                    maxLength={3}
                    placeholder={t("hr.payroll.rates.currencyDefault")}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
              <p className="text-xs leading-[17px] text-muted-foreground">{t("hr.payroll.rates.appliesHint")}</p>
            </div>
            <DialogFooter className="gap-2">
              <button type="button" className={leaveButton.outline} onClick={() => setEditing(null)}>
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
