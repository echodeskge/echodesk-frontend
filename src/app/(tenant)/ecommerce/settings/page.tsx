"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Store, Settings, Eye, EyeOff, CheckCircle2, AlertCircle, Link2 } from "lucide-react"
import * as api from "@/api/generated/api"
import type { EcommerceSettings as EcommerceSettingsType } from "@/api/generated/interfaces"

interface EcommerceSettings {
  id?: number
  bog_client_id: string
  bog_use_production: boolean
  bog_return_url_success: string
  bog_return_url_fail: string
  enable_cash_on_delivery: boolean
  enable_card_payment: boolean
  store_name: string
  store_email: string
  store_phone: string
}

export default function EcommerceSettingsPage() {
  const t = useTranslations("ecommerceSettings")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [settings, setSettings] = useState<EcommerceSettings>({
    bog_client_id: "",
    bog_use_production: false,
    bog_return_url_success: "",
    bog_return_url_fail: "",
    enable_cash_on_delivery: true,
    enable_card_payment: true,
    store_name: "",
    store_email: "",
    store_phone: "",
  })
  const [bogSecret, setBogSecret] = useState("")
  const [hasExistingCredentials, setHasExistingCredentials] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await api.ecommerceAdminSettingsList()

      if (response.results && response.results.length > 0) {
        const settingsData = response.results[0]
        setSettings({
          id: settingsData.id,
          bog_client_id: settingsData.bog_client_id || "",
          bog_use_production: settingsData.bog_use_production || false,
          bog_return_url_success: settingsData.bog_return_url_success || "",
          bog_return_url_fail: settingsData.bog_return_url_fail || "",
          enable_cash_on_delivery: settingsData.enable_cash_on_delivery ?? true,
          enable_card_payment: settingsData.enable_card_payment ?? true,
          store_name: settingsData.store_name || "",
          store_email: settingsData.store_email || "",
          store_phone: settingsData.store_phone || "",
        })
        setHasExistingCredentials(!!settingsData.bog_client_id)
      }
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch settings:", error)
      alert("Failed to load ecommerce settings")
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const payload: any = {
        bog_client_id: settings.bog_client_id,
        bog_use_production: settings.bog_use_production,
        bog_return_url_success: settings.bog_return_url_success,
        bog_return_url_fail: settings.bog_return_url_fail,
        enable_cash_on_delivery: settings.enable_cash_on_delivery,
        enable_card_payment: settings.enable_card_payment,
        store_name: settings.store_name,
        store_email: settings.store_email,
        store_phone: settings.store_phone,
        ...(bogSecret && { bog_client_secret: bogSecret }),
      }

      if (settings.id) {
        // Update existing settings
        await api.ecommerceAdminSettingsPartialUpdate(String(settings.id), payload)
      } else {
        // Create new settings
        await api.ecommerceAdminSettingsCreate(payload)
      }

      alert("Settings saved successfully!")

      // If secret was provided, mark as having credentials
      if (bogSecret) {
        setHasExistingCredentials(true)
        setBogSecret("") // Clear the input after saving
      }

      // Refresh settings
      await fetchSettings()
    } catch (error) {
      console.error("Failed to save settings:", error)
      alert("Failed to save settings. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Ecommerce Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your online store and payment gateway settings
        </p>
      </div>

      {/* Store Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            <CardTitle>Store Information</CardTitle>
          </div>
          <CardDescription>
            Basic information about your online store
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store_name">Store Name</Label>
              <Input
                id="store_name"
                value={settings.store_name}
                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                placeholder="My Online Store"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_email">Store Email</Label>
              <Input
                id="store_email"
                type="email"
                value={settings.store_email}
                onChange={(e) => setSettings({ ...settings, store_email: e.target.value })}
                placeholder="store@example.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="store_phone">Store Phone</Label>
            <Input
              id="store_phone"
              value={settings.store_phone}
              onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
              placeholder="+995 555 123 456"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Gateway Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Bank of Georgia Payment Gateway</CardTitle>
          </div>
          <CardDescription>
            Configure BOG payment gateway for card payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credentials Status */}
          {hasExistingCredentials && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800">
                BOG credentials are configured. Update fields below to change them.
              </p>
            </div>
          )}

          {!hasExistingCredentials && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                No BOG credentials configured. The system will use test environment with default credentials.
              </p>
            </div>
          )}

          {/* Client ID */}
          <div className="space-y-2">
            <Label htmlFor="bog_client_id">
              BOG Client ID
              <span className="text-muted-foreground text-sm ml-2">(Required for production)</span>
            </Label>
            <Input
              id="bog_client_id"
              value={settings.bog_client_id}
              onChange={(e) => setSettings({ ...settings, bog_client_id: e.target.value })}
              placeholder="your-bog-client-id"
            />
            <p className="text-xs text-muted-foreground">
              You can get this from your Bank of Georgia merchant account
            </p>
          </div>

          {/* Client Secret */}
          <div className="space-y-2">
            <Label htmlFor="bog_client_secret">
              BOG Client Secret
              <span className="text-muted-foreground text-sm ml-2">(Encrypted)</span>
            </Label>
            <div className="relative">
              <Input
                id="bog_client_secret"
                type={showSecret ? "text" : "password"}
                value={bogSecret}
                onChange={(e) => setBogSecret(e.target.value)}
                placeholder={hasExistingCredentials ? "••••••••••••••••" : "your-bog-client-secret"}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {hasExistingCredentials
                ? "Leave empty to keep existing secret. Enter new value to update."
                : "Your secret will be encrypted before storing"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Return URLs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            <CardTitle>Payment Return URLs</CardTitle>
          </div>
          <CardDescription>
            Configure where customers are redirected after payment completion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bog_return_url_success">
              Success Return URL
              {settings.enable_card_payment && <span className="text-red-500 ml-1">*</span>}
              <span className="text-muted-foreground text-sm ml-2">(After successful payment)</span>
            </Label>
            <Input
              id="bog_return_url_success"
              type="url"
              value={settings.bog_return_url_success}
              onChange={(e) => setSettings({ ...settings, bog_return_url_success: e.target.value })}
              placeholder="https://yourstore.com/payment/success"
              required={settings.enable_card_payment}
            />
            <p className="text-xs text-muted-foreground">
              Customers will be redirected here after a successful payment
              {settings.enable_card_payment && " (Required when card payment is enabled)"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bog_return_url_fail">
              Failure Return URL
              {settings.enable_card_payment && <span className="text-red-500 ml-1">*</span>}
              <span className="text-muted-foreground text-sm ml-2">(After failed payment)</span>
            </Label>
            <Input
              id="bog_return_url_fail"
              type="url"
              value={settings.bog_return_url_fail}
              onChange={(e) => setSettings({ ...settings, bog_return_url_fail: e.target.value })}
              placeholder="https://yourstore.com/payment/failed"
              required={settings.enable_card_payment}
            />
            <p className="text-xs text-muted-foreground">
              Customers will be redirected here if the payment fails
              {settings.enable_card_payment && " (Required when card payment is enabled)"}
            </p>
          </div>

          {(!settings.bog_return_url_success || !settings.bog_return_url_fail) && settings.enable_card_payment && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800">
                Return URLs are required when card payment is enabled. Customers will be redirected to these URLs after payment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Production Mode Toggle - Only shown when tenant has custom credentials */}
      {hasExistingCredentials && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Environment Configuration</CardTitle>
            </div>
            <CardDescription>
              Configure BOG API environment for your custom credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="bog_use_production">Production Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Use production BOG API (uncheck for test environment)
                </p>
              </div>
              <Switch
                id="bog_use_production"
                checked={settings.bog_use_production}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, bog_use_production: checked })
                }
              />
            </div>

            {settings.bog_use_production && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-800">
                  Production mode enabled. Ensure your BOG credentials are valid for production use.
                </p>
              </div>
            )}

            {!settings.bog_use_production && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Test mode enabled. Payments will use BOG test environment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Payment Methods</CardTitle>
          </div>
          <CardDescription>
            Enable or disable payment methods for your store
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="card_payment">Card Payments (BOG)</Label>
              <p className="text-sm text-muted-foreground">
                Accept card payments through Bank of Georgia
              </p>
            </div>
            <Switch
              id="card_payment"
              checked={settings.enable_card_payment}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enable_card_payment: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="cash_on_delivery">Cash on Delivery</Label>
              <p className="text-sm text-muted-foreground">
                Allow customers to pay upon delivery
              </p>
            </div>
            <Switch
              id="cash_on_delivery"
              checked={settings.enable_cash_on_delivery}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enable_cash_on_delivery: checked })
              }
            />
          </div>

          {!settings.enable_card_payment && !settings.enable_cash_on_delivery && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                At least one payment method should be enabled
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || (!settings.enable_card_payment && !settings.enable_cash_on_delivery)}
          size="lg"
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  )
}
