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
import { CreditCard, Store, Eye, EyeOff, CheckCircle2, AlertCircle, Globe, Rocket, RefreshCw, ExternalLink, Loader2, Trash2, Plus, X, RefreshCcw, Copy, Check, Truck, Palette } from "lucide-react"
import { ecommerceAdminSettingsList, ecommerceAdminSettingsDeployFrontendCreate, ecommerceAdminSettingsPartialUpdate, ecommerceAdminSettingsCreate, ecommerceAdminSettingsDeleteDeploymentDestroy, ecommerceQuickshipperTestConnection } from "@/api/generated/api"
import { MiniMapPicker } from "@/components/MiniMapPicker"
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
  // Quickshipper courier integration
  quickshipper_enabled: boolean
  quickshipper_use_production: boolean
  quickshipper_pickup_contact_name: string
  quickshipper_pickup_phone: string
  quickshipper_pickup_address: string
  quickshipper_pickup_city: string
  quickshipper_pickup_latitude: number | null
  quickshipper_pickup_longitude: number | null
  quickshipper_pickup_extra_instructions: string
  // Storefront visual template
  storefront_template: StorefrontTemplate
  voltage_theme_preset: VoltageTheme
  voltage_color_mode: VoltageMode
  voltage_density: VoltageDensity
  voltage_radius: VoltageRadius
  voltage_font_pair: VoltageFontPair
}

type StorefrontTemplate = "classic" | "voltage"
type VoltageTheme = "refurb" | "cobalt" | "ember" | "forest" | "violet" | "mono" | "rose"
type VoltageMode = "light" | "dark"
type VoltageDensity = "compact" | "cozy" | "comfortable"
type VoltageRadius = "sharp" | "soft" | "rounded"
type VoltageFontPair = "bricolage-inter" | "space-dm" | "serif-inter" | "mono-inter"

// Voltage colour-pair previews. Hex values are picked to read well as a
// 24×24 swatch — they're the prototype's `--accent` mapped to sRGB. The
// `accent2` is the secondary swatch shown in the corner of each chip so
// the tenant sees both colours of the pair at once.
const VOLTAGE_THEME_SWATCHES: Record<VoltageTheme, { label: string; accent: string; accent2: string }> = {
  refurb: { label: "Refurb", accent: "#f0d860", accent2: "#3955d6" },
  cobalt: { label: "Cobalt", accent: "#3955d6", accent2: "#f0d860" },
  ember: { label: "Ember", accent: "#dd6b3a", accent2: "#1a1a2e" },
  forest: { label: "Forest", accent: "#3a8c5a", accent2: "#e8d35a" },
  violet: { label: "Violet", accent: "#8e4dd6", accent2: "#e6cc60" },
  mono: { label: "Mono", accent: "#1a1a2e", accent2: "#f5f5f0" },
  rose: { label: "Rose", accent: "#e35884", accent2: "#1a1a2e" },
}

const VOLTAGE_FONT_PAIR_LABELS: Record<VoltageFontPair, { label: string; sample: string; family: string }> = {
  "bricolage-inter": { label: "Bricolage + Inter", sample: "Aa", family: "'Bricolage Grotesque', system-ui, sans-serif" },
  "space-dm": { label: "Space Grotesk + DM Sans", sample: "Aa", family: "'Space Grotesk', system-ui, sans-serif" },
  "serif-inter": { label: "Instrument Serif + Inter", sample: "Aa", family: "'Instrument Serif', Georgia, serif" },
  "mono-inter": { label: "JetBrains Mono + Inter", sample: "Aa", family: "'JetBrains Mono', ui-monospace, monospace" },
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

// Small segmented-toggle helper. Used by the Voltage tweaks block to
// pick between mode / density / radius. Kept inline because it's only
// useful here and adding a shadcn primitive for it would be overkill.
function SegmentedToggle({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="inline-flex w-full rounded-md border bg-muted p-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              value === opt.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
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
    quickshipper_enabled: false,
    quickshipper_use_production: false,
    quickshipper_pickup_contact_name: "",
    quickshipper_pickup_phone: "",
    quickshipper_pickup_address: "",
    quickshipper_pickup_city: "",
    quickshipper_pickup_latitude: null,
    quickshipper_pickup_longitude: null,
    quickshipper_pickup_extra_instructions: "",
    storefront_template: "classic",
    voltage_theme_preset: "refurb",
    voltage_color_mode: "light",
    voltage_density: "cozy",
    voltage_radius: "soft",
    voltage_font_pair: "bricolage-inter",
  })
  const [bogSecret, setBogSecret] = useState("")
  const [quickshipperApiKey, setQuickshipperApiKey] = useState("")
  const [hasQuickshipperKey, setHasQuickshipperKey] = useState(false)
  const [quickshipperWebhookSecret, setQuickshipperWebhookSecret] = useState("")
  const [testingQuickshipper, setTestingQuickshipper] = useState(false)
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
          quickshipper_enabled: settingsData.quickshipper_enabled ?? false,
          quickshipper_use_production: settingsData.quickshipper_use_production ?? false,
          quickshipper_pickup_contact_name: settingsData.quickshipper_pickup_contact_name || "",
          quickshipper_pickup_phone: settingsData.quickshipper_pickup_phone || "",
          quickshipper_pickup_address: settingsData.quickshipper_pickup_address || "",
          quickshipper_pickup_city: settingsData.quickshipper_pickup_city || "",
          quickshipper_pickup_latitude:
            settingsData.quickshipper_pickup_latitude != null
              ? Number(settingsData.quickshipper_pickup_latitude)
              : null,
          quickshipper_pickup_longitude:
            settingsData.quickshipper_pickup_longitude != null
              ? Number(settingsData.quickshipper_pickup_longitude)
              : null,
          quickshipper_pickup_extra_instructions: settingsData.quickshipper_pickup_extra_instructions || "",
          // Storefront visual template — falls back to "classic" so the
          // form never shows undefined; backend defaults to the same.
          storefront_template:
            (settingsData as { storefront_template?: StorefrontTemplate }).storefront_template ||
            "classic",
          voltage_theme_preset:
            (settingsData as { voltage_theme_preset?: VoltageTheme }).voltage_theme_preset ||
            "refurb",
          voltage_color_mode:
            (settingsData as { voltage_color_mode?: VoltageMode }).voltage_color_mode || "light",
          voltage_density:
            (settingsData as { voltage_density?: VoltageDensity }).voltage_density || "cozy",
          voltage_radius:
            (settingsData as { voltage_radius?: VoltageRadius }).voltage_radius || "soft",
          voltage_font_pair:
            (settingsData as { voltage_font_pair?: VoltageFontPair }).voltage_font_pair ||
            "bricolage-inter",
        })
        setHasExistingCredentials(!!settingsData.bog_client_id)
        setHasQuickshipperKey(!!settingsData.has_quickshipper_credentials)
        setQuickshipperWebhookSecret(settingsData.quickshipper_webhook_secret || "")

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
        // Quickshipper courier integration. The webhook secret is read-only
        // server-side (auto-allocated on first enable) so we don't send it.
        quickshipper_enabled: settings.quickshipper_enabled,
        quickshipper_use_production: settings.quickshipper_use_production,
        quickshipper_pickup_contact_name: settings.quickshipper_pickup_contact_name,
        quickshipper_pickup_phone: settings.quickshipper_pickup_phone,
        quickshipper_pickup_address: settings.quickshipper_pickup_address,
        quickshipper_pickup_city: settings.quickshipper_pickup_city,
        // Decimal fields — only send when a pin has actually been dropped.
        // Sending an empty string would fail server-side validation; sending
        // null would force `as any` (the generated type is string | undefined).
        // Truncate to 6 decimals to match the backend's `DecimalField(
        // max_digits=9, decimal_places=6)`. Leaflet emits 14-digit floats and
        // the server rejects anything past 6dp ("more than 9 digits in total").
        // 6dp ≈ 11 cm precision at the equator, plenty for courier delivery.
        ...(settings.quickshipper_pickup_latitude != null && {
          quickshipper_pickup_latitude: settings.quickshipper_pickup_latitude.toFixed(6),
        }),
        ...(settings.quickshipper_pickup_longitude != null && {
          quickshipper_pickup_longitude: settings.quickshipper_pickup_longitude.toFixed(6),
        }),
        quickshipper_pickup_extra_instructions: settings.quickshipper_pickup_extra_instructions,
        // Storefront visual template + voltage tweaks. The generated
        // EcommerceSettingsRequest types these fields as opaque
        // `*Enum` stubs (drf-spectacular emits enum names but no
        // value union), so we cast through `unknown` to satisfy
        // TypeScript without losing the runtime string values.
        ...({
          storefront_template: settings.storefront_template,
          voltage_theme_preset: settings.voltage_theme_preset,
          voltage_color_mode: settings.voltage_color_mode,
          voltage_density: settings.voltage_density,
          voltage_radius: settings.voltage_radius,
          voltage_font_pair: settings.voltage_font_pair,
        } as unknown as Partial<EcommerceSettingsRequest>),
        ...(bogSecret && { bog_client_secret: bogSecret }),
        ...(settings.tbc_client_secret && { tbc_client_secret: settings.tbc_client_secret }),
        ...(settings.flitt_password && { flitt_password: settings.flitt_password }),
        ...(settings.paddle_api_key && { paddle_api_key: settings.paddle_api_key }),
        ...(quickshipperApiKey && { quickshipper_api_key: quickshipperApiKey }),
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
      if (quickshipperApiKey) {
        setHasQuickshipperKey(true)
        setQuickshipperApiKey("")
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

      {/* Delivery — Quickshipper */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            <CardTitle>Delivery — Quickshipper</CardTitle>
          </div>
          <CardDescription>
            Connect your Quickshipper account to dispatch couriers automatically
            when an order is placed. The storefront will replace static shipping
            methods with a live quote based on each order&apos;s delivery address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="quickshipper_enabled" className="text-base">
                Enable Quickshipper
              </Label>
              <p className="text-sm text-muted-foreground">
                When on, the storefront fetches a real-time courier price + ETA
                at checkout instead of showing your manual shipping methods.
              </p>
            </div>
            <Switch
              id="quickshipper_enabled"
              checked={settings.quickshipper_enabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, quickshipper_enabled: checked }))
              }
            />
          </div>

          {settings.quickshipper_enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quickshipper_api_key">
                    API key
                    {hasQuickshipperKey && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        on file
                      </span>
                    )}
                  </Label>
                  <PasswordInput
                    id="quickshipper_api_key"
                    value={quickshipperApiKey}
                    onChange={setQuickshipperApiKey}
                    placeholder={
                      hasQuickshipperKey
                        ? "Leave blank to keep the existing key"
                        : "Paste your Quickshipper API key"
                    }
                  />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center justify-between rounded-lg border p-3 w-full">
                    <div className="space-y-0.5">
                      <Label htmlFor="quickshipper_use_production" className="text-base">
                        Production mode
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Off = Quickshipper sandbox, on = production billing.
                      </p>
                    </div>
                    <Switch
                      id="quickshipper_use_production"
                      checked={settings.quickshipper_use_production}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({
                          ...prev,
                          quickshipper_use_production: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <Label className="text-base">Pickup address</Label>
                  <p className="text-sm text-muted-foreground">
                    The courier will pick up every shipment from this location.
                    Drop a pin on the map for accurate routing.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quickshipper_pickup_contact_name">
                      Contact name
                    </Label>
                    <Input
                      id="quickshipper_pickup_contact_name"
                      value={settings.quickshipper_pickup_contact_name}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          quickshipper_pickup_contact_name: e.target.value,
                        }))
                      }
                      placeholder="e.g. Shop manager"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quickshipper_pickup_phone">Phone</Label>
                    <Input
                      id="quickshipper_pickup_phone"
                      value={settings.quickshipper_pickup_phone}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          quickshipper_pickup_phone: e.target.value,
                        }))
                      }
                      placeholder="+995..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="quickshipper_pickup_address">Street</Label>
                    <Input
                      id="quickshipper_pickup_address"
                      value={settings.quickshipper_pickup_address}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          quickshipper_pickup_address: e.target.value,
                        }))
                      }
                      placeholder="e.g. 12 Rustaveli Ave"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quickshipper_pickup_city">City</Label>
                    <Input
                      id="quickshipper_pickup_city"
                      value={settings.quickshipper_pickup_city}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          quickshipper_pickup_city: e.target.value,
                        }))
                      }
                      placeholder="Tbilisi"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quickshipper_pickup_extra_instructions">
                    Extra instructions
                  </Label>
                  <Input
                    id="quickshipper_pickup_extra_instructions"
                    value={settings.quickshipper_pickup_extra_instructions}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        quickshipper_pickup_extra_instructions: e.target.value,
                      }))
                    }
                    placeholder="Door code, floor, what to ring at"
                  />
                </div>

                <MiniMapPicker
                  latitude={settings.quickshipper_pickup_latitude}
                  longitude={settings.quickshipper_pickup_longitude}
                  onChange={(lat, lng) =>
                    setSettings((prev) => ({
                      ...prev,
                      quickshipper_pickup_latitude: lat,
                      quickshipper_pickup_longitude: lng,
                    }))
                  }
                />
              </div>

              <Separator />

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={testingQuickshipper || (!hasQuickshipperKey && !quickshipperApiKey)}
                  onClick={async () => {
                    setTestingQuickshipper(true)
                    try {
                      const res = await ecommerceQuickshipperTestConnection() as {
                        success: boolean
                        shop_name?: string
                        balance?: string
                        has_providers?: boolean
                        error?: string
                      }
                      if (res.success) {
                        toast.success(
                          `Connected as ${res.shop_name || "Quickshipper account"}` +
                            (res.balance ? ` · balance: ${res.balance}` : "") +
                            (res.has_providers ? "" : " · ⚠ no couriers configured yet")
                        )
                      } else {
                        toast.error(res.error || "Quickshipper rejected the request")
                      }
                    } catch (err) {
                      const msg =
                        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                        (err as Error).message ||
                        "Test failed"
                      toast.error(msg)
                    } finally {
                      setTestingQuickshipper(false)
                    }
                  }}
                >
                  {testingQuickshipper ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing…
                    </>
                  ) : (
                    "Test connection"
                  )}
                </Button>

                {quickshipperWebhookSecret && (
                  <div className="flex flex-1 min-w-[260px] items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
                    <span className="font-medium text-muted-foreground">
                      Webhook signing secret:
                    </span>
                    <code className="font-mono text-[11px] truncate flex-1">
                      {quickshipperWebhookSecret}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => {
                        navigator.clipboard.writeText(quickshipperWebhookSecret)
                        toast.success("Copied")
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Storefront Template */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Storefront Template</CardTitle>
          </div>
          <CardDescription>
            Pick the visual design your storefront renders. The Voltage template ships
            with its own colour palette, density, radius and font controls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Template radio cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(
              [
                {
                  value: "classic" as const,
                  label: "Classic",
                  blurb: "Clean, neutral, shadcn-style. The current default.",
                  preview: (
                    <div className="grid grid-cols-3 gap-1 h-full">
                      <div className="bg-muted rounded col-span-2"></div>
                      <div className="bg-muted-foreground/20 rounded"></div>
                      <div className="bg-muted-foreground/15 rounded col-span-3"></div>
                    </div>
                  ),
                },
                {
                  value: "voltage" as const,
                  label: "Voltage",
                  blurb: "Bold electronics. Big display type, oversized cards, sticker badges.",
                  preview: (
                    <div className="grid grid-cols-3 gap-1 h-full">
                      <div
                        className="rounded col-span-2"
                        style={{ background: VOLTAGE_THEME_SWATCHES[settings.voltage_theme_preset].accent }}
                      ></div>
                      <div
                        className="rounded"
                        style={{ background: VOLTAGE_THEME_SWATCHES[settings.voltage_theme_preset].accent2 }}
                      ></div>
                      <div className="bg-foreground/90 rounded col-span-3"></div>
                    </div>
                  ),
                },
              ] as const
            ).map((opt) => {
              const checked = settings.storefront_template === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({ ...prev, storefront_template: opt.value }))
                  }
                  className={`flex flex-col rounded-lg border-2 p-3 text-left transition-colors ${
                    checked ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="h-16 w-full mb-3">{opt.preview}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{opt.label}</span>
                    {checked && (
                      <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">{opt.blurb}</span>
                </button>
              )
            })}
          </div>

          {/* Voltage tweaks — only visible when Voltage is selected */}
          {settings.storefront_template === "voltage" && (
            <div className="space-y-5 pt-2">
              <Separator />

              {/* Colour preset */}
              <div className="space-y-2">
                <Label>Colour preset</Label>
                <p className="text-xs text-muted-foreground">
                  Drives the accent + secondary-accent pair across the entire storefront.
                </p>
                <div className="grid grid-cols-7 gap-2">
                  {(Object.keys(VOLTAGE_THEME_SWATCHES) as VoltageTheme[]).map((key) => {
                    const sw = VOLTAGE_THEME_SWATCHES[key]
                    const checked = settings.voltage_theme_preset === key
                    return (
                      <button
                        key={key}
                        type="button"
                        title={sw.label}
                        onClick={() =>
                          setSettings((prev) => ({ ...prev, voltage_theme_preset: key }))
                        }
                        className={`relative aspect-square rounded-lg border-2 transition-all ${
                          checked ? "border-foreground scale-105" : "border-transparent hover:scale-105"
                        }`}
                        style={{ background: sw.accent }}
                      >
                        <span
                          className="absolute bottom-1 right-1 h-3 w-3 rounded-full border border-white/40"
                          style={{ background: sw.accent2 }}
                        ></span>
                        {checked && (
                          <Check className="absolute top-1 left-1 h-3 w-3 text-white drop-shadow" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Mode + Density + Radius — three side-by-side segmented toggles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SegmentedToggle
                  label="Mode"
                  options={[
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                  ]}
                  value={settings.voltage_color_mode}
                  onChange={(v) =>
                    setSettings((prev) => ({ ...prev, voltage_color_mode: v as VoltageMode }))
                  }
                />
                <SegmentedToggle
                  label="Density"
                  options={[
                    { value: "compact", label: "Compact" },
                    { value: "cozy", label: "Cozy" },
                    { value: "comfortable", label: "Comfy" },
                  ]}
                  value={settings.voltage_density}
                  onChange={(v) =>
                    setSettings((prev) => ({ ...prev, voltage_density: v as VoltageDensity }))
                  }
                />
                <SegmentedToggle
                  label="Radius"
                  options={[
                    { value: "sharp", label: "Sharp" },
                    { value: "soft", label: "Soft" },
                    { value: "rounded", label: "Round" },
                  ]}
                  value={settings.voltage_radius}
                  onChange={(v) =>
                    setSettings((prev) => ({ ...prev, voltage_radius: v as VoltageRadius }))
                  }
                />
              </div>

              {/* Font pair */}
              <div className="space-y-2">
                <Label>Font pair</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(Object.keys(VOLTAGE_FONT_PAIR_LABELS) as VoltageFontPair[]).map((key) => {
                    const fp = VOLTAGE_FONT_PAIR_LABELS[key]
                    const checked = settings.voltage_font_pair === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({ ...prev, voltage_font_pair: key }))
                        }
                        className={`flex flex-col items-center justify-center rounded-lg border-2 p-3 transition-colors ${
                          checked
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-muted-foreground/30"
                        }`}
                      >
                        <span
                          className="text-3xl font-bold leading-none mb-1"
                          style={{ fontFamily: fp.family }}
                        >
                          {fp.sample}
                        </span>
                        <span className="text-[10px] text-muted-foreground text-center">
                          {fp.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
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
