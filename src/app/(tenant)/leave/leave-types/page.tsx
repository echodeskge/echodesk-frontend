"use client"

import { useState, useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { getApiErrorMessage, localizedName } from "@/lib/utils"
import {
  leaveAdminLeaveTypesCreate,
  leaveAdminLeaveTypesDestroy,
  leaveAdminLeaveTypesList,
  leaveAdminLeaveTypesRetrieve,
  leaveAdminLeaveTypesUpdate,
} from "@/api/generated/api"
import type { CalculationMethodEnum } from "@/api/generated/interfaces"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Loader2, ListTree } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type LocalizedText = { en?: string; ka?: string } | string | null | undefined

// The list endpoint (LeaveTypeListSerializer) returns only the first block of
// fields; the allocation fields come from the detail endpoint and are merged
// in after the list loads.
interface LeaveType {
  id: number
  name: LocalizedText
  name_display?: string
  code: string
  is_paid?: boolean
  requires_approval?: boolean
  color?: string
  is_active?: boolean
  sort_order?: number
  description?: LocalizedText
  calculation_method?: CalculationMethodEnum
  default_days_per_year?: string
  accrual_rate_per_month?: string
  max_carry_forward_days?: number
  carry_forward_expiry_months?: number
}

const DEFAULT_COLOR = "#3B82F6"

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const results = (data as { results?: unknown } | null | undefined)?.results
  return Array.isArray(results) ? (results as T[]) : []
}

function textPart(value: LocalizedText, key: "en" | "ka"): string {
  if (!value) return ""
  if (typeof value === "string") return value
  return value[key] || ""
}

export default function LeaveTypesPage() {
  const t = useTranslations("leave")
  const locale = useLocale()
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<LeaveType | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name_en: "",
    name_ka: "",
    code: "",
    description_en: "",
    description_ka: "",
    is_paid: true,
    requires_approval: true,
    calculation_method: "annual" as CalculationMethodEnum,
    default_days_per_year: "0",
    accrual_rate_per_month: "0",
    max_carry_forward_days: 0,
    carry_forward_expiry_months: 0,
    color: "#3B82F6",
    is_active: true,
    sort_order: 0,
  })

  useEffect(() => {
    fetchLeaveTypes()
  }, [])

  const fetchLeaveTypes = async () => {
    try {
      // Positional: (ordering, page, pageSize, search)
      const response = await leaveAdminLeaveTypesList(undefined, undefined, 100)
      const list = unwrapList<LeaveType>(response)

      // The list omits calculation method / day allocations; load each detail.
      let detailFailure: unknown = null
      const details = await Promise.all(
        list.map((item) =>
          leaveAdminLeaveTypesRetrieve(String(item.id)).catch((error: unknown) => {
            detailFailure = error
            return null
          })
        )
      )
      setLeaveTypes(list.map((item, index) => (details[index] as LeaveType | null) ?? item))

      if (detailFailure) {
        console.error("Failed to fetch leave type details:", detailFailure)
        toast.error(t("shared.loadFailed"), {
          description: getApiErrorMessage(detailFailure) || undefined,
        })
      }
    } catch (error) {
      console.error("Failed to fetch leave types:", error)
      setLeaveTypes([])
      toast.error(t("shared.loadFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const payload = {
        name: { en: formData.name_en.trim(), ka: formData.name_ka.trim() },
        code: formData.code.trim(),
        description: { en: formData.description_en, ka: formData.description_ka },
        is_paid: formData.is_paid,
        requires_approval: formData.requires_approval,
        calculation_method: formData.calculation_method,
        default_days_per_year: formData.default_days_per_year || "0",
        accrual_rate_per_month: formData.accrual_rate_per_month || "0",
        max_carry_forward_days: formData.max_carry_forward_days || 0,
        carry_forward_expiry_months: formData.carry_forward_expiry_months || 0,
        color: formData.color || DEFAULT_COLOR,
        is_active: formData.is_active,
        sort_order: formData.sort_order || 0,
      }

      if (editingType) {
        await leaveAdminLeaveTypesUpdate(String(editingType.id), payload)
        toast.success(t("leaveTypes.updated"))
      } else {
        await leaveAdminLeaveTypesCreate(payload)
        toast.success(t("leaveTypes.created"))
      }

      setIsDialogOpen(false)
      setEditingType(null)
      resetForm()
      await fetchLeaveTypes()
    } catch (error) {
      // Keep the dialog open so the user can fix the input and retry.
      console.error("Failed to save leave type:", error)
      toast.error(t("leaveTypes.saveFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (row: LeaveType) => {
    let leaveType = row
    // A row without allocation fields means its detail did not load; a full
    // update (PUT) needs them, so fetch before opening the form.
    if (row.calculation_method === undefined) {
      setBusyId(row.id)
      try {
        leaveType = (await leaveAdminLeaveTypesRetrieve(String(row.id))) as LeaveType
      } catch (error) {
        console.error("Failed to load leave type:", error)
        toast.error(t("shared.loadFailed"), {
          description: getApiErrorMessage(error) || undefined,
        })
        return
      } finally {
        setBusyId(null)
      }
    }

    setEditingType(leaveType)
    setFormData({
      name_en: textPart(leaveType.name, "en"),
      name_ka: textPart(leaveType.name, "ka"),
      code: leaveType.code,
      description_en: textPart(leaveType.description, "en"),
      description_ka: textPart(leaveType.description, "ka"),
      is_paid: leaveType.is_paid ?? true,
      requires_approval: leaveType.requires_approval ?? true,
      calculation_method: leaveType.calculation_method ?? "annual",
      default_days_per_year: leaveType.default_days_per_year ?? "0",
      accrual_rate_per_month: leaveType.accrual_rate_per_month ?? "0",
      max_carry_forward_days: leaveType.max_carry_forward_days ?? 0,
      carry_forward_expiry_months: leaveType.carry_forward_expiry_months ?? 0,
      color: leaveType.color || DEFAULT_COLOR,
      is_active: leaveType.is_active ?? true,
      sort_order: leaveType.sort_order ?? 0,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("leaveTypes.confirmDelete"))) return

    setBusyId(id)
    try {
      await leaveAdminLeaveTypesDestroy(String(id))
      toast.success(t("leaveTypes.deleted"))
      await fetchLeaveTypes()
    } catch (error) {
      console.error("Failed to delete leave type:", error)
      toast.error(t("leaveTypes.deleteFailed"), {
        description: getApiErrorMessage(error, t("leaveTypes.deleteFailedInUse")),
      })
    } finally {
      setBusyId(null)
    }
  }

  const typeName = (type: LeaveType) =>
    typeof type.name === "string"
      ? type.name
      : localizedName(type.name, locale) || type.name_display || type.code

  const methodLabel = (method?: string) => {
    if (method === "annual") return t("leaveTypes.annualAllocation")
    if (method === "accrual") return t("leaveTypes.accrualBased")
    if (method === "manual") return t("leaveTypes.manualAssignment")
    return "-"
  }

  const resetForm = () => {
    setFormData({
      name_en: "",
      name_ka: "",
      code: "",
      description_en: "",
      description_ka: "",
      is_paid: true,
      requires_approval: true,
      calculation_method: "annual",
      default_days_per_year: "0",
      accrual_rate_per_month: "0",
      max_carry_forward_days: 0,
      carry_forward_expiry_months: 0,
      color: "#3B82F6",
      is_active: true,
      sort_order: 0,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t("leaveTypes.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("leaveTypes.description")}
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingType(null)
              resetForm()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("leaveTypes.newLeaveType")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingType ? t("leaveTypes.editLeaveType") : t("leaveTypes.createLeaveType")}
                </DialogTitle>
                <DialogDescription>
                  {t("leaveTypes.dialogDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name_en">{t("leaveTypes.nameEnglish")}</Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={(e) =>
                        setFormData({ ...formData, name_en: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name_ka">{t("leaveTypes.nameGeorgian")}</Label>
                    <Input
                      id="name_ka"
                      value={formData.name_ka}
                      onChange={(e) =>
                        setFormData({ ...formData, name_ka: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="code">{t("leaveTypes.code")}</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      placeholder={t("leaveTypes.codePlaceholder")}
                      maxLength={20}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="color">{t("leaveTypes.color")}</Label>
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="calculation_method">{t("leaveTypes.calculationMethod")}</Label>
                  <Select
                    value={formData.calculation_method}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        calculation_method: value as CalculationMethodEnum,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">{t("leaveTypes.annualAllocation")}</SelectItem>
                      <SelectItem value="accrual">{t("leaveTypes.accrualBased")}</SelectItem>
                      <SelectItem value="manual">{t("leaveTypes.manualAssignment")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.calculation_method === "annual" && (
                  <div className="grid gap-2">
                    <Label htmlFor="default_days_per_year">
                      {t("leaveTypes.defaultDaysPerYear")}
                    </Label>
                    <Input
                      id="default_days_per_year"
                      type="number"
                      step="0.5"
                      min="0.5"
                      required
                      value={formData.default_days_per_year}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          default_days_per_year: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                {formData.calculation_method === "accrual" && (
                  <div className="grid gap-2">
                    <Label htmlFor="accrual_rate_per_month">
                      {t("leaveTypes.accrualRatePerMonth")}
                    </Label>
                    <Input
                      id="accrual_rate_per_month"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={formData.accrual_rate_per_month}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          accrual_rate_per_month: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="max_carry_forward_days">
                      {t("leaveTypes.maxCarryForwardDays")}
                    </Label>
                    <Input
                      id="max_carry_forward_days"
                      type="number"
                      min="0"
                      value={formData.max_carry_forward_days}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_carry_forward_days: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="carry_forward_expiry_months">
                      {t("leaveTypes.carryForwardExpiryMonths")}
                    </Label>
                    <Input
                      id="carry_forward_expiry_months"
                      type="number"
                      min="0"
                      value={formData.carry_forward_expiry_months}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          carry_forward_expiry_months: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_paid"
                      checked={formData.is_paid}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_paid: checked })
                      }
                    />
                    <Label htmlFor="is_paid">{t("leaveTypes.paidLeave")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires_approval"
                      checked={formData.requires_approval}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, requires_approval: checked })
                      }
                    />
                    <Label htmlFor="requires_approval">{t("leaveTypes.requiresApproval")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                    <Label htmlFor="is_active">{t("leaveTypes.active")}</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingType(null)
                    resetForm()
                  }}
                >
                  {t("leaveTypes.cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingType ? t("leaveTypes.update") : t("leaveTypes.create")} {t("leaveTypes.leaveType")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("leaveTypes.cardTitle")}</CardTitle>
          <CardDescription>
            {t("leaveTypes.cardDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaveTypes.length === 0 ? (
            <div className="text-center py-12">
              <ListTree className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("leaveTypes.noLeaveTypes")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("leaveTypes.createFirstLeaveType")}
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("leaveTypes.createLeaveType")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("leaveTypes.tableName")}</TableHead>
                  <TableHead>{t("leaveTypes.tableCode")}</TableHead>
                  <TableHead>{t("leaveTypes.tableMethod")}</TableHead>
                  <TableHead>{t("leaveTypes.tableAnnualDays")}</TableHead>
                  <TableHead>{t("leaveTypes.tableCarryForward")}</TableHead>
                  <TableHead>{t("leaveTypes.tablePaid")}</TableHead>
                  <TableHead>{t("leaveTypes.tableApproval")}</TableHead>
                  <TableHead>{t("leaveTypes.tableStatus")}</TableHead>
                  <TableHead>{t("leaveTypes.tableActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: type.color || DEFAULT_COLOR }}
                        />
                        {typeName(type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{type.code}</Badge>
                    </TableCell>
                    <TableCell>{methodLabel(type.calculation_method)}</TableCell>
                    <TableCell>{type.default_days_per_year ?? "-"}</TableCell>
                    <TableCell>
                      {(type.max_carry_forward_days ?? 0) > 0
                        ? `${type.max_carry_forward_days} ${t("leaveTypes.days")}`
                        : t("leaveTypes.none")}
                    </TableCell>
                    <TableCell>
                      {type.is_paid ? (
                        <Badge variant="default">{t("leaveTypes.paid")}</Badge>
                      ) : (
                        <Badge variant="outline">{t("leaveTypes.unpaid")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {type.requires_approval ? t("leaveTypes.required") : t("leaveTypes.notRequired")}
                    </TableCell>
                    <TableCell>
                      {type.is_active ? (
                        <Badge variant="default">{t("leaveTypes.activeStatus")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("leaveTypes.inactiveStatus")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === type.id}
                          onClick={() => handleEdit(type)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === type.id}
                          onClick={() => handleDelete(type.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
