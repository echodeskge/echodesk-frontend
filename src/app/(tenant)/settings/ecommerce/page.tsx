"use client"

import { useState, useEffect, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import {
  CheckCircle2,
  Globe,
  Rocket,
  RefreshCw,
  ExternalLink,
  Loader2,
  Trash2,
  Plus,
  X,
  RefreshCcw,
  Copy,
  Check,
  Save,
  ShoppingBag,
  AlertTriangle,
  RotateCw,
} from "lucide-react"
import { ecommerceAdminSettingsList, ecommerceAdminSettingsDeployFrontendCreate, ecommerceAdminSettingsPartialUpdate, ecommerceAdminSettingsCreate, ecommerceAdminSettingsDeleteDeploymentDestroy, ecommerceQuickshipperTestConnection } from "@/api/generated/api"
import { MiniMapPicker } from "@/components/MiniMapPicker"
import type { EcommerceSettings as EcommerceSettingsType, EcommerceSettingsRequest } from "@/api/generated/interfaces"
import { toast } from "sonner"
import { cn, getApiErrorMessage } from "@/lib/utils"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import axios from "@/api/axios"
import { Switch } from "@/components/ui/switch"
import {
  EcBanner,
  EcLoading,
  EcPage,
  EcPageHeader,
  FieldRow,
  SectionCard,
  Segmented,
  TonePill,
  rdButton,
} from "@/app/(tenant)/ecommerce/_components/ui"
import {
  InlineSwitch,
  Notice,
  PasswordInput,
  ProviderBlock,
  StackField,
  fieldWidth,
  settingsInput,
} from "./_components/settings-ui"
import { OrdersSection } from "./_components/orders-section"
import { useMyAccess } from "@/hooks/useMyAccess"
import {
  deploymentTone,
  legacyPaymentFlags,
  parseClarityInput,
  quickshipperConnectedParts,
  requestErrorText,
  settingsFingerprint,
  toggleProviderList,
  type PaymentProvider,
} from "./_lib/settings"

interface DomainInfo {
  name: string
  verified: boolean
  verification: unknown[]
}

interface DnsInstruction {
  type: string
  name: string
  value: string
  description: string
}

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
  // Pickup option — separate from Quickshipper (couriers); reuses
  // the Quickshipper pickup address fields as the pickup point.
  allow_pickup: boolean
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
  // Google Ads / GA4 tracking
  google_ads_conversion_id: string
  google_ads_purchase_label: string
  google_analytics_id: string
  clarity_project_id: string
  google_maps_api_key: string
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
// the tenant sees both colours of the pair at once. Names: `template.themes.*`.
const VOLTAGE_THEME_SWATCHES: Record<VoltageTheme, { accent: string; accent2: string }> = {
  refurb: { accent: "#f0d860", accent2: "#3955d6" },
  cobalt: { accent: "#3955d6", accent2: "#f0d860" },
  ember: { accent: "#dd6b3a", accent2: "#1a1a2e" },
  forest: { accent: "#3a8c5a", accent2: "#e8d35a" },
  violet: { accent: "#8e4dd6", accent2: "#e6cc60" },
  mono: { accent: "#1a1a2e", accent2: "#f5f5f0" },
  rose: { accent: "#e35884", accent2: "#1a1a2e" },
}

// Font names are proper names (shown as is in every language).
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

const DEFAULT_SETTINGS: EcommerceSettings = {
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
  allow_pickup: false,
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
  google_ads_conversion_id: "",
  google_ads_purchase_label: "",
  google_analytics_id: "",
  clarity_project_id: "",
  google_maps_api_key: "",
}

const code = (chunks: ReactNode) => <code className="font-mono text-[11px]">{chunks}</code>
const strong = (chunks: ReactNode) => <strong className="font-medium text-foreground">{chunks}</strong>
function extLink(href: string) {
  return function ExternalLinkChunk(chunks: ReactNode) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
        {chunks}
      </a>
    )
  }
}

export default function EcommerceSettingsPage() {
  const t = useTranslations("ecommerceSettings")
  // Cleaning the order list is a store-admin action (the backend answers 403 otherwise).
  const { isStoreAdmin } = useMyAccess()
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [domains, setDomains] = useState<DomainInfo[]>([])
  const [newDomain, setNewDomain] = useState("")
  const [addingDomain, setAddingDomain] = useState(false)
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null)
  const [removingDomain, setRemovingDomain] = useState<string | null>(null)
  const [dnsInstructions, setDnsInstructions] = useState<DnsInstruction[]>([])
  const [copiedValue, setCopiedValue] = useState<string | null>(null)
  const [settings, setSettings] = useState<EcommerceSettings>(DEFAULT_SETTINGS)
  const [bogSecret, setBogSecret] = useState("")
  const [quickshipperApiKey, setQuickshipperApiKey] = useState("")
  const [hasQuickshipperKey, setHasQuickshipperKey] = useState(false)
  const [quickshipperWebhookSecret, setQuickshipperWebhookSecret] = useState("")
  const [testingQuickshipper, setTestingQuickshipper] = useState(false)
  const [hasExistingCredentials, setHasExistingCredentials] = useState(false)
  const [baseline, setBaseline] = useState(() => settingsFingerprint(DEFAULT_SETTINGS))
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo>({
    frontend_url: null,
    deployment_status: "pending",
    vercel_project_id: null,
  })

  const unknownError = t("toast.unknownError")

  useEffect(() => {
    fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await ecommerceAdminSettingsList()

      if (response.results && response.results.length > 0) {
        // TODO: bog_use_production is not in the generated EcommerceSettings type — fix backend serializer and regenerate
        const settingsData = response.results[0] as EcommerceSettingsType & { bog_use_production?: boolean }

        // Build active_payment_providers from data or derive from legacy fields
        const activeProviders: PaymentProvider[] = settingsData.active_payment_providers || []
        if (activeProviders.length === 0) {
          // Derive from legacy fields for backward compatibility
          if (settingsData.enable_card_payment) activeProviders.push("bog")
          if (settingsData.enable_cash_on_delivery) activeProviders.push("cash")
        }

        const next: EcommerceSettings = {
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
          allow_pickup:
            (settingsData as { allow_pickup?: boolean }).allow_pickup ?? false,
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
          google_ads_conversion_id:
            (settingsData as { google_ads_conversion_id?: string }).google_ads_conversion_id || "",
          google_ads_purchase_label:
            (settingsData as { google_ads_purchase_label?: string }).google_ads_purchase_label || "",
          google_analytics_id:
            (settingsData as { google_analytics_id?: string }).google_analytics_id || "",
          clarity_project_id:
            (settingsData as { clarity_project_id?: string }).clarity_project_id || "",
          google_maps_api_key:
            (settingsData as { google_maps_api_key?: string }).google_maps_api_key || "",
        }
        setSettings(next)
        setBaseline(settingsFingerprint(next))
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
      setLoadFailed(false)
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch settings:", error)
      toast.error(t("toast.loadError"))
      setLoadFailed(true)
      setLoading(false)
    }
  }

  const isProviderActive = (provider: PaymentProvider) =>
    settings.active_payment_providers.includes(provider)

  const toggleProvider = (provider: PaymentProvider) => {
    setSettings((prev) => {
      const active = toggleProviderList(prev.active_payment_providers, provider)
      // Sync legacy fields
      return { ...prev, active_payment_providers: active, ...legacyPaymentFlags(active) }
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
        toast.success(t("toast.deploySuccess", { url: result.url }))
      } else {
        setDeploymentInfo(prev => ({
          ...prev,
          deployment_status: "failed",
        }))
        toast.error(t("toast.deployFailed", { message: result.message || unknownError }))
      }
    } catch (error) {
      console.error("Failed to deploy frontend:", error)
      setDeploymentInfo(prev => ({
        ...prev,
        deployment_status: "failed",
      }))
      toast.error(t("toast.deployError", { message: requestErrorText(error, unknownError) }))
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
        toast.success(t("toast.deleteSuccess"))
      } else {
        toast.error(t("toast.deleteFailed", { message: result.error || unknownError }))
      }
    } catch (error) {
      console.error("Failed to delete deployment:", error)
      toast.error(t("toast.deleteFailed", { message: requestErrorText(error, unknownError) }))
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
      toast.error(t("toast.domainRequired"))
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
        toast.success(t("toast.domainAdded", { domain: response.data.domain }))
      } else {
        toast.error(t("toast.domainAddFailed", { message: response.data.error || unknownError }))
      }
    } catch (error) {
      console.error("Failed to add domain:", error)
      toast.error(t("toast.domainAddFailed", { message: requestErrorText(error, unknownError) }))
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
        toast.success(t("toast.domainRemoved", { domain }))
      } else {
        toast.error(t("toast.domainRemoveFailed", { message: response.data.error || unknownError }))
      }
    } catch (error) {
      console.error("Failed to remove domain:", error)
      toast.error(t("toast.domainRemoveFailed", { message: requestErrorText(error, unknownError) }))
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
        toast.success(t("toast.domainVerified", { domain }))
      } else {
        toast.error(t("toast.domainNotVerified", { domain }))
      }
    } catch (error) {
      console.error("Failed to verify domain:", error)
      toast.error(t("toast.domainVerifyFailed", { message: requestErrorText(error, unknownError) }))
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

  const handleTestQuickshipper = async () => {
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
          quickshipperConnectedParts(res, {
            connected: (name) => t("toast.qsConnected", { name }),
            account: t("toast.qsAccount"),
            balance: (balance) => t("toast.qsBalance", { balance }),
            noCouriers: t("toast.qsNoCouriers"),
          })
        )
      } else {
        toast.error(res.error || t("toast.qsRejected"))
      }
    } catch (err) {
      toast.error(requestErrorText(err, t("toast.qsTestFailed")))
    } finally {
      setTestingQuickshipper(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // TODO: bog_use_production is not in the generated EcommerceSettingsRequest — fix backend serializer and regenerate
      const payload: EcommerceSettingsRequest & { bog_use_production?: boolean } = {
        bog_client_id: settings.bog_client_id,
        bog_use_production: settings.bog_use_production,
        bog_return_url_success: settings.bog_return_url_success,
        bog_return_url_fail: settings.bog_return_url_fail,
        ...legacyPaymentFlags(settings.active_payment_providers),
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
          // Google Ads / GA4 tracking — same cast pattern as the
          // voltage fields above (newly added on the backend, not
          // reflected in the generated types yet).
          google_ads_conversion_id: settings.google_ads_conversion_id,
          google_ads_purchase_label: settings.google_ads_purchase_label,
          google_analytics_id: settings.google_analytics_id,
          clarity_project_id: settings.clarity_project_id,
          google_maps_api_key: settings.google_maps_api_key,
          // Pickup option
          allow_pickup: settings.allow_pickup,
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

      toast.success(t("toast.saved"))

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
      // Store settings writes need staff, role admin or manage_settings.
      toast.error(getApiErrorMessage(error, t("toast.saveFailed")))
    } finally {
      setSaving(false)
    }
  }

  const hasAnyProvider = settings.active_payment_providers.length > 0
  const dirty = settingsFingerprint(settings) !== baseline || !!bogSecret || !!quickshipperApiKey
  const secretLabels = { showLabel: t("page.showSecret"), hideLabel: t("page.hideSecret") }
  const set = <K extends keyof EcommerceSettings>(key: K, value: EcommerceSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  const header = <EcPageHeader icon={ShoppingBag} title={t("title")} description={t("subtitle")} />

  if (loading) {
    return (
      <EcPage width="narrow" gap={20} testId="ecommerce-settings-page">
        {header}
        <EcLoading className="py-24" />
      </EcPage>
    )
  }

  const status = deploymentInfo.deployment_status

  return (
    <EcPage width="narrow" gap={20} testId="ecommerce-settings-page">
      {header}

      {loadFailed && (
        <EcBanner
          tone="warning"
          icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
          action={
            <button type="button" onClick={fetchSettings} className={rdButton.outlineSm}>
              <RotateCw className="h-3.5 w-3.5" aria-hidden />
              {t("page.retry")}
            </button>
          }
        >
          {t("page.loadFailedBanner")}
        </EcBanner>
      )}

      {/* Store Information */}
      <SectionCard title={t("storeInfo.title")} hint={t("storeInfo.description")} testId="ec-settings-store">
        <FieldRow label={t("storeInfo.storeName")} htmlFor="store_name" align="center">
          <Input
            id="store_name"
            className={cn(settingsInput, fieldWidth)}
            value={settings.store_name}
            onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
            placeholder={t("storeInfo.storeNamePlaceholder")}
          />
        </FieldRow>
        <FieldRow label={t("storeInfo.storeEmail")} htmlFor="store_email" align="center">
          <Input
            id="store_email"
            type="email"
            className={cn(settingsInput, fieldWidth)}
            value={settings.store_email}
            onChange={(e) => setSettings({ ...settings, store_email: e.target.value })}
            placeholder={t("storeInfo.storeEmailPlaceholder")}
          />
        </FieldRow>
        <FieldRow label={t("storeInfo.storePhone")} htmlFor="store_phone" align="center">
          <Input
            id="store_phone"
            className={cn(settingsInput, fieldWidth, "tabular-nums")}
            value={settings.store_phone}
            onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
            placeholder={t("storeInfo.storePhonePlaceholder")}
          />
        </FieldRow>
      </SectionCard>

      {/* Orders: counts + "Clean order list" (store admins) */}
      {isStoreAdmin && <OrdersSection />}

      {/* Payment Methods */}
      <SectionCard
        title={t("paymentMethods.title")}
        hint={t("paymentMethods.description")}
        testId="ec-settings-payments"
      >
        {!hasAnyProvider && (
          <div className="border-b px-4 py-3">
            <Notice tone="warning">{t("paymentMethods.noProviderWarning")}</Notice>
          </div>
        )}

        {/* BOG Provider */}
        <ProviderBlock
          id="bog"
          label={t("paymentMethods.providerBog")}
          active={isProviderActive("bog")}
          onToggle={() => toggleProvider("bog")}
        >
          <Notice tone={hasExistingCredentials ? "success" : "warning"}>
            {hasExistingCredentials ? t("bog.credentialsConfigured") : t("bog.noCredentials")}
          </Notice>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <StackField
              label={t("bog.clientId")}
              suffix={t("bog.clientIdRequired")}
              htmlFor="bog_client_id"
              help={t("bog.clientIdHelp")}
            >
              <Input
                id="bog_client_id"
                className={cn(settingsInput, "font-mono")}
                value={settings.bog_client_id}
                onChange={(e) => setSettings({ ...settings, bog_client_id: e.target.value })}
              />
            </StackField>
            <StackField
              label={t("bog.clientSecret")}
              suffix={t("bog.clientSecretEncrypted")}
              htmlFor="bog_client_secret"
              help={hasExistingCredentials ? t("bog.clientSecretKeep") : t("bog.clientSecretNew")}
            >
              <PasswordInput
                id="bog_client_secret"
                value={bogSecret}
                onChange={setBogSecret}
                placeholder={hasExistingCredentials ? "••••••••••••••••" : " "}
                {...secretLabels}
              />
            </StackField>
          </div>
          <InlineSwitch
            id="bog_use_production"
            label={t("environment.productionMode")}
            help={t("environment.productionModeDesc")}
            checked={settings.bog_use_production}
            onChange={(checked) => setSettings({ ...settings, bog_use_production: checked })}
          />
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <StackField
              label={t("returnUrls.successUrl")}
              suffix={t("returnUrls.successUrlAfter")}
              htmlFor="bog_return_url_success"
              help={t("returnUrls.successUrlHelp")}
            >
              <Input
                id="bog_return_url_success"
                type="url"
                className={settingsInput}
                value={settings.bog_return_url_success}
                onChange={(e) => setSettings({ ...settings, bog_return_url_success: e.target.value })}
                placeholder={t("returnUrls.successUrlPlaceholder")}
              />
            </StackField>
            <StackField
              label={t("returnUrls.failUrl")}
              suffix={t("returnUrls.failUrlAfter")}
              htmlFor="bog_return_url_fail"
              help={t("returnUrls.failUrlHelp")}
            >
              <Input
                id="bog_return_url_fail"
                type="url"
                className={settingsInput}
                value={settings.bog_return_url_fail}
                onChange={(e) => setSettings({ ...settings, bog_return_url_fail: e.target.value })}
                placeholder={t("returnUrls.failUrlPlaceholder")}
              />
            </StackField>
          </div>
        </ProviderBlock>

        {/* TBC Provider */}
        <ProviderBlock
          id="tbc"
          label={t("paymentMethods.providerTbc")}
          active={isProviderActive("tbc")}
          onToggle={() => toggleProvider("tbc")}
        >
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <StackField label={t("paymentMethods.tbcClientId")} htmlFor="tbc_client_id">
              <Input
                id="tbc_client_id"
                className={cn(settingsInput, "font-mono")}
                value={settings.tbc_client_id}
                onChange={(e) => setSettings({ ...settings, tbc_client_id: e.target.value })}
              />
            </StackField>
            <StackField label={t("paymentMethods.tbcClientSecret")} htmlFor="tbc_client_secret">
              <PasswordInput
                id="tbc_client_secret"
                value={settings.tbc_client_secret}
                onChange={(value) => setSettings({ ...settings, tbc_client_secret: value })}
                placeholder=" "
                {...secretLabels}
              />
            </StackField>
            <StackField label={t("paymentMethods.tbcApiKey")} htmlFor="tbc_api_key" className="sm:col-span-2">
              <Input
                id="tbc_api_key"
                className={cn(settingsInput, "font-mono")}
                value={settings.tbc_api_key}
                onChange={(e) => setSettings({ ...settings, tbc_api_key: e.target.value })}
              />
            </StackField>
          </div>
          <InlineSwitch
            id="tbc_use_production"
            label={t("paymentMethods.tbcProductionMode")}
            checked={settings.tbc_use_production}
            onChange={(checked) => setSettings({ ...settings, tbc_use_production: checked })}
          />
        </ProviderBlock>

        {/* Flitt Provider */}
        <ProviderBlock
          id="flitt"
          label={t("paymentMethods.providerFlitt")}
          active={isProviderActive("flitt")}
          onToggle={() => toggleProvider("flitt")}
        >
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <StackField label={t("paymentMethods.flittMerchantId")} htmlFor="flitt_merchant_id">
              <Input
                id="flitt_merchant_id"
                className={cn(settingsInput, "font-mono")}
                value={settings.flitt_merchant_id}
                onChange={(e) => setSettings({ ...settings, flitt_merchant_id: e.target.value })}
              />
            </StackField>
            <StackField label={t("paymentMethods.flittPassword")} htmlFor="flitt_password">
              <PasswordInput
                id="flitt_password"
                value={settings.flitt_password}
                onChange={(value) => setSettings({ ...settings, flitt_password: value })}
                placeholder=" "
                {...secretLabels}
              />
            </StackField>
          </div>
        </ProviderBlock>

        {/* Paddle Provider */}
        <ProviderBlock
          id="paddle"
          label={t("paymentMethods.providerPaddle")}
          active={isProviderActive("paddle")}
          onToggle={() => toggleProvider("paddle")}
        >
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <StackField label={t("paymentMethods.paddleApiKey")} htmlFor="paddle_api_key">
              <PasswordInput
                id="paddle_api_key"
                value={settings.paddle_api_key || ""}
                onChange={(v) => setSettings((prev) => ({ ...prev, paddle_api_key: v }))}
                placeholder="pdl_..."
                {...secretLabels}
              />
            </StackField>
            <StackField label={t("paymentMethods.paddleClientToken")} htmlFor="paddle_client_token">
              <Input
                id="paddle_client_token"
                className={cn(settingsInput, "font-mono")}
                value={settings.paddle_client_token || ""}
                onChange={(e) => setSettings((prev) => ({ ...prev, paddle_client_token: e.target.value }))}
                placeholder="test_..."
              />
            </StackField>
            <StackField label={t("paymentMethods.paddleWebhookSecret")} htmlFor="paddle_webhook_secret" className="sm:col-span-2">
              <PasswordInput
                id="paddle_webhook_secret"
                value={settings.paddle_webhook_secret || ""}
                onChange={(v) => setSettings((prev) => ({ ...prev, paddle_webhook_secret: v }))}
                placeholder="pdl_ntfset_..."
                {...secretLabels}
              />
            </StackField>
          </div>
          <InlineSwitch
            id="paddle_use_production"
            label={t("paymentMethods.paddleProductionMode")}
            checked={settings.paddle_use_production || false}
            onChange={(v) => setSettings((prev) => ({ ...prev, paddle_use_production: v }))}
          />
        </ProviderBlock>

        {/* Cash on Delivery */}
        <ProviderBlock
          id="cash"
          label={t("paymentMethods.cashOnDelivery")}
          help={t("paymentMethods.cashOnDeliveryDesc")}
          active={isProviderActive("cash")}
          onToggle={() => toggleProvider("cash")}
        />
      </SectionCard>

      {/* Delivery — Quickshipper */}
      <SectionCard title={t("delivery.title")} hint={t("delivery.description")} testId="ec-settings-delivery">
        {/* Pickup option — sits at the top of the Delivery card
            because it shares the pickup address with Quickshipper. */}
        <FieldRow label={t("delivery.allowPickup")} help={t("delivery.allowPickupHelp")} htmlFor="allow_pickup" align="center">
          <Switch
            id="allow_pickup"
            checked={settings.allow_pickup}
            onCheckedChange={(checked) => setSettings({ ...settings, allow_pickup: checked })}
          />
        </FieldRow>
        <FieldRow label={t("delivery.enable")} help={t("delivery.enableHelp")} htmlFor="quickshipper_enabled" align="center">
          <Switch
            id="quickshipper_enabled"
            checked={settings.quickshipper_enabled}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, quickshipper_enabled: checked }))
            }
          />
        </FieldRow>

        {settings.quickshipper_enabled && (
          <>
            <FieldRow
              label={
                <span className="inline-flex flex-wrap items-center gap-2">
                  {t("delivery.apiKey")}
                  {hasQuickshipperKey && (
                    <TonePill tone="success" dot>
                      {t("delivery.keyOnFile")}
                    </TonePill>
                  )}
                </span>
              }
              htmlFor="quickshipper_api_key"
              align="center"
            >
              <PasswordInput
                id="quickshipper_api_key"
                className={fieldWidth}
                value={quickshipperApiKey}
                onChange={setQuickshipperApiKey}
                placeholder={hasQuickshipperKey ? t("delivery.apiKeyKeep") : t("delivery.apiKeyPaste")}
                {...secretLabels}
              />
            </FieldRow>
            <FieldRow
              label={t("delivery.productionMode")}
              help={t("delivery.productionModeHelp")}
              htmlFor="quickshipper_use_production"
              align="center"
            >
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
            </FieldRow>

            <div className="flex min-w-0 flex-col gap-3 border-b px-4 py-3.5" data-testid="ec-settings-pickup">
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium">{t("delivery.pickupAddress")}</span>
                <span className="text-xs leading-[17px] text-muted-foreground">{t("delivery.pickupAddressHelp")}</span>
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <StackField label={t("delivery.contactName")} htmlFor="quickshipper_pickup_contact_name">
                  <Input
                    id="quickshipper_pickup_contact_name"
                    className={settingsInput}
                    value={settings.quickshipper_pickup_contact_name}
                    onChange={(e) => set("quickshipper_pickup_contact_name", e.target.value)}
                    placeholder={t("delivery.contactNamePlaceholder")}
                  />
                </StackField>
                <StackField label={t("delivery.phone")} htmlFor="quickshipper_pickup_phone">
                  <Input
                    id="quickshipper_pickup_phone"
                    className={cn(settingsInput, "tabular-nums")}
                    value={settings.quickshipper_pickup_phone}
                    onChange={(e) => set("quickshipper_pickup_phone", e.target.value)}
                    placeholder="+995..."
                  />
                </StackField>
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                <StackField label={t("delivery.street")} htmlFor="quickshipper_pickup_address" className="sm:col-span-2">
                  <Input
                    id="quickshipper_pickup_address"
                    className={settingsInput}
                    value={settings.quickshipper_pickup_address}
                    onChange={(e) => set("quickshipper_pickup_address", e.target.value)}
                    placeholder={t("delivery.streetPlaceholder")}
                  />
                </StackField>
                <StackField label={t("delivery.city")} htmlFor="quickshipper_pickup_city">
                  <Input
                    id="quickshipper_pickup_city"
                    className={settingsInput}
                    value={settings.quickshipper_pickup_city}
                    onChange={(e) => set("quickshipper_pickup_city", e.target.value)}
                    placeholder={t("delivery.cityPlaceholder")}
                  />
                </StackField>
              </div>
              <StackField label={t("delivery.extraInstructions")} htmlFor="quickshipper_pickup_extra_instructions">
                <Input
                  id="quickshipper_pickup_extra_instructions"
                  className={settingsInput}
                  value={settings.quickshipper_pickup_extra_instructions}
                  onChange={(e) => set("quickshipper_pickup_extra_instructions", e.target.value)}
                  placeholder={t("delivery.extraInstructionsPlaceholder")}
                />
              </StackField>
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
                labels={{
                  dropPin: t("delivery.mapDropPin"),
                  movePin: t("delivery.mapMovePin"),
                  loading: t("delivery.mapLoading"),
                }}
              />
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3.5">
              <button
                type="button"
                className={rdButton.outline}
                disabled={testingQuickshipper || (!hasQuickshipperKey && !quickshipperApiKey)}
                onClick={handleTestQuickshipper}
              >
                {testingQuickshipper ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    {t("delivery.testing")}
                  </>
                ) : (
                  t("delivery.testConnection")
                )}
              </button>

              {quickshipperWebhookSecret && (
                <div className="flex min-w-0 flex-1 basis-[260px] items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5 text-xs">
                  <span className="shrink-0 font-medium text-muted-foreground">{t("delivery.webhookSecret")}</span>
                  <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{quickshipperWebhookSecret}</code>
                  <button
                    type="button"
                    className={rdButton.ghostIconSm}
                    aria-label={t("page.copy")}
                    title={t("page.copy")}
                    onClick={() => {
                      navigator.clipboard.writeText(quickshipperWebhookSecret)
                      toast.success(t("toast.copied"))
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </SectionCard>

      {/* Storefront Template */}
      <SectionCard title={t("template.title")} hint={t("template.description")} testId="ec-settings-template">
        <div className="flex min-w-0 flex-col gap-4 px-4 py-3.5">
          <div role="radiogroup" aria-label={t("template.title")} className="grid min-w-0 gap-3 sm:grid-cols-2">
            {(
              [
                {
                  value: "classic" as const,
                  label: t("template.classic"),
                  blurb: t("template.classicBlurb"),
                  preview: (
                    <div className="grid h-full grid-cols-3 gap-1">
                      <div className="col-span-2 rounded bg-muted"></div>
                      <div className="rounded bg-muted-foreground/20"></div>
                      <div className="col-span-3 rounded bg-muted-foreground/15"></div>
                    </div>
                  ),
                },
                {
                  value: "voltage" as const,
                  label: t("template.voltage"),
                  blurb: t("template.voltageBlurb"),
                  preview: (
                    <div className="grid h-full grid-cols-3 gap-1">
                      <div
                        className="col-span-2 rounded"
                        style={{ background: VOLTAGE_THEME_SWATCHES[settings.voltage_theme_preset].accent }}
                      ></div>
                      <div
                        className="rounded"
                        style={{ background: VOLTAGE_THEME_SWATCHES[settings.voltage_theme_preset].accent2 }}
                      ></div>
                      <div className="col-span-3 rounded bg-foreground/90"></div>
                    </div>
                  ),
                },
              ]
            ).map((opt) => {
              const checked = settings.storefront_template === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() =>
                    setSettings((prev) => ({ ...prev, storefront_template: opt.value }))
                  }
                  className={cn(
                    "flex min-w-0 flex-col rounded-lg border p-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    checked ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-muted-foreground/40"
                  )}
                  data-testid={`template-${opt.value}`}
                >
                  <div className="mb-3 h-14 w-full" aria-hidden>{opt.preview}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold">{opt.label}</span>
                    {checked && <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />}
                  </div>
                  <span className="mt-0.5 text-xs text-muted-foreground">{opt.blurb}</span>
                </button>
              )
            })}
          </div>

          {/* Voltage tweaks — only visible when Voltage is selected */}
          {settings.storefront_template === "voltage" && (
            <div className="flex min-w-0 flex-col gap-4 border-t pt-4" data-testid="voltage-tweaks">
              <StackField label={t("template.colourPreset")} help={t("template.colourPresetHelp")}>
                <div role="radiogroup" aria-label={t("template.colourPreset")} className="grid grid-cols-7 gap-2 sm:max-w-[360px]">
                  {(Object.keys(VOLTAGE_THEME_SWATCHES) as VoltageTheme[]).map((key) => {
                    const sw = VOLTAGE_THEME_SWATCHES[key]
                    const checked = settings.voltage_theme_preset === key
                    const name = t(`template.themes.${key}`)
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        aria-label={name}
                        title={name}
                        onClick={() =>
                          setSettings((prev) => ({ ...prev, voltage_theme_preset: key }))
                        }
                        className={cn(
                          "relative aspect-square rounded-lg border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                          checked ? "scale-105 border-foreground" : "border-transparent hover:scale-105"
                        )}
                        style={{ background: sw.accent }}
                      >
                        <span
                          className="absolute bottom-1 end-1 h-3 w-3 rounded-full border border-white/40"
                          style={{ background: sw.accent2 }}
                        ></span>
                        {checked && (
                          <Check className="absolute start-1 top-1 h-3 w-3 text-white drop-shadow" aria-hidden />
                        )}
                      </button>
                    )
                  })}
                </div>
              </StackField>

              {/* Mode + Density + Radius — three side-by-side segmented toggles */}
              <div className="grid min-w-0 gap-4 sm:grid-cols-3">
                <StackField label={t("template.mode")}>
                  <Segmented
                    size="md"
                    stretch
                    ariaLabel={t("template.mode")}
                    value={settings.voltage_color_mode}
                    onChange={(v) => setSettings((prev) => ({ ...prev, voltage_color_mode: v }))}
                    options={[
                      { value: "light", label: t("template.modeLight") },
                      { value: "dark", label: t("template.modeDark") },
                    ]}
                  />
                </StackField>
                <StackField label={t("template.density")}>
                  <Segmented
                    size="md"
                    stretch
                    ariaLabel={t("template.density")}
                    value={settings.voltage_density}
                    onChange={(v) => setSettings((prev) => ({ ...prev, voltage_density: v }))}
                    options={[
                      { value: "compact", label: t("template.densityCompact") },
                      { value: "cozy", label: t("template.densityCozy") },
                      { value: "comfortable", label: t("template.densityComfortable") },
                    ]}
                  />
                </StackField>
                <StackField label={t("template.radius")}>
                  <Segmented
                    size="md"
                    stretch
                    ariaLabel={t("template.radius")}
                    value={settings.voltage_radius}
                    onChange={(v) => setSettings((prev) => ({ ...prev, voltage_radius: v }))}
                    options={[
                      { value: "sharp", label: t("template.radiusSharp") },
                      { value: "soft", label: t("template.radiusSoft") },
                      { value: "rounded", label: t("template.radiusRound") },
                    ]}
                  />
                </StackField>
              </div>

              {/* Font pair */}
              <StackField label={t("template.fontPair")}>
                <div role="radiogroup" aria-label={t("template.fontPair")} className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {(Object.keys(VOLTAGE_FONT_PAIR_LABELS) as VoltageFontPair[]).map((key) => {
                    const fp = VOLTAGE_FONT_PAIR_LABELS[key]
                    const checked = settings.voltage_font_pair === key
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() =>
                          setSettings((prev) => ({ ...prev, voltage_font_pair: key }))
                        }
                        className={cn(
                          "flex min-w-0 flex-col items-center justify-center rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          checked ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-muted-foreground/40"
                        )}
                      >
                        <span className="mb-1 text-3xl font-bold leading-none" style={{ fontFamily: fp.family }}>
                          {fp.sample}
                        </span>
                        <span className="text-center text-[11px] text-muted-foreground">{fp.label}</span>
                      </button>
                    )
                  })}
                </div>
              </StackField>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Marketing — Google Ads / GA4 tracking */}
      <SectionCard title={t("marketing.title")} hint={t("marketing.description")} testId="ec-settings-marketing">
        <FieldRow
          label={t("marketing.adsTagId")}
          help={t.rich("marketing.adsTagIdHelp", { code })}
          htmlFor="google_ads_conversion_id"
        >
          <Input
            id="google_ads_conversion_id"
            className={cn(settingsInput, fieldWidth, "font-mono")}
            placeholder="AW-18133924374"
            value={settings.google_ads_conversion_id}
            onChange={(e) =>
              setSettings({ ...settings, google_ads_conversion_id: e.target.value.trim() })
            }
          />
        </FieldRow>
        <FieldRow
          label={t("marketing.purchaseLabel")}
          help={t.rich("marketing.purchaseLabelHelp", { code, strong })}
          htmlFor="google_ads_purchase_label"
        >
          <Input
            id="google_ads_purchase_label"
            className={cn(settingsInput, fieldWidth, "font-mono")}
            placeholder="abcDEFghi123456789"
            value={settings.google_ads_purchase_label}
            onChange={(e) =>
              setSettings({ ...settings, google_ads_purchase_label: e.target.value.trim() })
            }
          />
        </FieldRow>
        <FieldRow
          label={t("marketing.ga4")}
          help={t.rich("marketing.ga4Help", { code, link: extLink("https://analytics.google.com") })}
          htmlFor="google_analytics_id"
        >
          <Input
            id="google_analytics_id"
            className={cn(settingsInput, fieldWidth, "font-mono")}
            placeholder="G-XXXXXXXXXX"
            value={settings.google_analytics_id}
            onChange={(e) =>
              setSettings({ ...settings, google_analytics_id: e.target.value.trim() })
            }
          />
        </FieldRow>
        <FieldRow
          label={t("marketing.clarity")}
          help={t.rich("marketing.clarityHelp", { code, snippet: "<script>…</script>", link: extLink("https://clarity.microsoft.com") })}
          htmlFor="clarity_project_id"
        >
          <Input
            id="clarity_project_id"
            className={cn(settingsInput, fieldWidth, "font-mono placeholder:font-sans")}
            placeholder={t("marketing.clarityPlaceholder")}
            value={settings.clarity_project_id}
            onChange={(e) => {
              // Accept either just the project ID or the full Clarity
              // snippet they pasted from clarity.microsoft.com.
              setSettings({
                ...settings,
                clarity_project_id: parseClarityInput(e.target.value),
              })
            }}
          />
        </FieldRow>
        <FieldRow
          label={t("marketing.mapsKey")}
          help={
            <span className="flex flex-col gap-1.5">
              <span>{t.rich("marketing.mapsKeyHelp", { strong })}</span>
              <details>
                <summary className="cursor-pointer underline underline-offset-2">{t("marketing.mapsHowTo")}</summary>
                <ol className="mt-2 list-decimal space-y-1 ps-5">
                  <li>{t.rich("marketing.mapsStep1", { link: extLink("https://console.cloud.google.com"), strong })}</li>
                  <li>{t.rich("marketing.mapsStep2", { strong })}</li>
                  <li>{t.rich("marketing.mapsStep3", { strong })}</li>
                  <li>{t.rich("marketing.mapsStep4", { strong, code })}</li>
                  <li>{t.rich("marketing.mapsStep5", { strong, code })}</li>
                  <li>{t("marketing.mapsStep6")}</li>
                </ol>
              </details>
            </span>
          }
          htmlFor="google_maps_api_key"
        >
          <Input
            id="google_maps_api_key"
            className={cn(settingsInput, fieldWidth, "font-mono")}
            placeholder="AIzaSy…"
            value={settings.google_maps_api_key}
            onChange={(e) =>
              setSettings({ ...settings, google_maps_api_key: e.target.value.trim() })
            }
          />
        </FieldRow>
      </SectionCard>

      {/* Frontend Deployment */}
      <SectionCard title={t("deployment.title")} hint={t("deployment.description")} testId="ec-settings-deployment">
        <FieldRow label={t("deployment.status")} align="center">
          <TonePill tone={deploymentTone(status)} dot={status !== "deploying"} testId="ec-deploy-status">
            {status === "deploying" && <Loader2 className="me-1 inline h-3 w-3 animate-spin" aria-hidden />}
            {t(`deployment.state.${status}`)}
          </TonePill>
        </FieldRow>

        {/* Frontend URL */}
        {deploymentInfo.frontend_url && (
          <FieldRow label={t("deployment.frontendUrl")} help={t("deployment.frontendUrlLive")} align="center">
            <div className={cn("flex items-center gap-1.5", fieldWidth)}>
              <Input value={deploymentInfo.frontend_url} readOnly className={cn(settingsInput, "bg-muted font-mono")} aria-label={t("deployment.frontendUrl")} />
              <button
                type="button"
                className={cn(rdButton.outline, "w-8 px-0")}
                onClick={() => window.open(deploymentInfo.frontend_url!, "_blank")}
                aria-label={t("page.openInNewTab")}
                title={t("page.openInNewTab")}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </FieldRow>
        )}

        {/* Vercel Project ID */}
        {deploymentInfo.vercel_project_id && (
          <FieldRow label={t("deployment.vercelProjectId")} align="center">
            <Input
              value={deploymentInfo.vercel_project_id}
              readOnly
              aria-label={t("deployment.vercelProjectId")}
              className={cn(settingsInput, fieldWidth, "bg-muted font-mono text-xs")}
            />
          </FieldRow>
        )}

        <div className="flex min-w-0 flex-col gap-3 px-4 py-3.5">
          {/* Deploy/Redeploy Button */}
          {!deploymentInfo.frontend_url ? (
            <div>
              <button type="button" onClick={handleDeploy} disabled={deploying} className={rdButton.primary} data-testid="ec-deploy">
                {deploying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    {t("deployment.deployingFrontend")}
                  </>
                ) : (
                  <>
                    <Rocket className="h-3.5 w-3.5" aria-hidden />
                    {t("deployment.deployFrontend")}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDeploy}
                disabled={deploying || deleting}
                className={rdButton.outline}
                data-testid="ec-redeploy"
              >
                {deploying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    {t("deployment.redeploying")}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    {t("deployment.redeployFrontend")}
                  </>
                )}
              </button>
              <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deploying || deleting}
                  className={cn(rdButton.dangerSm, "h-8 px-2.5 text-[13px]")}
                  data-testid="ec-deploy-delete"
                >
                  {deleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {t("deployment.deleteDeployment")}
                </button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("deployment.deleteTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("deployment.deleteDescription")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("page.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>{t("page.delete")}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Info Message */}
          {!deploymentInfo.frontend_url && <Notice tone="info">{t("deployment.deployInfo")}</Notice>}
          {status === "failed" && <Notice tone="danger">{t("deployment.deployFailed")}</Notice>}
          {status === "deployed" && <Notice tone="success">{t("deployment.deploySuccess")}</Notice>}
        </div>
      </SectionCard>

      {/* Custom Domain Management - Only shown when deployed */}
      {deploymentInfo.vercel_project_id && (
        <SectionCard title={t("customDomain.title")} hint={t("customDomain.description")} testId="ec-settings-domains">
          {/* Add New Domain */}
          <FieldRow label={t("customDomain.addDomain")} help={t("customDomain.domainHelp")} htmlFor="ec-new-domain">
            <div className={cn("flex items-center gap-1.5", fieldWidth)}>
              <Input
                id="ec-new-domain"
                className={cn(settingsInput, "font-mono")}
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder={t("customDomain.domainPlaceholder")}
                disabled={addingDomain}
              />
              <button
                type="button"
                className={cn(rdButton.primary, "w-8 px-0")}
                onClick={handleAddDomain}
                disabled={addingDomain || !newDomain.trim()}
                aria-label={t("customDomain.addDomain")}
                title={t("customDomain.addDomain")}
              >
                {addingDomain ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
              </button>
            </div>
          </FieldRow>

          {/* DNS Instructions */}
          {dnsInstructions.length > 0 && (
            <div className="flex min-w-0 flex-col gap-2 border-b px-4 py-3.5">
              <span className="text-[13px] font-medium">{t("customDomain.dnsRequired")}</span>
              <Notice tone="warning">{t("customDomain.dnsInstruction")}</Notice>
              {dnsInstructions.map((instruction, index) => (
                <div key={index} className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-3">
                  <div className="grid min-w-0 gap-2 text-xs sm:grid-cols-[80px_minmax(0,1fr)_minmax(0,2fr)]">
                    <div className="min-w-0">
                      <span className="text-muted-foreground">{t("customDomain.dnsType")}</span>
                      <p className="font-mono font-medium">{instruction.type}</p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">{t("customDomain.dnsName")}</span>
                      <p className="break-all font-mono font-medium">{instruction.name}</p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">{t("customDomain.dnsValue")}</span>
                      <div className="flex items-center gap-1">
                        <p className="min-w-0 break-all font-mono font-medium">{instruction.value}</p>
                        <button
                          type="button"
                          className={cn(rdButton.ghostIconSm, "h-6 w-6")}
                          onClick={() => copyToClipboard(instruction.value)}
                          aria-label={t("page.copy")}
                          title={t("page.copy")}
                        >
                          {copiedValue === instruction.value ? (
                            <Check className="h-3 w-3 text-green-600" aria-hidden />
                          ) : (
                            <Copy className="h-3 w-3" aria-hidden />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{instruction.description}</p>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">{t("customDomain.dnsPropagation")}</p>
            </div>
          )}

          {/* Existing Domains List */}
          {domains.length > 0 && (
            <div className="border-b">
              <div className="px-4 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[.03em] text-muted-foreground">
                {t("customDomain.yourDomains")}
              </div>
              <ul>
                {domains.map((domain) => (
                  <li
                    key={domain.name}
                    className="flex min-h-11 min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-t px-4 py-2 first:border-t-0"
                    data-testid="ec-domain-row"
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 break-all font-mono text-xs">{domain.name}</span>
                    <TonePill tone={domain.verified ? "success" : "warning"} dot>
                      {domain.verified ? t("customDomain.verified") : t("customDomain.pendingVerification")}
                    </TonePill>
                    <span className="flex items-center gap-1">
                      {!domain.verified && (
                        <button
                          type="button"
                          className={rdButton.outlineSm}
                          onClick={() => handleVerifyDomain(domain.name)}
                          disabled={verifyingDomain === domain.name}
                        >
                          {verifyingDomain === domain.name ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : (
                            <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {t("customDomain.verify")}
                        </button>
                      )}
                      {domain.verified && (
                        <button
                          type="button"
                          className={rdButton.ghostIconSm}
                          onClick={() => window.open(`https://${domain.name}`, "_blank")}
                          aria-label={t("page.openInNewTab")}
                          title={t("page.openInNewTab")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      )}
                      <AlertDialog open={domainToRemove === domain.name} onOpenChange={(open) => !open && setDomainToRemove(null)}>
                        <button
                          type="button"
                          className={cn(rdButton.ghostIconSm, "hover:text-destructive")}
                          onClick={() => setDomainToRemove(domain.name)}
                          disabled={removingDomain === domain.name}
                          aria-label={t("customDomain.removeAria", { domain: domain.name })}
                          title={t("customDomain.removeTitle")}
                        >
                          {removingDomain === domain.name ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : (
                            <X className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </button>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("customDomain.removeTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("customDomain.removeDescription", { domain: domain.name })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("page.cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveDomain(domain.name)}>
                              {t("customDomain.remove")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          <div className="px-4 py-3.5">
            <Notice tone="info">
              <p className="font-medium">{t("customDomain.howToSetup")}</p>
              <ol className="mt-1 list-inside list-decimal space-y-0.5">
                <li>{t("customDomain.step1")}</li>
                <li>{t("customDomain.step2")}</li>
                <li>{t("customDomain.step3")}</li>
                <li>{t("customDomain.step4")}</li>
              </ol>
            </Notice>
          </div>
        </SectionCard>
      )}

      {/* Save bar */}
      <div
        className="sticky bottom-4 z-10 flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] border bg-background/95 px-4 py-2 shadow-[0_4px_16px_rgb(0_0_0/0.08)] backdrop-blur max-md:me-12"
        data-testid="ec-settings-savebar"
      >
        <span
          className={cn("min-w-0 flex-1 text-xs", !hasAnyProvider ? "text-destructive" : dirty ? "text-foreground" : "text-muted-foreground")}
          aria-live="polite"
        >
          {!hasAnyProvider ? t("paymentMethods.noProviderWarning") : dirty ? t("page.unsaved") : t("page.allSaved")}
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasAnyProvider}
          className={rdButton.primary}
          data-testid="ec-settings-save"
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {t("saving")}
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" aria-hidden />
              {t("save")}
            </>
          )}
        </button>
      </div>
    </EcPage>
  )
}
