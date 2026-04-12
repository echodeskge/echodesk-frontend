"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, Save } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface LeaveSettings {
  id: number
  require_manager_approval: boolean
  require_hr_approval: boolean
  allow_negative_balance: boolean
  max_negative_days: number
  working_days_per_week: number
  weekend_days: number[]
}

export default function LeaveSettingsPage() {
  const t = useTranslations("leave")
  const [settings, setSettings] = useState<LeaveSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    require_manager_approval: true,
    require_hr_approval: false,
    allow_negative_balance: false,
    max_negative_days: 0,
    working_days_per_week: 5,
    weekend_days: [5, 6],
  })

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

  const fetchSettings = async () => {
    try {
      // TODO: Replace with actual API call
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // TODO: Replace with actual API call
      alert(t("settings.savedSuccess"))
    } catch (error) {
      console.error("Failed to save settings:", error)
      alert(t("settings.savedError"))
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.approvalWorkflow")}</CardTitle>
            <CardDescription>{t("settings.approvalWorkflowDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
              <div className="space-y-0.5">
                <Label htmlFor="require_manager_approval">{t("settings.requireManagerApproval")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.requireManagerApprovalDesc")}</p>
              </div>
              <Switch
                id="require_manager_approval"
                checked={formData.require_manager_approval}
                onCheckedChange={(checked) => setFormData({ ...formData, require_manager_approval: checked })}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
              <div className="space-y-0.5">
                <Label htmlFor="require_hr_approval">{t("settings.requireHrApproval")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.requireHrApprovalDesc")}</p>
              </div>
              <Switch
                id="require_hr_approval"
                checked={formData.require_hr_approval}
                onCheckedChange={(checked) => setFormData({ ...formData, require_hr_approval: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.leaveBalance")}</CardTitle>
            <CardDescription>{t("settings.leaveBalanceDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
              <div className="space-y-0.5">
                <Label htmlFor="allow_negative_balance">{t("settings.allowNegativeBalance")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.allowNegativeBalanceDesc")}</p>
              </div>
              <Switch
                id="allow_negative_balance"
                checked={formData.allow_negative_balance}
                onCheckedChange={(checked) => setFormData({ ...formData, allow_negative_balance: checked })}
              />
            </div>

            {formData.allow_negative_balance && (
              <div className="grid gap-2">
                <Label htmlFor="max_negative_days">{t("settings.maxNegativeDays")}</Label>
                <Input
                  id="max_negative_days"
                  type="number"
                  min="0"
                  value={formData.max_negative_days}
                  onChange={(e) => setFormData({ ...formData, max_negative_days: parseInt(e.target.value) })}
                />
                <p className="text-sm text-muted-foreground">{t("settings.maxNegativeDaysDesc")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.workingDays")}</CardTitle>
            <CardDescription>{t("settings.workingDaysDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="working_days_per_week">{t("settings.workingDaysPerWeek")}</Label>
              <Input
                id="working_days_per_week"
                type="number"
                min="1"
                max="7"
                value={formData.working_days_per_week}
                onChange={(e) => setFormData({ ...formData, working_days_per_week: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-3">
              <Label>{t("settings.weekendDays")}</Label>
              <p className="text-sm text-muted-foreground">{t("settings.weekendDaysDesc")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {weekDays.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`weekend-${day.value}`}
                      checked={formData.weekend_days.includes(day.value)}
                      onCheckedChange={() => toggleWeekendDay(day.value)}
                    />
                    <Label htmlFor={`weekend-${day.value}`} className="font-normal cursor-pointer">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("settings.saving")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t("settings.saveSettings")}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
