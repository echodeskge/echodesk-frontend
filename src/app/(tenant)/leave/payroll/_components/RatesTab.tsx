"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import { getApiErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

export function RatesTab() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const { users } = useLiteUsers()
  const [owner, setOwner] = useState<number | null>(null)
  const [rows, setRows] = useState<SubstitutionRate[]>([])
  const [loading, setLoading] = useState(true)
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
    try {
      setRows(await fetchSubstitutionRates(owner ?? undefined))
    } catch (error) {
      setRows([])
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

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0">
        <div>
          <CardTitle>{t("hr.payroll.rates.title")}</CardTitle>
          <CardDescription>{t("hr.payroll.rates.description")}</CardDescription>
        </div>
        <div className="w-full sm:w-64">
          <UserPicker
            users={users}
            value={owner}
            onChange={setOwner}
            allowClear
            placeholder={t("hr.payroll.rates.allOwners")}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">{t("hr.payroll.rates.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("hr.payroll.rates.owner")}</TableHead>
                  <TableHead>{t("hr.payroll.rates.substitute")}</TableHead>
                  <TableHead>{t("hr.payroll.rates.task")}</TableHead>
                  <TableHead>{t("hr.payroll.rates.rate")}</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.owner_name}</TableCell>
                    <TableCell>{row.substitute_name}</TableCell>
                    <TableCell className="max-w-[320px] whitespace-normal">{row.task}</TableCell>
                    <TableCell>
                      {row.rate ? (
                        <span>
                          {formatMoney(row.rate.amount, locale)} {row.rate.currency}{" "}
                          <span className="text-muted-foreground">
                            / {t(`hr.payroll.rates.per.${row.rate.mode}`)}
                          </span>
                        </span>
                      ) : (
                        <Badge variant="outline">{t("hr.payroll.rates.noRate")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" aria-label={t("hr.common.edit")} onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {row.rate && (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={t("hr.payroll.rates.remove")}
                            disabled={removingId === row.id}
                            onClick={() => handleRemove(row)}
                          >
                            {removingId === row.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{t("hr.payroll.rates.editTitle")}</DialogTitle>
              <DialogDescription>
                {editing &&
                  t("hr.payroll.rates.editDescription", {
                    substitute: editing.substitute_name,
                    owner: editing.owner_name,
                  })}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {editing && <p className="text-sm rounded-md bg-muted p-3">{editing.task}</p>}
              <div className="grid gap-2">
                <Label>{t("hr.payroll.rates.mode")}</Label>
                <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v as RateMode })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">{t("hr.payroll.rates.modeDay")}</SelectItem>
                    <SelectItem value="month">{t("hr.payroll.rates.modeMonth")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {form.mode === "day" ? t("hr.payroll.rates.modeDayHint") : t("hr.payroll.rates.modeMonthHint")}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="rate-amount">{t("hr.payroll.rates.amount")}</Label>
                  <Input
                    id="rate-amount"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rate-currency">{t("hr.payroll.columns.currency")}</Label>
                  <Input
                    id="rate-currency"
                    maxLength={3}
                    placeholder={t("hr.payroll.rates.currencyDefault")}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t("hr.payroll.rates.appliesHint")}</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                {t("hr.common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("hr.common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
