"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Store, Settings, Eye, EyeOff, CheckCircle2, AlertCircle, Link2, Globe, Rocket, RefreshCw, ExternalLink, Loader2, Trash2, Plus, X, RefreshCcw, Copy, Check } from "lucide-react"
import * as api from "@/api/generated/api"
import type { EcommerceSettings as EcommerceSettingsType, DeploymentResponse } from "@/api/generated/interfaces"
import { Badge } from "@/components/ui/badge"
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

interface DeploymentInfo {
  frontend_url: string | null
  deployment_status: "pending" | "deploying" | "deployed" | "failed"
  vercel_project_id: string | null
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
      const response = await api.ecommerceAdminSettingsList()

      if (response.results && response.results.length > 0) {
        const settingsData = response.results[0] as any
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

        // Extract deployment info if available
        if (settingsData.ecommerce_frontend_url !== undefined || settingsData.deployment_status !== undefined) {
          setDeploymentInfo({
            frontend_url: settingsData.ecommerce_frontend_url || null,
            deployment_status: settingsData.deployment_status || "pending",
            vercel_project_id: settingsData.vercel_project_id || null,
          })
        }
      }
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch settings:", error)
      alert("Failed to load ecommerce settings")
      setLoading(false)
    }
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
      const result = await api.ecommerceAdminSettingsDeployFrontendCreate({} as any)

      if (result.success) {
        setDeploymentInfo({
          frontend_url: result.url || (result as any).frontend_url,
          deployment_status: "deployed",
          vercel_project_id: result.project_id,
        })
        alert(`Frontend deployed successfully!\nURL: ${result.url || (result as any).frontend_url}`)
      } else {
        setDeploymentInfo(prev => ({
          ...prev,
          deployment_status: "failed",
        }))
        alert(`Deployment failed: ${(result as any).error || "Unknown error"}`)
      }
    } catch (error: any) {
      console.error("Failed to deploy frontend:", error)
      setDeploymentInfo(prev => ({
        ...prev,
        deployment_status: "failed",
      }))
      const errorMessage = error.response?.data?.error || error.message || "Unknown error"
      alert(`Failed to deploy frontend: ${errorMessage}`)
    } finally {
      setDeploying(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete the frontend deployment? This will remove the Vercel project.")) {
      return
    }

    try {
      setDeleting(true)

      // Call the delete-deployment endpoint
      const response = await axios.delete("/api/ecommerce/admin/settings/delete-deployment/")
      const result = response.data

      if (result.success) {
        setDeploymentInfo({
          frontend_url: null,
          deployment_status: "pending",
          vercel_project_id: null,
        })
        setDomains([])
        setDnsInstructions([])
        alert("Deployment deleted successfully")
      } else {
        alert(`Failed to delete deployment: ${result.error || "Unknown error"}`)
      }
    } catch (error: any) {
      console.error("Failed to delete deployment:", error)
      const errorMessage = error.response?.data?.error || error.message || "Unknown error"
      alert(`Failed to delete deployment: ${errorMessage}`)
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
      alert("Please enter a domain name")
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
        alert(`Domain ${response.data.domain} added successfully! Please configure DNS records as shown below.`)
      } else {
        alert(`Failed to add domain: ${response.data.error || "Unknown error"}`)
      }
    } catch (error: any) {
      console.error("Failed to add domain:", error)
      const errorMessage = error.response?.data?.error || error.message || "Unknown error"
      alert(`Failed to add domain: ${errorMessage}`)
    } finally {
      setAddingDomain(false)
    }
  }

  const handleRemoveDomain = async (domain: string) => {
    if (!confirm(`Are you sure you want to remove ${domain}?`)) {
      return
    }

    try {
      setRemovingDomain(domain)
      const response = await axios.post("/api/ecommerce/admin/settings/remove-domain/", {
        domain
      })

      if (response.data.success) {
        setDomains(prev => prev.filter(d => d.name !== domain))
        alert(`Domain ${domain} removed successfully`)
      } else {
        alert(`Failed to remove domain: ${response.data.error || "Unknown error"}`)
      }
    } catch (error: any) {
      console.error("Failed to remove domain:", error)
      const errorMessage = error.response?.data?.error || error.message || "Unknown error"
      alert(`Failed to remove domain: ${errorMessage}`)
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
        alert(`Domain ${domain} is now verified!`)
      } else {
        alert(`Domain ${domain} is not yet verified. Please ensure DNS records are configured correctly and try again in a few minutes.`)
      }
    } catch (error: any) {
      console.error("Failed to verify domain:", error)
      const errorMessage = error.response?.data?.error || error.message || "Unknown error"
      alert(`Failed to verify domain: ${errorMessage}`)
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

      {/* Frontend Deployment */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>Frontend Deployment</CardTitle>
          </div>
          <CardDescription>
            Deploy your e-commerce storefront to the web with one click
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Deployment Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Deployment Status</Label>
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
                  {deploymentInfo.deployment_status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Frontend URL */}
          {deploymentInfo.frontend_url && (
            <div className="space-y-2">
              <Label>Frontend URL</Label>
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
                Your storefront is live at this URL
              </p>
            </div>
          )}

          {/* Vercel Project ID */}
          {deploymentInfo.vercel_project_id && (
            <div className="space-y-2">
              <Label>Vercel Project ID</Label>
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
                    Deploying Frontend...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Deploy Frontend
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
                      Redeploying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Redeploy Frontend
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDelete}
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
              </div>
            )}
          </div>

          {/* Info Message */}
          {!deploymentInfo.frontend_url && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-800">
                Click "Deploy Frontend" to create your online store. This will deploy a fully functional e-commerce website configured with your store settings.
              </p>
            </div>
          )}

          {deploymentInfo.deployment_status === "failed" && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800">
                Last deployment failed. Please try again or contact support if the issue persists.
              </p>
            </div>
          )}

          {deploymentInfo.deployment_status === "deployed" && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800">
                Your storefront is live and accessible to customers. Any changes to store settings will require a redeploy.
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
              <CardTitle>Custom Domain</CardTitle>
            </div>
            <CardDescription>
              Connect your own domain to your storefront (e.g., shop.yourdomain.com)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Domain */}
            <div className="space-y-2">
              <Label>Add Custom Domain</Label>
              <div className="flex gap-2">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="shop.example.com"
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
                Enter your domain name without http:// or https://
              </p>
            </div>

            {/* DNS Instructions */}
            {dnsInstructions.length > 0 && (
              <div className="space-y-3">
                <Label>DNS Configuration Required</Label>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm font-medium text-yellow-800">
                      Add the following DNS record to your domain provider:
                    </p>
                  </div>
                  {dnsInstructions.map((instruction, index) => (
                    <div key={index} className="bg-white p-3 rounded border space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <p className="font-mono font-medium">{instruction.type}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Name:</span>
                          <p className="font-mono font-medium">{instruction.name}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Value:</span>
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
                    DNS changes can take up to 48 hours to propagate, but usually complete within a few minutes.
                  </p>
                </div>
              </div>
            )}

            {/* Existing Domains List */}
            {domains.length > 0 && (
              <div className="space-y-3">
                <Label>Your Domains</Label>
                <div className="space-y-2">
                  {domains.map((domain) => (
                    <div
                      key={domain.name}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">{domain.name}</span>
                        <Badge
                          variant={domain.verified ? "default" : "secondary"}
                          className={domain.verified ? "bg-green-500" : "bg-yellow-500"}
                        >
                          {domain.verified ? "Verified" : "Pending"}
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
                            <span className="ml-1">Verify</span>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDomain(domain.name)}
                          disabled={removingDomain === domain.name}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {removingDomain === domain.name ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
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
                <p className="font-medium">How to set up your custom domain:</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Add your domain above</li>
                  <li>Configure DNS records with your domain provider</li>
                  <li>Click "Verify" to check the configuration</li>
                  <li>Once verified, your store will be accessible via your custom domain</li>
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
          disabled={saving || (!settings.enable_card_payment && !settings.enable_cash_on_delivery)}
          size="lg"
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  )
}
