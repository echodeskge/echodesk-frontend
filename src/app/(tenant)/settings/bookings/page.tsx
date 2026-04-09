"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Loader2, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import axios from "@/api/axios"

interface BookingSettings {
  id?: number
  require_deposit: boolean
  allow_cash_payment: boolean
  allow_card_payment: boolean
  bog_client_id: string
  bog_client_secret?: string
  bog_use_production: boolean
  cancellation_hours_before: number
  refund_policy: "full" | "partial_50" | "partial_25" | "no_refund"
  auto_confirm_on_deposit: boolean
  auto_confirm_on_full_payment: boolean
  min_hours_before_booking: number
  max_days_advance_booking: number
}

export default function SettingsPage() {
  const t = useTranslations("bookingSettings")
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [settings, setSettings] = useState<BookingSettings>({
    require_deposit: false,
    allow_cash_payment: true,
    allow_card_payment: true,
    bog_client_id: "",
    bog_client_secret: "",
    bog_use_production: false,
    cancellation_hours_before: 24,
    refund_policy: "full",
    auto_confirm_on_deposit: true,
    auto_confirm_on_full_payment: true,
    min_hours_before_booking: 2,
    max_days_advance_booking: 60,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/bookings/admin/settings/")
      setSettings({
        ...response.data,
        bog_client_secret: "", // Don't show existing secret
      })
    } catch (error) {
      console.error("Failed to fetch settings:", error)
      // Settings might not exist yet, use defaults
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const dataToSend = { ...settings }
      // Only send bog_client_secret if it was changed
      if (!dataToSend.bog_client_secret) {
        delete dataToSend.bog_client_secret
      }

      if (settings.id) {
        await axios.patch("/api/bookings/admin/settings/", dataToSend)
      } else {
        await axios.put("/api/bookings/admin/settings/", dataToSend)
      }
      toast({ title: t("success"), description: t("settingsSaved") })
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast({ title: t("error"), description: t("settingsSaveFailed"), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("paymentSettings.title")}</CardTitle>
            <CardDescription>{t("paymentSettings.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("paymentSettings.requireDeposit")}</Label>
                <p className="text-sm text-muted-foreground">{t("paymentSettings.requireDepositDesc")}</p>
              </div>
              <Switch
                checked={settings.require_deposit}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, require_deposit: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("paymentSettings.allowCash")}</Label>
                <p className="text-sm text-muted-foreground">{t("paymentSettings.allowCashDesc")}</p>
              </div>
              <Switch
                checked={settings.allow_cash_payment}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allow_cash_payment: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("paymentSettings.allowCard")}</Label>
                <p className="text-sm text-muted-foreground">{t("paymentSettings.allowCardDesc")}</p>
              </div>
              <Switch
                checked={settings.allow_card_payment}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allow_card_payment: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {settings.allow_card_payment && (
          <Card>
            <CardHeader>
              <CardTitle>{t("bogSettings.title")}</CardTitle>
              <CardDescription>{t("bogSettings.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="bog_client_id">{t("bogSettings.clientId")}</Label>
                <Input
                  id="bog_client_id"
                  value={settings.bog_client_id}
                  onChange={(e) =>
                    setSettings({ ...settings, bog_client_id: e.target.value })
                  }
                  placeholder={t("bogSettings.clientIdPlaceholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bog_client_secret">{t("bogSettings.clientSecret")}</Label>
                <div className="relative">
                  <Input
                    id="bog_client_secret"
                    type={showSecret ? "text" : "password"}
                    value={settings.bog_client_secret || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, bog_client_secret: e.target.value })
                    }
                    placeholder={t("bogSettings.clientSecretPlaceholder")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{t("bogSettings.clientSecretHelp")}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("bogSettings.productionMode")}</Label>
                  <p className="text-sm text-muted-foreground">{t("bogSettings.productionModeDesc")}</p>
                </div>
                <Switch
                  checked={settings.bog_use_production}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, bog_use_production: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("bookingRules.title")}</CardTitle>
            <CardDescription>{t("bookingRules.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="min_hours">{t("bookingRules.minHours")}</Label>
              <Input
                id="min_hours"
                type="number"
                min="0"
                value={settings.min_hours_before_booking}
                onChange={(e) =>
                  setSettings({ ...settings, min_hours_before_booking: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-sm text-muted-foreground">{t("bookingRules.minHoursDesc")}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="max_days">{t("bookingRules.maxDays")}</Label>
              <Input
                id="max_days"
                type="number"
                min="1"
                value={settings.max_days_advance_booking}
                onChange={(e) =>
                  setSettings({ ...settings, max_days_advance_booking: parseInt(e.target.value) || 1 })
                }
              />
              <p className="text-sm text-muted-foreground">{t("bookingRules.maxDaysDesc")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("cancellation.title")}</CardTitle>
            <CardDescription>{t("cancellation.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="cancellation_hours">{t("cancellation.hours")}</Label>
              <Input
                id="cancellation_hours"
                type="number"
                min="0"
                value={settings.cancellation_hours_before}
                onChange={(e) =>
                  setSettings({ ...settings, cancellation_hours_before: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-sm text-muted-foreground">{t("cancellation.hoursDesc")}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="refund_policy">{t("cancellation.refundPolicy")}</Label>
              <Select
                value={settings.refund_policy}
                onValueChange={(value) =>
                  setSettings({ ...settings, refund_policy: value as BookingSettings["refund_policy"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">{t("cancellation.refundFull")}</SelectItem>
                  <SelectItem value="partial_50">{t("cancellation.refund50")}</SelectItem>
                  <SelectItem value="partial_25">{t("cancellation.refund25")}</SelectItem>
                  <SelectItem value="no_refund">{t("cancellation.noRefund")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{t("cancellation.refundPolicyDesc")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("autoConfirm.title")}</CardTitle>
            <CardDescription>{t("autoConfirm.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("autoConfirm.onDeposit")}</Label>
                <p className="text-sm text-muted-foreground">{t("autoConfirm.onDepositDesc")}</p>
              </div>
              <Switch
                checked={settings.auto_confirm_on_deposit}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_confirm_on_deposit: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("autoConfirm.onFullPayment")}</Label>
                <p className="text-sm text-muted-foreground">{t("autoConfirm.onFullPaymentDesc")}</p>
              </div>
              <Switch
                checked={settings.auto_confirm_on_full_payment}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_confirm_on_full_payment: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {t("saveSettings")}
          </Button>
        </div>
      </div>
    </div>
  )
}
