"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { getApiErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { UserPicker, useLiteUsers } from "../../_components/UserPicker"
import {
  createCompensation,
  deleteCompensation,
  fetchCompensations,
  type Compensation,
} from "../../_lib/hr-api"
import { formatMoney } from "../../_lib/hr-utils"
import { isValidAmount, normalizeCurrency } from "../../_lib/payroll-utils"

const emptyForm = { monthly_salary: "", currency: "GEL", effective_from: "", note: "" }

export function SalariesTab() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const { users } = useLiteUsers()
  const [userId, setUserId] = useState<number | null>(null)
  const [records, setRecords] = useState<Compensation[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formUser, setFormUser] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRecords(await fetchCompensations(userId ?? undefined))
    } catch (error) {
      setRecords([])
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

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0">
        <div>
          <CardTitle>{t("hr.payroll.salaries.title")}</CardTitle>
          <CardDescription>{t("hr.payroll.salaries.description")}</CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-64">
            <UserPicker
              users={users}
              value={userId}
              onChange={setUserId}
              allowClear
              placeholder={t("hr.payroll.salaries.allEmployees")}
            />
          </div>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            {t("hr.payroll.salaries.add")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">{t("hr.payroll.salaries.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("hr.payroll.columns.employee")}</TableHead>
                  <TableHead className="text-right">{t("hr.payroll.columns.monthly_salary")}</TableHead>
                  <TableHead>{t("hr.payroll.columns.currency")}</TableHead>
                  <TableHead>{t("hr.payroll.salaries.effectiveFrom")}</TableHead>
                  <TableHead>{t("hr.payroll.salaries.note")}</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-medium">{rec.user_name}</TableCell>
                    <TableCell className="text-right">{formatMoney(rec.monthly_salary, locale)}</TableCell>
                    <TableCell>{rec.currency}</TableCell>
                    <TableCell>{new Date(rec.effective_from).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-[280px] truncate" title={rec.note}>
                      {rec.note}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={t("hr.common.delete")}
                        disabled={deletingId === rec.id}
                        onClick={() => handleDelete(rec)}
                      >
                        {deletingId === rec.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{t("hr.payroll.salaries.addTitle")}</DialogTitle>
              <DialogDescription>{t("hr.payroll.salaries.addDescription")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t("hr.payroll.columns.employee")}</Label>
                <UserPicker users={users} value={formUser} onChange={setFormUser} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="comp-salary">{t("hr.payroll.columns.monthly_salary")}</Label>
                  <Input
                    id="comp-salary"
                    inputMode="decimal"
                    value={form.monthly_salary}
                    onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })}
                    placeholder="1500.00"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="comp-currency">{t("hr.payroll.columns.currency")}</Label>
                  <Input
                    id="comp-currency"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="comp-from">{t("hr.payroll.salaries.effectiveFrom")}</Label>
                <Input
                  id="comp-from"
                  type="date"
                  value={form.effective_from}
                  onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="comp-note">{t("hr.payroll.salaries.note")}</Label>
                <Input
                  id="comp-note"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
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
