"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarCheck, Copy, ExternalLink } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { LoadingBlock } from "@/components/redesign/states"
import {
  ActionButton,
  ChoiceControl,
  FieldRow,
  SecretInput,
  SettingsFormPage,
  SettingsSection,
  SettingsToggle,
  StickySaveBar,
  settingsFieldWidth,
  settingsInputClass,
} from "@/components/redesign/settings"
import { useToast } from "@/hooks/use-toast"
import { useMyAccess } from "@/hooks/useMyAccess"
import { cn, getApiErrorMessage } from "@/lib/utils"
import axios from "@/api/axios"
import { ReminderSettingsCard, SmsSettings, SmsSettingsCard, SMS_SETTINGS_DEFAULTS } from "@/components/bookings/sms-settings-card"

type PaymentMethod = "manual_transfer" | "bog_gateway"

interface BookingSettings extends SmsSettings {
  id?: number
  /** How online bookings are paid: bank transfer details shown to the client, or the BOG card gateway. */
  payment_method: PaymentMethod
  bank_name: string
  bank_iban: string
  bank_account_holder: string
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
  public_page_enabled: boolean
  public_description: Record<string, string>
  public_address: string
  public_phone: string
  timezone: string
  has_bog_client_id?: boolean
  has_bog_client_secret?: boolean
}

// Time zones a business here is likely to be in. Booking times, "today",
// lead time and the cancellation deadline are all judged on this clock.
const TIMEZONES = [
  "Asia/Tbilisi",
  "Asia/Yerevan",
  "Asia/Baku",
  "Europe/Istanbul",
  "Europe/Kyiv",
  "Europe/Warsaw",
  "Europe/Berlin",
  "Europe/London",
  "Asia/Dubai",
  "Asia/Almaty",
  "America/New_York",
  "UTC",
]

/** The list, plus the saved zone if it isn't one of the common ones. */
function timezoneOptions(current?: string): string[] {
  return current && !TIMEZONES.includes(current) ? [current, ...TIMEZONES] : TIMEZONES
}

/** "Asia/Tbilisi (GMT+4)" — offset computed for now, so it follows DST. */
function timezoneLabel(zone: string): string {
  try {
    const offset = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value
    return offset ? `${zone.replace(/_/g, " ")} (${offset})` : zone
  } catch {
    return zone
  }
}

export default function SettingsPage() {
  const t = useTranslations("bookingSettings")
  const { toast } = useToast()
  // Saving booking settings is limited to booking admins (staff, admin or manager role).
  const { isBookingAdmin } = useMyAccess()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // If the settings couldn't be loaded, saving would overwrite the real ones
  // with this form's defaults — so saving is blocked until a load succeeds.
  const [loadFailed, setLoadFailed] = useState(false)
  // The last loaded / saved values: Discard goes back to them, and the save bar
  // says "unsaved changes" while the form differs from them.
  const [savedSettings, setSavedSettings] = useState<BookingSettings | null>(null)
  const [settings, setSettings] = useState<BookingSettings>({
    payment_method: "manual_transfer",
    bank_name: "",
    bank_iban: "",
    bank_account_holder: "",
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
    public_page_enabled: true,
    public_description: {},
    public_address: "",
    public_phone: "",
    timezone: "Asia/Tbilisi",
    ...SMS_SETTINGS_DEFAULTS,
  })

  // book.echodesk.ge/<tenant> — the tenant is the dashboard's subdomain.
  const [bookingLink, setBookingLink] = useState("")
  useEffect(() => {
    const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || "echodesk.ge"
    const host = window.location.hostname
    const tenant = host.endsWith(`.${mainDomain}`)
      ? host.slice(0, -(mainDomain.length + 1))
      : window.localStorage.getItem("dev_tenant") || ""
    if (tenant) setBookingLink(`https://book.${mainDomain}/${tenant}`)
  }, [])

  const copyBookingLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingLink)
      toast({ title: t("publicPage.linkCopied") })
    } catch {
      toast({ title: t("error"), description: bookingLink, variant: "destructive" })
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/bookings/admin/settings/")
      const loaded = {
        ...response.data,
        // Stored credentials are never sent back; empty = "keep what's saved"
        bog_client_id: "",
        bog_client_secret: "",
        sms_api_key: "",
        sms_api_key_clear: false,
      }
      setSettings(loaded)
      setSavedSettings(loaded)
      setLoadFailed(false)
    } catch (error) {
      console.error("Failed to fetch settings:", error)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const {
        id: _id,
        has_bog_client_id: _hasId,
        has_bog_client_secret: _hasSecret,
        // read-only SMS information
        has_sms_api_key: _hasSmsKey,
        sms_default_templates: _smsDefaults,
        sms_platform_available: _smsPlatform,
        sms_platform_limit: _smsLimit,
        sms_platform_sent_this_month: _smsPlatformSent,
        sms_sent_this_month: _smsSent,
        ...dataToSend
      } = settings
      // Only send credentials the user actually typed
      if (!dataToSend.bog_client_id) delete (dataToSend as Partial<BookingSettings>).bog_client_id
      if (!dataToSend.bog_client_secret) delete dataToSend.bog_client_secret
      if (!dataToSend.sms_api_key) delete dataToSend.sms_api_key

      // The API creates the settings row on first read, so PATCH always applies.
      const response = await axios.patch("/api/bookings/admin/settings/", dataToSend)
      const saved = { ...response.data, bog_client_id: "", bog_client_secret: "", sms_api_key: "", sms_api_key_clear: false }
      setSettings(saved)
      setSavedSettings(saved)
      toast({ title: t("success"), description: t("settingsSaved") })
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast({ title: t("error"), description: getApiErrorMessage(error, t("settingsSaveFailed")), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const dirty = savedSettings !== null && JSON.stringify(settings) !== JSON.stringify(savedSettings)

  if (loading) {
    return (
      <section className="w-full p-4 sm:p-6">
        <LoadingBlock label={t("loading")} testId="booking-settings-loading" />
      </section>
    )
  }

  const toggleRow = (
    key: "public_page_enabled" | "require_deposit" | "allow_cash_payment" | "allow_card_payment" | "bog_use_production" | "auto_confirm_on_deposit" | "auto_confirm_on_full_payment",
    label: string,
    help: string
  ) => (
    <FieldRow label={label} help={help} htmlFor={`bk-${key}`} align="center">
      <SettingsToggle
        id={`bk-${key}`}
        checked={settings[key]}
        onCheckedChange={(checked) => setSettings({ ...settings, [key]: checked })}
      />
    </FieldRow>
  )

  return (
    <SettingsFormPage icon={CalendarCheck} title={t("title")} description={t("subtitle")} testId="booking-settings-page">
      <SettingsSection title={t("publicPage.title")} hint={t("publicPage.description")}>
        {toggleRow("public_page_enabled", t("publicPage.enabled"), t("publicPage.enabledDesc"))}
        {bookingLink && (
          <FieldRow label={t("publicPage.link")} help={t("publicPage.linkDesc")} htmlFor="booking_link">
            <div className={cn("flex flex-col gap-2", settingsFieldWidth)}>
              <input id="booking_link" readOnly value={bookingLink} className={cn(settingsInputClass, "font-mono text-xs")} />
              <div className="flex flex-wrap gap-1.5">
                <ActionButton icon={Copy} onClick={copyBookingLink}>
                  {t("publicPage.copy")}
                </ActionButton>
                <a
                  href={bookingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-[30px] items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ExternalLink className="h-[13px] w-[13px]" aria-hidden />
                  {t("publicPage.open")}
                </a>
              </div>
            </div>
          </FieldRow>
        )}
        <FieldRow label={t("publicPage.descriptionKa")} htmlFor="public_description_ka">
          <Textarea
            id="public_description_ka"
            rows={3}
            className={cn("min-h-[72px] text-[13px]", settingsFieldWidth)}
            value={settings.public_description?.ka || ""}
            onChange={(e) =>
              setSettings({
                ...settings,
                public_description: { ...settings.public_description, ka: e.target.value },
              })
            }
          />
        </FieldRow>
        <FieldRow label={t("publicPage.descriptionEn")} htmlFor="public_description_en">
          <Textarea
            id="public_description_en"
            rows={3}
            className={cn("min-h-[72px] text-[13px]", settingsFieldWidth)}
            value={settings.public_description?.en || ""}
            onChange={(e) =>
              setSettings({
                ...settings,
                public_description: { ...settings.public_description, en: e.target.value },
              })
            }
          />
        </FieldRow>
        <FieldRow label={t("publicPage.address")} htmlFor="public_address">
          <input
            id="public_address"
            className={cn(settingsInputClass, settingsFieldWidth)}
            value={settings.public_address || ""}
            onChange={(e) => setSettings({ ...settings, public_address: e.target.value })}
          />
        </FieldRow>
        <FieldRow label={t("publicPage.phone")} htmlFor="public_phone">
          <input
            id="public_phone"
            type="tel"
            className={cn(settingsInputClass, settingsFieldWidth)}
            value={settings.public_phone || ""}
            onChange={(e) => setSettings({ ...settings, public_phone: e.target.value })}
          />
        </FieldRow>
        <FieldRow label={t("publicPage.timezone")} help={t("publicPage.timezoneDesc")} htmlFor="booking_timezone">
          <Select
            value={settings.timezone || "Asia/Tbilisi"}
            onValueChange={(value) => setSettings({ ...settings, timezone: value })}
          >
            <SelectTrigger id="booking_timezone" className={cn("h-[34px] text-[13px]", settingsFieldWidth)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezoneOptions(settings.timezone).map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {timezoneLabel(zone)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
      </SettingsSection>

      <SettingsSection title={t("paymentSettings.title")} hint={t("paymentSettings.description")}>
        <FieldRow label={t("paymentSettings.paymentMethod")} help={t("paymentSettings.paymentMethodDesc")} align="center">
          <ChoiceControl
            value={settings.payment_method || "manual_transfer"}
            onChange={(value) => setSettings({ ...settings, payment_method: value })}
            options={[
              { value: "manual_transfer", label: t("paymentSettings.manualTransfer") },
              { value: "bog_gateway", label: t("paymentSettings.bogGateway") },
            ]}
            ariaLabel={t("paymentSettings.paymentMethod")}
            testId="bk-payment-method"
          />
        </FieldRow>
        {(settings.payment_method || "manual_transfer") === "manual_transfer" && (
          <>
            <FieldRow label={t("paymentSettings.bankName")} help={t("paymentSettings.bankHelp")} htmlFor="bank_name">
              <input
                id="bank_name"
                className={cn(settingsInputClass, settingsFieldWidth)}
                value={settings.bank_name || ""}
                onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                autoComplete="off"
              />
            </FieldRow>
            <FieldRow label={t("paymentSettings.bankIban")} htmlFor="bank_iban">
              <input
                id="bank_iban"
                className={cn(settingsInputClass, settingsFieldWidth, "font-mono text-xs uppercase")}
                value={settings.bank_iban || ""}
                onChange={(e) => setSettings({ ...settings, bank_iban: e.target.value.toUpperCase().replace(/\s+/g, "") })}
                placeholder="GE00XX0000000000000000"
                autoComplete="off"
              />
            </FieldRow>
            <FieldRow label={t("paymentSettings.bankAccountHolder")} htmlFor="bank_account_holder">
              <input
                id="bank_account_holder"
                className={cn(settingsInputClass, settingsFieldWidth)}
                value={settings.bank_account_holder || ""}
                onChange={(e) => setSettings({ ...settings, bank_account_holder: e.target.value })}
                autoComplete="off"
              />
            </FieldRow>
          </>
        )}
        {toggleRow("require_deposit", t("paymentSettings.requireDeposit"), t("paymentSettings.requireDepositDesc"))}
        {toggleRow("allow_cash_payment", t("paymentSettings.allowCash"), t("paymentSettings.allowCashDesc"))}
        {toggleRow("allow_card_payment", t("paymentSettings.allowCard"), t("paymentSettings.allowCardDesc"))}
      </SettingsSection>

      {settings.allow_card_payment && (
        <SettingsSection title={t("bogSettings.title")} hint={t("bogSettings.description")}>
          <FieldRow label={t("bogSettings.clientId")} htmlFor="bog_client_id">
            <input
              id="bog_client_id"
              className={cn(settingsInputClass, settingsFieldWidth)}
              value={settings.bog_client_id || ""}
              onChange={(e) => setSettings({ ...settings, bog_client_id: e.target.value })}
              placeholder={
                settings.has_bog_client_id ? t("bogSettings.savedPlaceholder") : t("bogSettings.clientIdPlaceholder")
              }
            />
          </FieldRow>
          <FieldRow label={t("bogSettings.clientSecret")} help={t("bogSettings.clientSecretHelp")} htmlFor="bog_client_secret">
            <SecretInput
              id="bog_client_secret"
              className={settingsFieldWidth}
              mono={false}
              value={settings.bog_client_secret || ""}
              onChange={(value) => setSettings({ ...settings, bog_client_secret: value })}
              placeholder={
                settings.has_bog_client_secret
                  ? t("bogSettings.savedPlaceholder")
                  : t("bogSettings.clientSecretPlaceholder")
              }
              showLabel={t("bogSettings.showSecret")}
              hideLabel={t("bogSettings.hideSecret")}
            />
          </FieldRow>
          {toggleRow("bog_use_production", t("bogSettings.productionMode"), t("bogSettings.productionModeDesc"))}
        </SettingsSection>
      )}

      <SettingsSection title={t("bookingRules.title")} hint={t("bookingRules.description")}>
        <FieldRow label={t("bookingRules.minHours")} help={t("bookingRules.minHoursDesc")} htmlFor="min_hours">
          <input
            id="min_hours"
            type="number"
            min="0"
            className={cn(settingsInputClass, "w-28")}
            value={settings.min_hours_before_booking}
            onChange={(e) => setSettings({ ...settings, min_hours_before_booking: parseInt(e.target.value) || 0 })}
          />
        </FieldRow>
        <FieldRow label={t("bookingRules.maxDays")} help={t("bookingRules.maxDaysDesc")} htmlFor="max_days">
          <input
            id="max_days"
            type="number"
            min="1"
            className={cn(settingsInputClass, "w-28")}
            value={settings.max_days_advance_booking}
            onChange={(e) => setSettings({ ...settings, max_days_advance_booking: parseInt(e.target.value) || 1 })}
          />
        </FieldRow>
      </SettingsSection>

      <SettingsSection title={t("cancellation.title")} hint={t("cancellation.description")}>
        <FieldRow label={t("cancellation.hours")} help={t("cancellation.hoursDesc")} htmlFor="cancellation_hours">
          <input
            id="cancellation_hours"
            type="number"
            min="0"
            className={cn(settingsInputClass, "w-28")}
            value={settings.cancellation_hours_before}
            onChange={(e) => setSettings({ ...settings, cancellation_hours_before: parseInt(e.target.value) || 0 })}
          />
        </FieldRow>
        <FieldRow label={t("cancellation.refundPolicy")} help={t("cancellation.refundPolicyDesc")} htmlFor="refund_policy">
          <Select
            value={settings.refund_policy}
            onValueChange={(value) => setSettings({ ...settings, refund_policy: value as BookingSettings["refund_policy"] })}
          >
            <SelectTrigger id="refund_policy" className={cn("h-[34px] text-[13px]", settingsFieldWidth)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">{t("cancellation.refundFull")}</SelectItem>
              <SelectItem value="partial_50">{t("cancellation.refund50")}</SelectItem>
              <SelectItem value="partial_25">{t("cancellation.refund25")}</SelectItem>
              <SelectItem value="no_refund">{t("cancellation.noRefund")}</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </SettingsSection>

      <SettingsSection title={t("autoConfirm.title")} hint={t("autoConfirm.description")}>
        {toggleRow("auto_confirm_on_deposit", t("autoConfirm.onDeposit"), t("autoConfirm.onDepositDesc"))}
        {toggleRow("auto_confirm_on_full_payment", t("autoConfirm.onFullPayment"), t("autoConfirm.onFullPaymentDesc"))}
      </SettingsSection>

      <ReminderSettingsCard settings={settings} onChange={(patch) => setSettings((current) => ({ ...current, ...patch }))} />

      <SmsSettingsCard settings={settings} onChange={(patch) => setSettings((current) => ({ ...current, ...patch }))} />

      {/* The page's Save, now in the design save bar: same handler, same disabled rule. */}
      <StickySaveBar
        mode="always"
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={savedSettings ? () => setSettings(savedSettings) : undefined}
        saveDisabled={saving || loadFailed || !isBookingAdmin}
        message={loadFailed ? t("loadFailed") : undefined}
        messageTone="danger"
        labels={{
          unsaved: t("saveBar.unsaved"),
          discard: t("saveBar.discard"),
          save: t("saveSettings"),
          saving: t("saveBar.saving"),
          saved: t("saveBar.saved"),
        }}
        testId="booking-settings-savebar"
      />
    </SettingsFormPage>
  )
}
