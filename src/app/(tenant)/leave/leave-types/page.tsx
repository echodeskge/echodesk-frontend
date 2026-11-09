"use client"

import { useState, useEffect } from "react"
import { isForbidden } from "../_lib/lv02-utils"
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
import { Plus, Pencil, Trash2, Loader2, ListTree } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  LeaveEmptyState,
  LeaveHeaderBridge,
  LeavePage,
  LeavePageHeader,
  LeaveTable,
  LeaveTypeChip,
  TonePill,
  formatDays,
  leaveButton,
  parseDays,
  type LeaveColumn,
} from "../_components/ui"
import { DialogField, DialogGroup, SwitchList, SwitchRow, dialogControl } from "../_components/lv04/dialog-fields"

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
  requires_substitutes?: boolean
  max_requests_per_month?: number | null
  max_days_per_request?: string | null
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
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  // A failed list load shows the error state (with retry) instead of an empty table.
  const [loadError, setLoadError] = useState<unknown>(null)
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
    requires_substitutes: false,
    max_requests_per_month: "",
    max_days_per_request: "",
  })

  useEffect(() => {
    fetchLeaveTypes()
  }, [])

  const fetchLeaveTypes = async () => {
    try {
      // Positional: (calculationMethod, isActive, lang, ordering, page, pageSize, requiresApproval, search)
      const response = await leaveAdminLeaveTypesList(undefined, undefined, undefined, undefined, undefined, 100)
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
      setLoadError(null)

      if (detailFailure) {
        console.error("Failed to fetch leave type details:", detailFailure)
        toast.error(t("shared.loadFailed"), {
          description: getApiErrorMessage(detailFailure) || undefined,
        })
      }
    } catch (error) {
      console.error("Failed to fetch leave types:", error)
      setLeaveTypes([])
      setLoadError(error)
      // A 403 already shows the translated "no access" state; the API reason is often English.
      if (!isForbidden(error)) {
        toast.error(t("shared.loadFailed"), {
          description: getApiErrorMessage(error) || undefined,
        })
      }
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
        requires_substitutes: formData.requires_substitutes,
        // Empty = no limit (null).
        max_requests_per_month: formData.max_requests_per_month.trim()
          ? Number(formData.max_requests_per_month)
          : null,
        max_days_per_request: formData.max_days_per_request.trim() || null,
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
      requires_substitutes: leaveType.requires_substitutes ?? false,
      max_requests_per_month:
        leaveType.max_requests_per_month == null ? "" : String(leaveType.max_requests_per_month),
      max_days_per_request: leaveType.max_days_per_request ?? "",
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
      requires_substitutes: false,
      max_requests_per_month: "",
      max_days_per_request: "",
    })
  }

  const retry = () => {
    setLoading(true)
    setLoadError(null)
    fetchLeaveTypes()
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingType(null)
    resetForm()
  }

  const openCreate = () => {
    setEditingType(null)
    resetForm()
    setIsDialogOpen(true)
  }

  const daysLabel = (value: string | number | null | undefined) => {
    const n = parseDays(value)
    return n === null ? "—" : t("ui.days", { count: Number(formatDays(n)) })
  }

  const columns: LeaveColumn<LeaveType>[] = [
    {
      id: "name",
      header: t("leaveTypes.tableName"),
      width: "minmax(0,1.6fr)",
      mobile: "title",
      cell: (type) => (
        <span className="flex min-w-0 items-center gap-2">
          <LeaveTypeChip name={typeName(type)} color={type.color || DEFAULT_COLOR} className="font-medium" />
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground" data-testid="leave-type-code">
            {type.code}
          </span>
        </span>
      ),
    },
    {
      id: "method",
      header: t("leaveTypes.tableMethod"),
      width: "minmax(0,1fr)",
      mobile: "meta",
      cell: (type) => <span className="truncate">{methodLabel(type.calculation_method)}</span>,
    },
    {
      id: "days",
      header: t("leaveTypes.tableAnnualDays"),
      width: "112px",
      align: "end",
      mobile: "meta",
      cell: (type) => (
        <>
          <span className="hidden font-mono text-xs tabular-nums @3xl:inline">{formatDays(type.default_days_per_year)}</span>
          <span className="tabular-nums @3xl:hidden">{daysLabel(type.default_days_per_year)}</span>
        </>
      ),
    },
    {
      id: "carry",
      header: t("leaveTypes.tableCarryForward"),
      width: "112px",
      mobile: "hidden",
      muted: true,
      cell: (type) =>
        (type.max_carry_forward_days ?? 0) > 0 ? (
          <span className="tabular-nums">{daysLabel(type.max_carry_forward_days)}</span>
        ) : (
          t("leaveTypes.none")
        ),
    },
    {
      id: "paid",
      header: t("leaveTypes.tablePaid"),
      width: "128px",
      mobile: "meta",
      cell: (type) =>
        type.is_paid ? (
          <TonePill tone="success">{t("leaveTypes.paid")}</TonePill>
        ) : (
          <TonePill tone="neutral">{t("leaveTypes.unpaid")}</TonePill>
        ),
    },
    {
      id: "approval",
      header: t("leaveTypes.tableApproval"),
      width: "124px",
      mobile: "hidden",
      cell: (type) =>
        type.requires_approval ? (
          <TonePill tone="info">{t("leaveTypes.required")}</TonePill>
        ) : (
          <TonePill tone="neutral">{t("leaveTypes.notRequired")}</TonePill>
        ),
    },
    {
      id: "status",
      header: t("leaveTypes.tableStatus"),
      width: "104px",
      mobile: "end",
      cell: (type) =>
        type.is_active ? (
          <TonePill tone="success" dot>
            {t("leaveTypes.activeStatus")}
          </TonePill>
        ) : (
          <TonePill tone="neutral" dot>
            {t("leaveTypes.inactiveStatus")}
          </TonePill>
        ),
    },
    {
      id: "actions",
      header: <span className="sr-only">{t("leaveTypes.tableActions")}</span>,
      width: "60px",
      align: "end",
      mobile: "end",
      cell: (type) => {
        const name = typeName(type)
        return (
          <span className="flex items-center gap-0.5">
            <button
              type="button"
              className={leaveButton.ghostIconSm}
              disabled={busyId === type.id}
              onClick={() => handleEdit(type)}
              aria-label={t("lv04.editType", { name })}
              title={t("hr.common.edit")}
              data-testid="leave-type-edit"
            >
              {busyId === type.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              className={cn(leaveButton.ghostIconSm, "hover:bg-destructive/10 hover:text-destructive")}
              disabled={busyId === type.id}
              onClick={() => handleDelete(type.id)}
              aria-label={t("lv04.deleteType", { name })}
              title={t("hr.common.delete")}
              data-testid="leave-type-delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
        )
      },
    },
  ]

  const loaded = !loading && !loadError
  // Non-admins get a 403 and the "no access" state: don't offer a create that can only fail.
  const canCreate = !isForbidden(loadError)
  const newLabel = t("leaveTypes.newLeaveType")

  return (
    <>
      <LeaveHeaderBridge
        sub={loaded ? t("lv04.typesCount", { count: leaveTypes.length }) : null}
        // The page header carries the button on wider screens.
        primary={isMobile && canCreate ? { label: newLabel, icon: Plus, onClick: openCreate, testId: "leave-types-new-header" } : null}
      />
      <LeavePage width="wide" testId="leave-types-page">
        <LeavePageHeader
          icon={ListTree}
          title={t("leaveTypes.title")}
          description={t("leaveTypes.description")}
          action={
            canCreate ? (
              <button
                type="button"
                onClick={openCreate}
                className={cn(leaveButton.primary, "hidden md:inline-flex")}
                data-testid="leave-types-new"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {newLabel}
              </button>
            ) : null
          }
        />

        <LeaveTable
          variant="card"
          ariaLabel={t("leaveTypes.cardTitle")}
          columns={columns}
          rows={loading ? undefined : leaveTypes}
          rowKey={(type) => type.id}
          onRowClick={(type) => {
            if (busyId !== type.id) handleEdit(type)
          }}
          error={loadError}
          onRetry={retry}
          skeletonRows={5}
          testId="leave-types-table"
          empty={
            <LeaveEmptyState
              icon={ListTree}
              title={t("leaveTypes.noLeaveTypes")}
              description={t("leaveTypes.createFirstLeaveType")}
              action={
                <button type="button" onClick={openCreate} className={leaveButton.primary}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {t("leaveTypes.createLeaveType")}
                </button>
              }
            />
          }
          footer={
            loaded && leaveTypes.length > 0 ? (
              <span className="truncate">
                {t("lv04.typesCount", { count: leaveTypes.length })} · {t("lv04.clickToEdit")}
              </span>
            ) : undefined
          }
        />
      </LeavePage>

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
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-[600px]" data-testid="leave-type-dialog">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="border-b px-5 py-4 text-start">
              <DialogTitle className="text-base">
                {editingType ? t("leaveTypes.editLeaveType") : t("leaveTypes.createLeaveType")}
              </DialogTitle>
              <DialogDescription className="text-[13px]">{t("leaveTypes.dialogDescription")}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-5 px-5 py-4">
              <DialogGroup>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DialogField label={t("leaveTypes.nameEnglish")} htmlFor="name_en">
                    <Input
                      id="name_en"
                      className={dialogControl}
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      required
                    />
                  </DialogField>
                  <DialogField label={t("leaveTypes.nameGeorgian")} htmlFor="name_ka">
                    <Input
                      id="name_ka"
                      className={dialogControl}
                      value={formData.name_ka}
                      onChange={(e) => setFormData({ ...formData, name_ka: e.target.value })}
                      required
                    />
                  </DialogField>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
                  <DialogField label={t("leaveTypes.code")} htmlFor="code">
                    <Input
                      id="code"
                      className={cn(dialogControl, "font-mono")}
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder={t("leaveTypes.codePlaceholder")}
                      maxLength={20}
                      required
                    />
                  </DialogField>
                  <DialogField label={t("leaveTypes.color")} htmlFor="color">
                    <Input
                      id="color"
                      type="color"
                      className={cn(dialogControl, "cursor-pointer p-1")}
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                  </DialogField>
                </div>
              </DialogGroup>

              <DialogGroup title={t("lv04.allocation")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DialogField label={t("leaveTypes.calculationMethod")} htmlFor="calculation_method">
                    <Select
                      value={formData.calculation_method}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          calculation_method: value as CalculationMethodEnum,
                        })
                      }
                    >
                      <SelectTrigger id="calculation_method" className={cn(dialogControl, "w-full")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">{t("leaveTypes.annualAllocation")}</SelectItem>
                        <SelectItem value="accrual">{t("leaveTypes.accrualBased")}</SelectItem>
                        <SelectItem value="manual">{t("leaveTypes.manualAssignment")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </DialogField>

                  {formData.calculation_method === "annual" && (
                    <DialogField label={t("leaveTypes.defaultDaysPerYear")} htmlFor="default_days_per_year">
                      <Input
                        id="default_days_per_year"
                        type="number"
                        step="0.5"
                        min="0.5"
                        required
                        className={cn(dialogControl, "tabular-nums")}
                        value={formData.default_days_per_year}
                        onChange={(e) => setFormData({ ...formData, default_days_per_year: e.target.value })}
                      />
                    </DialogField>
                  )}

                  {formData.calculation_method === "accrual" && (
                    <DialogField label={t("leaveTypes.accrualRatePerMonth")} htmlFor="accrual_rate_per_month">
                      <Input
                        id="accrual_rate_per_month"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        className={cn(dialogControl, "tabular-nums")}
                        value={formData.accrual_rate_per_month}
                        onChange={(e) => setFormData({ ...formData, accrual_rate_per_month: e.target.value })}
                      />
                    </DialogField>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DialogField label={t("leaveTypes.maxCarryForwardDays")} htmlFor="max_carry_forward_days">
                    <Input
                      id="max_carry_forward_days"
                      type="number"
                      min="0"
                      className={cn(dialogControl, "tabular-nums")}
                      value={formData.max_carry_forward_days}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_carry_forward_days: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </DialogField>
                  <DialogField label={t("leaveTypes.carryForwardExpiryMonths")} htmlFor="carry_forward_expiry_months">
                    <Input
                      id="carry_forward_expiry_months"
                      type="number"
                      min="0"
                      className={cn(dialogControl, "tabular-nums")}
                      value={formData.carry_forward_expiry_months}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          carry_forward_expiry_months: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </DialogField>
                </div>
              </DialogGroup>

              <DialogGroup title={t("lv04.rules")}>
                <SwitchList>
                  <SwitchRow
                    id="is_paid"
                    label={t("leaveTypes.paidLeave")}
                    checked={formData.is_paid}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked })}
                  />
                  <SwitchRow
                    id="requires_approval"
                    label={t("leaveTypes.requiresApproval")}
                    checked={formData.requires_approval}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_approval: checked })}
                  />
                  <SwitchRow
                    id="requires_substitutes"
                    label={t("hr.leaveTypes.requiresSubstitutes")}
                    help={t("hr.leaveTypes.requiresSubstitutesDesc")}
                    checked={formData.requires_substitutes}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_substitutes: checked })}
                  />
                  <SwitchRow
                    id="is_active"
                    label={t("leaveTypes.active")}
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </SwitchList>
              </DialogGroup>

              <DialogGroup title={t("lv04.limits")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DialogField label={t("hr.leaveTypes.maxRequestsPerMonth")} htmlFor="max_requests_per_month">
                    <Input
                      id="max_requests_per_month"
                      type="number"
                      min="1"
                      step="1"
                      className={cn(dialogControl, "tabular-nums")}
                      placeholder={t("hr.leaveTypes.noLimit")}
                      value={formData.max_requests_per_month}
                      onChange={(e) => setFormData({ ...formData, max_requests_per_month: e.target.value })}
                    />
                  </DialogField>
                  <DialogField label={t("hr.leaveTypes.maxDaysPerRequest")} htmlFor="max_days_per_request">
                    <Input
                      id="max_days_per_request"
                      type="number"
                      min="0.5"
                      step="0.5"
                      className={cn(dialogControl, "tabular-nums")}
                      placeholder={t("hr.leaveTypes.noLimit")}
                      value={formData.max_days_per_request}
                      onChange={(e) => setFormData({ ...formData, max_days_per_request: e.target.value })}
                    />
                  </DialogField>
                </div>
                <p className="text-xs text-muted-foreground">{t("hr.leaveTypes.limitsHint")}</p>
              </DialogGroup>
            </div>

            <DialogFooter className="sticky bottom-0 gap-2 border-t bg-background px-5 py-3">
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={closeDialog}>
                {t("leaveTypes.cancel")}
              </Button>
              <Button type="submit" size="sm" className="h-8" disabled={submitting} data-testid="leave-type-submit">
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingType ? t("leaveTypes.update") : t("leaveTypes.create")} {t("leaveTypes.leaveType")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
