"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { CreditCard, Store, Eye, EyeOff, CheckCircle2, AlertCircle, Globe, Rocket, RefreshCw, ExternalLink, Loader2, Trash2, Plus, X, RefreshCcw, Copy, Check } from "lucide-react"
import { ecommerceAdminSettingsList, ecommerceAdminSettingsDeployFrontendCreate, ecommerceAdminSettingsPartialUpdate, ecommerceAdminSettingsCreate, ecommerceAdminSettingsDeleteDeploymentDestroy } from "@/api/generated/api"
import type { EcommerceSettings as EcommerceSettingsType, EcommerceSettingsRequest, DeploymentResponse } from "@/api/generated/interfaces"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import axios from "@/api/axios"

interface DomainInfo {
  name: string
  verified: boolean
  verification: any[]
}

interface DnsInstruction {
  type: string
  name: string
  value: string
  description: string
}

type PaymentProvider = "bog" | "tbc" | "flitt" | "paddle" | "cash"

interface EcommerceSettings {
  id?: number
  bog_client_id: string
  bog_use_production: boolean
  bog_return_url_success: string
  bog_return_url_fail: string
  enable_cash_on_delivery: boolean
  enable_card_payment: boolean
  active_payment_providers: PaymentProvider[]
  tbc_client_id: string
  tbc_client_secret: string
  tbc_api_key: string
  tbc_use_production: boolean
  flitt_merchant_id: string
  flitt_password: string
  paddle_api_key: string
  paddle_client_token: string
  paddle_webhook_secret: string
  paddle_use_production: boolean
  store_name: string
  store_email: string
  store_phone: string
}

interface DeploymentInfo {
  frontend_url: string | null
  deployment_status: "pending" | "deploying" | "deployed" | "failed"
  vercel_project_id: string | null
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "••••••••••••••••"}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3"
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  )
}

export default function EcommerceSettingsPage() {
  const t = useTranslations("ecommerceSettings")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [domains, setDomains] = useState<DomainInfo[]>([])
  const [newDomain, setNewDomain] = useState("")
  const [addingDomain, setAddingDomain] = useState(false)
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null)
  const [removingDomain, setRemovingDomain] = useState<string | null>(null)
  const [dnsInstructions, setDnsInstructions] = useState<DnsInstruction[]>([])
  const [copiedValue, setCopiedValue] = useState<string | null>(null)
  const [settings, setSettings] = useState<EcommerceSettings>({
    bog_client_id: "",
    bog_use_production: false,
    bog_return_url_success: "",
    bog_return_url_fail: "",
    enable_cash_on_delivery: true,
    enable_card_payment: true,
    active_payment_providers: ["bog", "cash"],
    tbc_client_id: "",
    tbc_client_secret: "",
    tbc_api_key: "",
    tbc_use_production: false,
    flitt_merchant_id: "",
    flitt_password: "",
    paddle_api_key: "",
    paddle_client_token: "",
    paddle_webhook_secret: "",
    paddle_use_production: false,
    store_name: "",
    store_email: "",
    store_phone: "",
  })
  const [bogSecret, setBogSecret] = useState("")
  const [hasExistingCredentials, setHasExistingCredentials] = useState(false)
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo>({
    frontend_url: null,
    deployment_status: "pending",
    vercel_project_id: null,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await ecommerceAdminSettingsList()

      if (response.results && response.results.length > 0) {
        // TODO: bog_use_production is not in the generated EcommerceSettings type — fix backend serializer and regenerate
        const settingsData = response.results[0] as EcommerceSettingsType & { bog_use_production?: boolean }

        // Build active_payment_providers from data or derive from legacy fields
        let activeProviders: PaymentProvider[] = settingsData.active_payment_providers || []
        if (activeProviders.length === 0) {
          // Derive from legacy fields for backward compatibility
          if (settingsData.enable_card_payment) activeProviders.push("bog")
          if (settingsData.enable_cash_on_delivery) activeProviders.push("cash")
        }

        setSettings({
          id: settingsData.id,
          bog_client_id: settingsData.bog_client_id || "",
          bog_use_production: settingsData.bog_use_production || false,
          bog_return_url_success: settingsData.bog_return_url_success || "",
          bog_return_url_fail: settingsData.bog_return_url_fail || "",
          enable_cash_on_delivery: settingsData.enable_cash_on_delivery ?? true,
          enable_card_payment: settingsData.enable_card_payment ?? true,
          active_payment_providers: activeProviders,
          tbc_client_id: settingsData.tbc_client_id || "",
          tbc_client_secret: "",
          tbc_api_key: settingsData.tbc_api_key || "",
          tbc_use_production: settingsData.tbc_use_production || false,
          flitt_merchant_id: settingsData.flitt_merchant_id || "",
          flitt_password: "",
          paddle_api_key: "",
          paddle_client_token: settingsData.paddle_client_token || "",
          paddle_webhook_secret: settingsData.paddle_webhook_secret || "",
          paddle_use_production: settingsData.paddle_use_production || false,
          store_name: settingsData.store_name || "",
          store_email: settingsData.store_email || "",
          store_phone: settingsData.store_phone || "",
        })
        setHasExistingCredentials(!!settingsData.bog_client_id)

        // Extract deployment info if available
        if (settingsData.ecommerce_frontend_url !== undefined || settingsData.deployment_status !== undefined) {
          setDeploymentInfo({
            frontend_url: settingsData.ecommerce_frontend_url || null,
            deployment_status: (String(settingsData.deployment_status) as DeploymentInfo["deployment_status"]) || "pending",
            vercel_project_id: settingsData.vercel_project_id || null,
          })
        }
      }
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch settings:", error)
      toast.error("Failed to load ecommerce settings")
      setLoading(false)
    }
  }

  const isProviderActive = (provider: PaymentProvider) =>
    settings.active_payment_providers.includes(provider)

  const toggleProvider = (provider: PaymentProvider) => {
    setSettings((prev) => {
      const active = prev.active_payment_providers.includes(provider)
        ? prev.active_payment_providers.filter((p) => p !== provider)
        : [...prev.active_payment_providers, provider]

      // Sync legacy fields
      const enable_card_payment = active.some((p) => p === "bog" || p === "tbc" || p === "flitt" || p === "paddle")
      const enable_cash_on_delivery = active.includes("cash")

      return { ...prev, active_payment_providers: active, enable_card_payment, enable_cash_on_delivery }
    })
  }

  const handleDeploy = async () => {
    try {
      setDeploying(true)
      setDeploymentInfo(prev => ({
        ...prev,
        deployment_status: "deploying",
      }))

      // Call the deploy-frontend endpoint using generated API function
      // The generated function expects a body but our endpoint doesn't need one
      const result = await ecommerceAdminSettingsDeployFrontendCreate({})

      if (result.success) {
        setDeploymentInfo({
          frontend_url: result.url,
          deployment_status: "deployed",
          vercel_project_id: result.project_id,
        })
        toast.success(`Frontend deployed successfully! URL: ${result.url}`)
      } else {
        setDeploymentInfo(prev => ({
          ...prev,
          deployment_status: "failed",
        }))
        toast.error(`Deployment failed: ${result.message || "Unknown error"}`)
      }
    } catch (error: any) {
      console.error("Failed to deploy frontend:", error)
      setDeploymentInfo(prev => ({
        ...prev,
        deployment_status: "failed",
      }))
      const errorMessage = error.response?.data?.error || error.message || "Unknown error"
      toast.error(`Failed to deploy frontend: ${errorMessage}`)
    } finally {
      setDeploying(false)
    }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = async () => {
    try {
      setDeleting(true)
      setShowDeleteConfirm(false)

      // Call the delete-deployment endpoint using generated API function
      const result = await ecommerceAdminSettingsDeleteDeploymentDestroy()

      if (result.success) {
        setDeploymentInfo({
          frontend_url: null,
          deployment_status: "pending",
          vercel_project_id: null,
        })
        setDomains([])
        setDnsInstructions([])
        toast.success("Deployment deleted successfully")
      } else {
        toast.error(`Failed to delete deployment: ${result.error || "Unknown error"}`)
      }
    } catch (error: any) {
      console.error("Failed to delete deployment:", error)
      const errorMessage = error.response?.data?.error || error.message || "Unknown error"
      toast.error(`Failed to delete deployment: ${errorMessage}`)
    } finally {
      setDeleting(false)
    }
  }

  const fetchDomains = async () => {
    try {
      const response = await axios.get("/api/ecommerce/admin/settings/domains/")
      if (response.data.success) {
        setDomains(response.data.domains || [])
      }
    } catch (error) {
      console.error("Failed to fetch domains:", error)
    }
  }

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      toast.error("Please enter a domain name")
      return
    }

    try {
      setAddingDomain(true)
      const response = await axios.post("/api/ecommerce/admin/settings/add-domain/", {
        domain: newDomain.trim().toLowerCase()
      })

      if (response.data.success) {
        setDomains(prev => [...prev, {
          name: response.data.domain,
          verified: response.data.verified,
          verification: response.data.verification || []
        }])

        // Set DNS instructions
        if (response.data.dns_instructions?.instructions) {
          setDnsInstructions(response.data.dns_instructions.instructions)
        }

        setNewDomain("")
        toast.success(`Domain ${response.data.domain} added successfully! Please configure DNS records as shown below.`)
      } else {
        toast.error(`Failed to add domain: ${response.data.error || "Unknown error"}`)
      }
    } catch (error: any) {
      console.error("Failed to add domain:", error)
      const errorMessage = error.response?.data?.error || error.message || "Unknown error"
      toast.error(`Failed to add domain: ${errorMessage}`)
    } finally {
      setAddingDomain(false)
    }
  }

  const [domainToRemove, setDomainToRemove] = useState<string | null>(null)

  const handleRemoveDomain = async (domain: string) => {
    try {
      setRemovingDomain(domain)
      setDomainToRemove(null)
      const response = await axios.post("/api/ecommerce/admin/settings/remove-domain/", {
        domain
      })

      if (response.data.success) {
        setDomains(prev => prev.filter(d => d.name !== domain))
        toast.success(`Domain ${domain} removed successfully`)
      } else {
        toast.error(`Failed to remove domain: ${response.data.error || "Unknown error"}`)
      }
    } catch (error: any) {
      console.error("Failed to remove domain:", error)
      const errorMessage = error.response?.data?.error || error.message || "Unknown error"
      toast.error(`Failed to remove domain: ${errorMessage}`)
    } finally {
      setRemovingDomain(null)
    }
  }

  const handleVerifyDomain = async (domain: string) => {
    try {
      setVerifyingDomain(domain)
      const response = await axios.post("/api/ecommerce/admin/settings/verify-domain/", {
        domain
      })

      if (response.data.verified) {
        setDomains(prev => prev.map(d =>
          d.name === domain ? { ...d, verified: true } : d
        ))
        toast.success(`Domain ${domain} is now verified!`)
      } else {
        toast.error(`Domain ${domain} is not yet verified. Please ensure DNS records are configured correctly and try again in a few minutes.`)
      }
    } catch (error: any) {
      console.error("Failed to verify domain:", error)
      const errorMessage = error.response?.data?.error || error.message || "Unknown error"
      toast.error(`Failed to verify domain: ${errorMessage}`)
    } finally {
      setVerifyingDomain(null)
    }
  }

  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedValue(value)
    setTimeout(() => setCopiedValue(null), 2000)
  }

  // Fetch domains when deployment is ready
  useEffect(() => {
    if (deploymentInfo.vercel_project_id) {
      fetchDomains()
    }
  }, [deploymentInfo.vercel_project_id])

  const handleSave = async () => {
    try {
      setSaving(true)

      // TODO: bog_use_production is not in the generated EcommerceSettingsRequest — fix backend serializer and regenerate
      const payload: EcommerceSettingsRequest & { bog_use_production?: boolean } = {
        bog_client_id: settings.bog_client_id,
        bog_use_production: settings.bog_use_production,
        bog_return_url_success: settings.bog_return_url_success,
        bog_return_url_fail: settings.bog_return_url_fail,
        enable_cash_on_delivery: settings.active_payment_providers.includes("cash"),
        enable_card_payment: settings.active_payment_providers.some(
          (p) => p === "bog" || p === "tbc" || p === "flitt" || p === "paddle"
        ),
        active_payment_providers: settings.active_payment_providers,
        tbc_client_id: settings.tbc_client_id,
        tbc_api_key: settings.tbc_api_key,
        tbc_use_production: settings.tbc_use_production,
        flitt_merchant_id: settings.flitt_merchant_id,
        paddle_client_token: settings.paddle_client_token,
        paddle_webhook_secret: settings.paddle_webhook_secret,
        paddle_use_production: settings.paddle_use_production,
        store_name: settings.store_name,
        store_email: settings.store_email,
        store_phone: settings.store_phone,
        ...(bogSecret && { bog_client_secret: bogSecret }),
        ...(settings.tbc_client_secret && { tbc_client_secret: settings.tbc_client_secret }),
        ...(settings.flitt_password && { flitt_password: settings.flitt_password }),
        ...(settings.paddle_api_key && { paddle_api_key: settings.paddle_api_key }),
      }

      if (settings.id) {
        // Update existing settings
        await ecommerceAdminSettingsPartialUpdate(String(settings.id), payload)
      } else {
        // Create new settings
        await ecommerceAdminSettingsCreate(payload)
      }

      toast.success("Settings saved successfully!")

      // If secret was provided, mark as having credentials
      if (bogSecret) {
        setHasExistingCredentials(true)
        setBogSecret("") // Clear the input after saving
      }

      // Clear secret fields after save
      setSettings((prev) => ({ ...prev, tbc_client_secret: "", flitt_password: "" }))

      // Refresh settings
      await fetchSettings()
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast.error("Failed to save settings. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const hasAnyProvider = settings.active_payment_providers.length > 0

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* Store Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            <CardTitle>{t("storeInfo.title")}</CardTitle>
          </div>
          <CardDescription>
            {t("storeInfo.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store_name">{t("storeInfo.storeName")}</Label>
              <Input
                id="store_name"
                value={settings.store_name}
                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                placeholder={t("storeInfo.storeNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_email">{t("storeInfo.storeEmail")}</Label>
              <Input
                id="store_email"
                type="email"
                value={settings.store_email}
                onChange={(e) => setSettings({ ...settings, store_email: e.target.value })}
                placeholder={t("storeInfo.storeEmailPlaceholder")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="store_phone">{t("storeInfo.storePhone")}</Label>
            <Input
              id="store_phone"
              value={settings.store_phone}
              onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
              placeholder={t("storeInfo.storePhonePlaceholder")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>{t("paymentMethods.title")}</CardTitle>
          </div>
          <CardDescription>
            {t("paymentMethods.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning if no providers */}
          {!hasAnyProvider && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                {t("paymentMethods.noProviderWarning")}
              </p>
            </div>
          )}

          {/* BOG Provider */}
          <div className="border rounded-lg">
            <div
              className="flex items-center gap-3 p-4 cursor-pointer"
              onClick={() => toggleProvider("bog")}
            >
              <Checkbox
                checked={isProviderActive("bog")}
                onCheckedChange={() => toggleProvider("bog")}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1">
                <span className="font-medium">{t("paymentMethods.providerBog")}</span>
              </div>
            </div>
            <Collapsible open={isProviderActive("bog")}>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-4 border-t pt-4">
                  {/* Credentials Status */}
                  {hasExistingCredentials && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <p className="text-sm text-green-800">
                        {t("bog.credentialsConfigured")}
                      </p>
                    </div>
                  )}

                  {!hasExistingCredentials && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <p className="text-sm text-yellow-800">
                        {t("bog.noCredentials")}
                      </p>
                    </div>
                  )}

                  {/* Client ID */}
                  <div className="space-y-2">
                    <Label htmlFor="bog_client_id">
                      {t("bog.clientId")}
                      <span className="text-muted-foreground text-sm ml-2">{t("bog.clientIdRequired")}</span>
                    </Label>
                    <Input
                      id="bog_client_id"
                      value={settings.bog_client_id}
                      onChange={(e) => setSettings({ ...settings, bog_client_id: e.target.value })}
                      placeholder="your-bog-client-id"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("bog.clientIdHelp")}
                    </p>
                  </div>

                  {/* Client Secret */}
                  <div className="space-y-2">
                    <Label htmlFor="bog_client_secret">
                      {t("bog.clientSecret")}
                      <span className="text-muted-foreground text-sm ml-2">{t("bog.clientSecretEncrypted")}</span>
                    </Label>
                    <PasswordInput
                      id="bog_client_secret"
                      value={bogSecret}
                      onChange={setBogSecret}
                      placeholder={hasExistingCredentials ? "••••••••••••••••" : "your-bog-client-secret"}
                    />
                    <p className="text-xs text-muted-foreground">
                      {hasExistingCredentials
                        ? t("bog.clientSecretKeep")
                        : t("bog.clientSecretNew")}
                    </p>
                  </div>

                  {/* Production Mode */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="bog_use_production">{t("environment.productionMode")}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t("environment.productionModeDesc")}
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

                  {/* Return URLs */}
                  <Separator />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bog_return_url_success">
                        {t("returnUrls.successUrl")}
                        <span className="text-muted-foreground text-sm ml-2">{t("returnUrls.successUrlAfter")}</span>
                      </Label>
                      <Input
                        id="bog_return_url_success"
                        type="url"
                        value={settings.bog_return_url_success}
                        onChange={(e) => setSettings({ ...settings, bog_return_url_success: e.target.value })}
                        placeholder={t("returnUrls.successUrlPlaceholder")}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("returnUrls.successUrlHelp")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bog_return_url_fail">
                        {t("returnUrls.failUrl")}
                        <span className="text-muted-foreground text-sm ml-2">{t("returnUrls.failUrlAfter")}</span>
                      </Label>
                      <Input
                        id="bog_return_url_fail"
                        type="url"
                        value={settings.bog_return_url_fail}
                        onChange={(e) => setSettings({ ...settings, bog_return_url_fail: e.target.value })}
                        placeholder={t("returnUrls.failUrlPlaceholder")}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("returnUrls.failUrlHelp")}
                      </p>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* TBC Provider */}
          <div className="border rounded-lg">
            <div
              className="flex items-center gap-3 p-4 cursor-pointer"
              onClick={() => toggleProvider("tbc")}
            >
              <Checkbox
                checked={isProviderActive("tbc")}
                onCheckedChange={() => toggleProvider("tbc")}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1">
                <span className="font-medium">{t("paymentMethods.providerTbc")}</span>
              </div>
            </div>
            <Collapsible open={isProviderActive("tbc")}>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-4 border-t pt-4">
                  {/* TBC Client ID */}
                  <div className="space-y-2">
                    <Label htmlFor="tbc_client_id">{t("paymentMethods.tbcClientId")}</Label>
                    <Input
                      id="tbc_client_id"
                      value={settings.tbc_client_id}
                      onChange={(e) => setSettings({ ...settings, tbc_client_id: e.target.value })}
                      placeholder="your-tbc-client-id"
                    />
                  </div>

                  {/* TBC Client Secret */}
                  <div className="space-y-2">
                    <Label htmlFor="tbc_client_secret">{t("paymentMethods.tbcClientSecret")}</Label>
                    <PasswordInput
                      id="tbc_client_secret"
                      value={settings.tbc_client_secret}
                      onChange={(value) => setSettings({ ...settings, tbc_client_secret: value })}
                      placeholder="your-tbc-client-secret"
                    />
                  </div>

                  {/* TBC API Key */}
                  <div className="space-y-2">
                    <Label htmlFor="tbc_api_key">{t("paymentMethods.tbcApiKey")}</Label>
                    <Input
                      id="tbc_api_key"
                      value={settings.tbc_api_key}
                      onChange={(e) => setSettings({ ...settings, tbc_api_key: e.target.value })}
                      placeholder="your-tbc-api-key"
                    />
                  </div>

                  {/* TBC Production Mode */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="tbc_use_production">{t("paymentMethods.tbcProductionMode")}</Label>
                    </div>
                    <Switch
                      id="tbc_use_production"
                      checked={settings.tbc_use_production}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, tbc_use_production: checked })
                      }
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Flitt Provider */}
          <div className="border rounded-lg">
            <div
              className="flex items-center gap-3 p-4 cursor-pointer"
              onClick={() => toggleProvider("flitt")}
            >
              <Checkbox
                checked={isProviderActive("flitt")}
                onCheckedChange={() => toggleProvider("flitt")}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1">
                <span className="font-medium">{t("paymentMethods.providerFlitt")}</span>
              </div>
            </div>
            <Collapsible open={isProviderActive("flitt")}>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-4 border-t pt-4">
                  {/* Flitt Merchant ID */}
                  <div className="space-y-2">
                    <Label htmlFor="flitt_merchant_id">{t("paymentMethods.flittMerchantId")}</Label>
                    <Input
                      id="flitt_merchant_id"
                      value={settings.flitt_merchant_id}
                      onChange={(e) => setSettings({ ...settings, flitt_merchant_id: e.target.value })}
                      placeholder="your-flitt-merchant-id"
                    />
                  </div>

                  {/* Flitt Password */}
                  <div className="space-y-2">
                    <Label htmlFor="flitt_password">{t("paymentMethods.flittPassword")}</Label>
                    <PasswordInput
                      id="flitt_password"
                      value={settings.flitt_password}
                      onChange={(value) => setSettings({ ...settings, flitt_password: value })}
                      placeholder="your-flitt-password"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Paddle Provider */}
          <div className="border rounded-lg">
            <div
              className="flex items-center gap-3 p-4 cursor-pointer"
              onClick={() => toggleProvider("paddle")}
            >
              <Checkbox
                checked={isProviderActive("paddle")}
                onCheckedChange={() => toggleProvider("paddle")}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1">
                <span className="font-medium">{t("paymentMethods.providerPaddle")}</span>
              </div>
            </div>
            <Collapsible open={isProviderActive("paddle")}>
              <CollapsibleContent>
                <div className="px-4 pb-4 border-t pt-4 space-y-3">
                  <div>
                    <Label>{t("paymentMethods.paddleApiKey")}</Label>
                    <PasswordInput
                      id="paddle_api_key"
                      value={settings.paddle_api_key || ""}
                      onChange={(v) => setSettings((prev) => ({ ...prev, paddle_api_key: v }))}
                      placeholder="pdl_..."
                    />
                  </div>
                  <div>
                    <Label>{t("paymentMethods.paddleClientToken")}</Label>
                    <Input
                      value={settings.paddle_client_token || ""}
                      onChange={(e) => setSettings((prev) => ({ ...prev, paddle_client_token: e.target.value }))}
                      placeholder="test_..."
                    />
                  </div>
                  <div>
                    <Label>{t("paymentMethods.paddleWebhookSecret")}</Label>
                    <PasswordInput
                      id="paddle_webhook_secret"
                      value={settings.paddle_webhook_secret || ""}
                      onChange={(v) => setSettings((prev) => ({ ...prev, paddle_webhook_secret: v }))}
                      placeholder="pdl_ntfset_..."
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t("paymentMethods.paddleProductionMode")}</Label>
                    <Switch
                      checked={settings.paddle_use_production || false}
                      onCheckedChange={(v) => setSettings((prev) => ({ ...prev, paddle_use_production: v }))}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Cash on Delivery */}
          <div className="border rounded-lg">
            <div
              className="flex items-center gap-3 p-4 cursor-pointer"
              onClick={() => toggleProvider("cash")}
            >
              <Checkbox
                checked={isProviderActive("cash")}
                onCheckedChange={() => toggleProvider("cash")}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1">
                <span className="font-medium">{t("paymentMethods.cashOnDelivery")}</span>
                <p className="text-sm text-muted-foreground">
                  {t("paymentMethods.cashOnDeliveryDesc")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frontend Deployment */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>{t("deployment.title")}</CardTitle>
          </div>
          <CardDescription>
            {t("deployment.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Deployment Status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5">
              <Label>{t("deployment.status")}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    deploymentInfo.deployment_status === "deployed"
                      ? "default"
                      : deploymentInfo.deployment_status === "deploying"
                      ? "secondary"
                      : deploymentInfo.deployment_status === "failed"
                      ? "destructive"
                      : "outline"
                  }
                  className={
                    deploymentInfo.deployment_status === "deployed"
                      ? "bg-green-500 hover:bg-green-600"
                      : deploymentInfo.deployment_status === "deploying"
                      ? "bg-blue-500 hover:bg-blue-600"
                      : ""
                  }
                >
                  {deploymentInfo.deployment_status === "deploying" && (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  )}
                  {t(`deployment.${deploymentInfo.deployment_status}`)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Frontend URL */}
          {deploymentInfo.frontend_url && (
            <div className="space-y-2">
              <Label>{t("deployment.frontendUrl")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={deploymentInfo.frontend_url}
                  readOnly
                  className="bg-muted"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(deploymentInfo.frontend_url!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("deployment.frontendUrlLive")}
              </p>
            </div>
          )}

          {/* Vercel Project ID */}
          {deploymentInfo.vercel_project_id && (
            <div className="space-y-2">
              <Label>{t("deployment.vercelProjectId")}</Label>
              <Input
                value={deploymentInfo.vercel_project_id}
                readOnly
                className="bg-muted font-mono text-sm"
              />
            </div>
          )}

          {/* Deploy/Redeploy Button */}
          <div className="pt-2 space-y-2">
            {!deploymentInfo.frontend_url ? (
              <Button
                onClick={handleDeploy}
                disabled={deploying}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {deploying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("deployment.deployingFrontend")}
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    {t("deployment.deployFrontend")}
                  </>
                )}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleDeploy}
                  disabled={deploying || deleting}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  {deploying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("deployment.redeploying")}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t("deployment.redeployFrontend")}
                    </>
                  )}
                </Button>
                <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deploying || deleting}
                    variant="destructive"
                    size="lg"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Deployment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete the frontend deployment? This will remove the Vercel project.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          {/* Info Message */}
          {!deploymentInfo.frontend_url && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-800">
                {t("deployment.deployInfo")}
              </p>
            </div>
          )}

          {deploymentInfo.deployment_status === "failed" && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800">
                {t("deployment.deployFailed")}
              </p>
            </div>
          )}

          {deploymentInfo.deployment_status === "deployed" && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800">
                {t("deployment.deploySuccess")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Domain Management - Only shown when deployed */}
      {deploymentInfo.vercel_project_id && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>{t("customDomain.title")}</CardTitle>
            </div>
            <CardDescription>
              {t("customDomain.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Domain */}
            <div className="space-y-2">
              <Label>{t("customDomain.addDomain")}</Label>
              <div className="flex gap-2">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder={t("customDomain.domainPlaceholder")}
                  disabled={addingDomain}
                />
                <Button
                  onClick={handleAddDomain}
                  disabled={addingDomain || !newDomain.trim()}
                >
                  {addingDomain ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("customDomain.domainHelp")}
              </p>
            </div>

            {/* DNS Instructions */}
            {dnsInstructions.length > 0 && (
              <div className="space-y-3">
                <Label>{t("customDomain.dnsRequired")}</Label>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm font-medium text-yellow-800">
                      {t("customDomain.dnsInstruction")}
                    </p>
                  </div>
                  {dnsInstructions.map((instruction, index) => (
                    <div key={index} className="bg-white p-3 rounded border space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">{t("customDomain.dnsType")}</span>
                          <p className="font-mono font-medium">{instruction.type}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("customDomain.dnsName")}</span>
                          <p className="font-mono font-medium">{instruction.name}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("customDomain.dnsValue")}</span>
                          <div className="flex items-center gap-1">
                            <p className="font-mono font-medium text-xs break-all">{instruction.value}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(instruction.value)}
                            >
                              {copiedValue === instruction.value ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{instruction.description}</p>
                    </div>
                  ))}
                  <p className="text-xs text-yellow-700">
                    {t("customDomain.dnsPropagation")}
                  </p>
                </div>
              </div>
            )}

            {/* Existing Domains List */}
            {domains.length > 0 && (
              <div className="space-y-3">
                <Label>{t("customDomain.yourDomains")}</Label>
                <div className="space-y-2">
                  {domains.map((domain) => (
                    <div
                      key={domain.name}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg"
                    >
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono break-all">{domain.name}</span>
                        <Badge
                          variant={domain.verified ? "default" : "secondary"}
                          className={domain.verified ? "bg-green-500" : "bg-yellow-500"}
                        >
                          {domain.verified ? t("customDomain.verified") : t("customDomain.pendingVerification")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {!domain.verified && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerifyDomain(domain.name)}
                            disabled={verifyingDomain === domain.name}
                          >
                            {verifyingDomain === domain.name ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCcw className="h-4 w-4" />
                            )}
                            <span className="ml-1">{t("customDomain.verify")}</span>
                          </Button>
                        )}
                        {domain.verified && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://${domain.name}`, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog open={domainToRemove === domain.name} onOpenChange={(open) => !open && setDomainToRemove(null)}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDomainToRemove(domain.name)}
                            disabled={removingDomain === domain.name}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {removingDomain === domain.name ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Domain</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {domain.name}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveDomain(domain.name)}>Remove</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">{t("customDomain.howToSetup")}</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>{t("customDomain.step1")}</li>
                  <li>{t("customDomain.step2")}</li>
                  <li>{t("customDomain.step3")}</li>
                  <li>{t("customDomain.step4")}</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || !hasAnyProvider}
          size="lg"
        >
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  )
}
