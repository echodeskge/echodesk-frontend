"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import axios from "@/api/axios"
import { leaveAdminSettingsList } from "@/api/generated/api"
import type { HrSettingsFields, PayrollMode } from "../../leave/_lib/hr-api"
import { MultiUserPicker, useLiteUsers } from "../../leave/_components/UserPicker"
import { getApiErrorMessage } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { AlertTriangle, CalendarDays, Loader2, RotateCw, Save } from "lucide-react"
import {
  FieldRow,
  LeaveBanner,
  LeaveLoading,
  LeavePageHeader,
  SectionCard,
  Segmented,
  leaveButton,
} from "../../leave/_components/ui"
import { settingsFingerprint } from "../../leave/_lib/lv04-utils"

interface LeaveSettings extends Partial<HrSettingsFields> {
  id: number
  require_manager_approval?: boolean
  require_hr_approval?: boolean
  allow_negative_balance?: boolean
  max_negative_days?: number
  working_days_per_week?: number
  weekend_days?: unknown
}

const DEFAULT_HR: HrSettingsFields = {
  substitutes_enabled: false,
  substitution_pay_enabled: false,
  payroll_enabled: false,
  payroll_self_view_enabled: false,
  kpi_enabled: false,
  attendance_grid_enabled: false,
  auto_georgian_holidays: false,
  block_deactivation_with_open_requests: true,
  payroll_mode: "gross",
  income_tax_rate: "20.00",
  pension_rate: "2.00",
  payroll_currency: "GEL",
  payroll_managers: [],
}

const HR_SWITCHES = [
  "substitutes_enabled",
  "substitution_pay_enabled",
  "payroll_enabled",
  "payroll_self_view_enabled",
  "kpi_enabled",
  "attendance_grid_enabled",
  "auto_georgian_holidays",
  "block_deactivation_with_open_requests",
] as const

// The API treats an empty `weekend_days` list as Saturday + Sunday.
const DEFAULT_WEEKEND_DAYS = [5, 6]

const DEFAULT_FORM = {
  require_manager_approval: true,
  require_hr_approval: false,
  allow_negative_balance: false,
  max_negative_days: 0,
  working_days_per_week: 5,
  weekend_days: DEFAULT_WEEKEND_DAYS,
}

/** 34px number input of the design settings rows (tabular). */
const numberInput =
  "h-[34px] w-20 rounded-md border border-input bg-background px-2.5 text-[13px] tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-foreground/10 disabled:cursor-not-allowed"

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const results = (data as { results?: unknown } | null | undefined)?.results
  return Array.isArray(results) ? (results as T[]) : []
}

export default function LeaveSettingsPage() {
  const t = useTranslations("leave")
  const queryClient = useQueryClient()
  const { users } = useLiteUsers()
  const [hr, setHr] = useState<HrSettingsFields>(DEFAULT_HR)
  const [settings, setSettings] = useState<LeaveSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // When loading fails we do not know whether a settings row exists, so
  // saving is blocked (creating a second row for the tenant is an error).
  const [loadFailed, setLoadFailed] = useState(false)
  const [formData, setFormData] = useState(DEFAULT_FORM)
  // Fingerprint of the last loaded/saved values, for the "unsaved changes" hint.
  const [baseline, setBaseline] = useState(() => settingsFingerprint(DEFAULT_FORM, DEFAULT_HR))

  const weekDays = [
    { value: 0, label: t("settings.monday") },
    { value: 1, label: t("settings.tuesday") },
    { value: 2, label: t("settings.wednesday") },
    { value: 3, label: t("settings.thursday") },
    { value: 4, label: t("settings.friday") },
    { value: 5, label: t("settings.saturday") },
    { value: 6, label: t("settings.sunday") },
  ]

  useEffect(() => {
    fetchSettings()
  }, [])

  const applySettings = (data: LeaveSettings) => {
    const weekendDays = Array.isArray(data.weekend_days)
      ? data.weekend_days.filter((day): day is number => typeof day === "number")
      : []
    const nextHr: HrSettingsFields = {
      ...DEFAULT_HR,
      ...Object.fromEntries(
        Object.entries(data).filter(([key, value]) => key in DEFAULT_HR && value !== undefined && value !== null)
      ),
    }
    const nextForm = {
      require_manager_approval: data.require_manager_approval ?? true,
      require_hr_approval: data.require_hr_approval ?? false,
      allow_negative_balance: data.allow_negative_balance ?? false,
      max_negative_days: data.max_negative_days ?? 0,
      working_days_per_week: data.working_days_per_week ?? 5,
      weekend_days: weekendDays.length > 0 ? weekendDays : DEFAULT_WEEKEND_DAYS,
    }
    setSettings(data)
    setHr(nextHr)
    setFormData(nextForm)
    setBaseline(settingsFingerprint(nextForm, nextHr))
  }

  const fetchSettings = async () => {
    try {
      // The settings endpoint is a list with at most one row per tenant.
      const response = await leaveAdminSettingsList()
      const existing = unwrapList<LeaveSettings>(response)[0]
      if (existing) applySettings(existing)
      setLoadFailed(false)
    } catch (error) {
      console.error("Failed to fetch settings:", error)
      setLoadFailed(true)
      toast.error(t("shared.loadFailed"), {
        description: getApiErrorMessage(error) || undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving || loadFailed) return
    setSaving(true)

    try {
      const payload = {
        require_manager_approval: formData.require_manager_approval,
        require_hr_approval: formData.require_hr_approval,
        allow_negative_balance: formData.allow_negative_balance,
        max_negative_days: Number.isFinite(formData.max_negative_days)
          ? formData.max_negative_days
          : 0,
        working_days_per_week: Number.isFinite(formData.working_days_per_week)
          ? formData.working_days_per_week
          : 5,
        weekend_days: [...formData.weekend_days].sort((a, b) => a - b),
        ...hr,
        payroll_currency: hr.payroll_currency.trim().toUpperCase(),
        income_tax_rate: hr.income_tax_rate.trim() || "0",
        pension_rate: hr.pension_rate.trim() || "0",
      }

      // No row yet for this tenant -> create it; otherwise update in place.
      // Direct calls: the generated client does not know the HR fields yet.
      const response = settings
        ? await axios.patch(`/api/leave/admin/settings/${settings.id}/`, payload)
        : await axios.post("/api/leave/admin/settings/", payload)
      applySettings(response.data as LeaveSettings)
      // The sidebar reads the HR switches from the profile.
      queryClient.invalidateQueries({ queryKey: ["userProfile"] })
      toast.success(t("settings.savedSuccess"))
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast.error(t("settings.savedError"), {
        description: getApiErrorMessage(error) || undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleWeekendDay = (day: number) => {
    setFormData((prev) => {
      const weekend_days = prev.weekend_days.includes(day)
        ? prev.weekend_days.filter((d) => d !== day)
        : [...prev.weekend_days, day]
      return { ...prev, weekend_days }
    })
  }

  const retryLoad = () => {
    setLoading(true)
    fetchSettings()
  }

  const dirty = settingsFingerprint(formData, hr) !== baseline

  if (loading) {
    return <LeaveLoading className="py-24" />
  }

  const showPayroll = hr.payroll_enabled || hr.substitution_pay_enabled

  return (
    <form onSubmit={handleSave} className="p-4 sm:p-6" data-testid="leave-settings-page">
      <div className="flex w-full min-w-0 max-w-[720px] flex-col gap-5">
        <LeavePageHeader icon={CalendarDays} title={t("settings.title")} description={t("settings.subtitle")} />

        {loadFailed && (
          <LeaveBanner
            tone="warning"
            icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
            action={
              <button type="button" onClick={retryLoad} className={leaveButton.outlineSm}>
                <RotateCw className="h-3.5 w-3.5" aria-hidden />
                {t("ui.retry")}
              </button>
            }
          >
            {t("lv04.loadFailedBanner")}
          </LeaveBanner>
        )}

        <SectionCard title={t("settings.approvalWorkflow")} hint={t("settings.approvalWorkflowDesc")} testId="leave-settings-approval">
          <FieldRow
            label={t("settings.requireManagerApproval")}
            help={t("settings.requireManagerApprovalDesc")}
            htmlFor="require_manager_approval"
          >
            <Switch
              id="require_manager_approval"
              checked={formData.require_manager_approval}
              onCheckedChange={(checked) => setFormData({ ...formData, require_manager_approval: checked })}
            />
          </FieldRow>
          <FieldRow
            label={t("settings.requireHrApproval")}
            help={t("settings.requireHrApprovalDesc")}
            htmlFor="require_hr_approval"
          >
            <Switch
              id="require_hr_approval"
              checked={formData.require_hr_approval}
              onCheckedChange={(checked) => setFormData({ ...formData, require_hr_approval: checked })}
            />
          </FieldRow>
        </SectionCard>

        <SectionCard title={t("settings.leaveBalance")} hint={t("settings.leaveBalanceDesc")} testId="leave-settings-balance">
          <FieldRow
            label={t("settings.allowNegativeBalance")}
            help={t("settings.allowNegativeBalanceDesc")}
            htmlFor="allow_negative_balance"
          >
            <Switch
              id="allow_negative_balance"
              checked={formData.allow_negative_balance}
              onCheckedChange={(checked) => setFormData({ ...formData, allow_negative_balance: checked })}
            />
          </FieldRow>
          <FieldRow
            label={t("settings.maxNegativeDays")}
            help={t("settings.maxNegativeDaysDesc")}
            htmlFor="max_negative_days"
            disabled={!formData.allow_negative_balance}
          >
            <input
              id="max_negative_days"
              type="number"
              min="0"
              className={numberInput}
              disabled={!formData.allow_negative_balance}
              value={Number.isNaN(formData.max_negative_days) ? "" : formData.max_negative_days}
              onChange={(e) => setFormData({ ...formData, max_negative_days: parseInt(e.target.value) })}
            />
          </FieldRow>
        </SectionCard>

        <SectionCard title={t("settings.workingDays")} hint={t("settings.workingDaysDesc")} testId="leave-settings-working">
          <FieldRow label={t("settings.workingDaysPerWeek")} htmlFor="working_days_per_week">
            <input
              id="working_days_per_week"
              type="number"
              min="1"
              max="7"
              className={numberInput}
              value={Number.isNaN(formData.working_days_per_week) ? "" : formData.working_days_per_week}
              onChange={(e) => setFormData({ ...formData, working_days_per_week: parseInt(e.target.value) })}
            />
          </FieldRow>
          <FieldRow label={t("settings.weekendDays")} help={t("settings.weekendDaysDesc")}>
            <div
              role="group"
              aria-label={t("settings.weekendDays")}
              className="grid w-full grid-cols-2 gap-x-4 gap-y-2 sm:w-auto sm:grid-cols-[repeat(2,minmax(120px,1fr))]"
            >
              {weekDays.map((day) => (
                <label
                  key={day.value}
                  htmlFor={`weekend-${day.value}`}
                  className="flex cursor-pointer items-center gap-2 text-[13px]"
                >
                  <Checkbox
                    id={`weekend-${day.value}`}
                    checked={formData.weekend_days.includes(day.value)}
                    onCheckedChange={() => toggleWeekendDay(day.value)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </FieldRow>
        </SectionCard>

        <SectionCard title={t("hr.settings.title")} hint={t("hr.settings.description")} testId="leave-settings-hr">
          {HR_SWITCHES.map((key) => {
            const disabled =
              (key === "substitution_pay_enabled" && !hr.substitutes_enabled) ||
              (key === "payroll_self_view_enabled" && !hr.payroll_enabled)
            const dependent = key === "substitution_pay_enabled" || key === "payroll_self_view_enabled"
            return (
              <FieldRow
                key={key}
                label={t(`hr.settings.${key}`)}
                help={t(`hr.settings.${key}_desc`)}
                htmlFor={key}
                disabled={disabled}
                className={cn(dependent && "sm:ps-8")}
              >
                <Switch
                  id={key}
                  checked={hr[key]}
                  disabled={disabled}
                  onCheckedChange={(checked) => setHr((prev) => ({ ...prev, [key]: checked }))}
                />
              </FieldRow>
            )
          })}
        </SectionCard>

        {showPayroll && (
          <SectionCard title={t("lv04.payrollSection")} hint={t("lv04.payrollHint")} testId="leave-settings-payroll">
            <FieldRow label={t("hr.settings.payroll_mode")} help={t("hr.settings.payroll_mode_desc")}>
              <Segmented
                size="md"
                ariaLabel={t("hr.settings.payroll_mode")}
                value={hr.payroll_mode}
                onChange={(value) => setHr((prev) => ({ ...prev, payroll_mode: value as PayrollMode }))}
                options={[
                  { value: "gross", label: t("hr.settings.mode_gross") },
                  { value: "net", label: t("hr.settings.mode_net") },
                ]}
                testId="leave-settings-payroll-mode"
              />
            </FieldRow>
            {hr.payroll_mode === "net" && (
              <>
                <FieldRow label={t("hr.settings.income_tax_rate")} htmlFor="income_tax_rate">
                  <input
                    id="income_tax_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className={numberInput}
                    value={hr.income_tax_rate}
                    onChange={(e) => setHr((prev) => ({ ...prev, income_tax_rate: e.target.value }))}
                  />
                </FieldRow>
                <FieldRow label={t("hr.settings.pension_rate")} htmlFor="pension_rate">
                  <input
                    id="pension_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className={numberInput}
                    value={hr.pension_rate}
                    onChange={(e) => setHr((prev) => ({ ...prev, pension_rate: e.target.value }))}
                  />
                </FieldRow>
              </>
            )}
            <FieldRow label={t("hr.settings.payroll_currency")} htmlFor="payroll_currency">
              <input
                id="payroll_currency"
                maxLength={3}
                className={cn(numberInput, "w-[120px] font-mono uppercase")}
                value={hr.payroll_currency}
                onChange={(e) =>
                  setHr((prev) => ({ ...prev, payroll_currency: e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase() }))
                }
              />
            </FieldRow>
            <FieldRow label={t("hr.settings.payroll_managers")} help={t("hr.settings.payroll_managers_desc")}>
              <div className="w-full sm:w-[260px]">
                <MultiUserPicker
                  users={users}
                  value={hr.payroll_managers}
                  onChange={(ids) => setHr((prev) => ({ ...prev, payroll_managers: ids }))}
                />
              </div>
            </FieldRow>
          </SectionCard>
        )}

        <div
          className="sticky bottom-4 z-10 max-md:me-12 flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] border bg-background/95 px-4 py-2 shadow-[0_4px_16px_rgb(0_0_0/0.08)] backdrop-blur"
          data-testid="leave-settings-savebar"
        >
          <span className={cn("min-w-0 flex-1 text-xs", dirty ? "text-foreground" : "text-muted-foreground")} aria-live="polite">
            {loadFailed ? "" : dirty ? t("lv04.unsaved") : t("lv04.allSaved")}
          </span>
          <button type="submit" className={leaveButton.primary} disabled={saving || loadFailed} data-testid="leave-settings-save">
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                {t("settings.saving")}
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" aria-hidden />
                {t("settings.saveSettings")}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
