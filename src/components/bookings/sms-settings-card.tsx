"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, RotateCcw, Send } from "lucide-react"
import { bookingsAdminSettingsTestSmsCreate } from "@/api/generated"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { rdButton } from "@/components/redesign/buttons"
import {
  ActionButton,
  FieldRow,
  SettingsNote,
  SettingsSection,
  SettingsToggle,
  settingsFieldWidth,
  settingsInputClass,
} from "@/components/redesign/settings"
import { useToast } from "@/hooks/use-toast"
import { useMyAccess } from "@/hooks/useMyAccess"
import { renderSmsTemplate, smsLength, smsSegments } from "@/lib/sms"
import { cn, getApiErrorMessage } from "@/lib/utils"

export const SMS_KINDS = ["reminder", "confirmed", "rescheduled", "cancelled", "created"] as const
export type SmsKind = (typeof SMS_KINDS)[number]
type SmsLanguage = "ka" | "en"
type Templates = Partial<Record<SmsKind, Partial<Record<SmsLanguage, string>>>>

const PLACEHOLDERS = ["business", "name", "service", "date", "time", "staff", "link"] as const

/** The SMS and reminder part of the booking settings (see BookingSettingsSerializer). */
export interface SmsSettings {
  reminder_hours_before: number
  second_reminder_hours_before: number | null
  sms_enabled: boolean
  sms_api_key?: string
  sms_api_key_clear?: boolean
  has_sms_api_key?: boolean
  sms_on_created: boolean
  sms_on_confirmed: boolean
  sms_on_rescheduled: boolean
  sms_on_cancelled: boolean
  sms_on_reminder: boolean
  sms_templates: Templates
  sms_default_templates?: Record<SmsKind, Record<SmsLanguage, string>>
  sms_platform_available?: boolean
  sms_platform_limit?: number
  sms_platform_sent_this_month?: number
  sms_sent_this_month?: number
}

export const SMS_SETTINGS_DEFAULTS: SmsSettings = {
  reminder_hours_before: 24,
  second_reminder_hours_before: null,
  sms_enabled: false,
  sms_api_key: "",
  sms_on_created: false,
  sms_on_confirmed: true,
  sms_on_rescheduled: true,
  sms_on_cancelled: true,
  sms_on_reminder: true,
  sms_templates: {},
}

interface Props<T extends SmsSettings> {
  settings: T
  onChange: (patch: Partial<SmsSettings>) => void
  businessName?: string
}

/** When customers are reminded — applies to the email and the SMS reminder alike. */
export function ReminderSettingsCard<T extends SmsSettings>({ settings, onChange }: Props<T>) {
  const t = useTranslations("bookingSettings.reminders")
  const second = settings.second_reminder_hours_before

  return (
    <SettingsSection title={t("title")} hint={t("description")} testId="booking-reminders">
      <FieldRow label={t("firstLabel")} htmlFor="reminder-hours" align="center">
        <div className="flex items-center gap-2">
          <input
            id="reminder-hours"
            type="number"
            min={1}
            max={168}
            className={cn(settingsInputClass, "w-24")}
            value={settings.reminder_hours_before}
            onChange={(e) => onChange({ reminder_hours_before: Math.max(1, parseInt(e.target.value) || 1) })}
          />
          <span className="text-xs text-muted-foreground">{t("hoursBefore")}</span>
        </div>
      </FieldRow>

      <FieldRow label={t("secondLabel")} help={t("secondDesc")} align="center">
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            {second !== null && second !== undefined && (
              <>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, settings.reminder_hours_before - 1)}
                  className={cn(settingsInputClass, "w-24")}
                  value={second}
                  aria-label={t("secondLabel")}
                  onChange={(e) => onChange({ second_reminder_hours_before: Math.max(1, parseInt(e.target.value) || 1) })}
                />
                <span className="text-xs text-muted-foreground">{t("hoursBefore")}</span>
              </>
            )}
            <SettingsToggle
              checked={second !== null && second !== undefined}
              aria-label={t("secondLabel")}
              onCheckedChange={(checked) =>
                onChange({ second_reminder_hours_before: checked ? Math.min(2, Math.max(1, settings.reminder_hours_before - 1)) : null })
              }
            />
          </div>
          {second !== null && second !== undefined && second >= settings.reminder_hours_before && (
            <span className="text-xs text-destructive">{t("secondMustBeCloser")}</span>
          )}
        </div>
      </FieldRow>
      <div className="px-4 py-3">
        <SettingsNote tone="neutral">{t("rules")}</SettingsNote>
      </div>
    </SettingsSection>
  )
}

/** SMS to customers: account, which notices, their texts, and a test send. */
export function SmsSettingsCard<T extends SmsSettings>({ settings, onChange, businessName }: Props<T>) {
  const t = useTranslations("bookingSettings.sms")
  const { toast } = useToast()
  // The test SMS is limited to booking admins (staff, admin or manager role).
  const { isBookingAdmin } = useMyAccess()
  const [kind, setKind] = useState<SmsKind>("reminder")
  const [language, setLanguage] = useState<SmsLanguage>("ka")
  const [testPhone, setTestPhone] = useState("")
  const [testing, setTesting] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const defaults = settings.sms_default_templates
  const custom = settings.sms_templates?.[kind]?.[language]
  const defaultText = defaults?.[kind]?.[language] || ""
  const text = custom ?? defaultText
  const isCustom = custom !== undefined && custom !== defaultText

  const setText = (value: string) => {
    onChange({
      sms_templates: { ...settings.sms_templates, [kind]: { ...settings.sms_templates?.[kind], [language]: value } },
    })
  }

  const resetText = () => {
    const forKind = { ...settings.sms_templates?.[kind] }
    delete forKind[language]
    onChange({ sms_templates: { ...settings.sms_templates, [kind]: forKind } })
  }

  const insertPlaceholder = (name: string) => {
    const field = textRef.current
    const token = `{${name}}`
    if (!field) return setText(text + token)
    const start = field.selectionStart ?? text.length
    const end = field.selectionEnd ?? text.length
    setText(text.slice(0, start) + token + text.slice(end))
    requestAnimationFrame(() => {
      field.focus()
      field.setSelectionRange(start + token.length, start + token.length)
    })
  }

  // What the customer would read, with example values
  const preview = renderSmsTemplate(text, {
    business: businessName || t("sample.business"),
    name: t("sample.name"),
    service: t("sample.service"),
    date: "06.10",
    time: "14:00",
    staff: t("sample.staff"),
    link: "book.echodesk.ge/…",
  })
  const segments = smsSegments(preview)

  const ownKey = !!settings.has_sms_api_key && !settings.sms_api_key_clear
  const typedKey = !!settings.sms_api_key
  const limit = settings.sms_platform_limit ?? 0
  const used = settings.sms_platform_sent_this_month ?? 0
  const canSend = ownKey || !!settings.sms_platform_available

  const sendTest = async () => {
    setTesting(true)
    try {
      const result = await bookingsAdminSettingsTestSmsCreate({ phone: testPhone, kind, language, text })
      toast({ title: t("test.sent"), description: result.text })
    } catch (error) {
      toast({ title: t("test.failed"), description: getApiErrorMessage(error, t("test.failed")), variant: "destructive" })
    } finally {
      setTesting(false)
    }
  }

  return (
    <SettingsSection
      title={t("title")}
      hint={t("description")}
      testId="booking-sms"
      actions={
        <SettingsToggle checked={settings.sms_enabled} onCheckedChange={(checked) => onChange({ sms_enabled: checked })} aria-label={t("title")} />
      }
    >
      {settings.sms_enabled ? (
        <>
          {/* Account */}
          <FieldRow label={t("account.title")}>
            <div className={cn("flex flex-col gap-2", settingsFieldWidth)}>
              <div className={cn("rounded-md border p-2.5 text-[13px]", !canSend && !typedKey && "border-destructive/50 bg-destructive/5")}>
                {ownKey ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>{t("account.own")}</span>
                    <ActionButton onClick={() => onChange({ sms_api_key_clear: true, sms_api_key: "" })}>{t("account.removeKey")}</ActionButton>
                  </div>
                ) : settings.sms_platform_available ? (
                  <div className="space-y-1">
                    <p>{t("account.platform")}</p>
                    <p className={cn("text-xs text-muted-foreground", used >= limit && "text-destructive")}>
                      {t("account.platformUsage", { used, limit })}
                    </p>
                  </div>
                ) : (
                  <p>{t("account.none")}</p>
                )}
              </div>
              <label htmlFor="sms-key" className="text-xs text-muted-foreground">
                {ownKey ? t("account.replaceKey") : t("account.ownKeyLabel")}
              </label>
              <input
                id="sms-key"
                type="password"
                autoComplete="off"
                className={settingsInputClass}
                value={settings.sms_api_key || ""}
                placeholder={ownKey ? "••••••••" : t("account.keyPlaceholder")}
                onChange={(e) => onChange({ sms_api_key: e.target.value, sms_api_key_clear: false })}
              />
              <p className="text-xs leading-[17px] text-muted-foreground">{t("account.keyHint")}</p>
              {typeof settings.sms_sent_this_month === "number" && (
                <p className="text-xs text-muted-foreground">{t("account.sentThisMonth", { n: settings.sms_sent_this_month })}</p>
              )}
            </div>
          </FieldRow>

          {/* Which notices */}
          <div className="border-b bg-muted/20 px-4 py-2 text-xs font-medium text-muted-foreground">{t("kinds.title")}</div>
          {SMS_KINDS.map((k) => {
            const field = `sms_on_${k}` as const
            return (
              <FieldRow key={k} label={t(`kinds.${k}`)} help={t(`kinds.${k}Desc`)} align="center">
                <SettingsToggle checked={settings[field]} onCheckedChange={(checked) => onChange({ [field]: checked })} aria-label={t(`kinds.${k}`)} />
              </FieldRow>
            )
          })}

          {/* Texts */}
          <div className="flex flex-col gap-3 border-b px-4 py-3.5">
            <span className="text-[13px] font-medium">{t("texts.title")}</span>
            <div className="flex flex-wrap gap-2">
              <Select value={kind} onValueChange={(value) => setKind(value as SmsKind)}>
                <SelectTrigger className="h-8 w-full text-[13px] sm:w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SMS_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {t(`kinds.${k}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                {(["ka", "en"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    aria-pressed={language === lang}
                    className={language === lang ? rdButton.primary : rdButton.outline}
                    onClick={() => setLanguage(lang)}
                  >
                    {lang === "ka" ? "ქართული" : "English"}
                  </button>
                ))}
              </div>
              {isCustom && (
                <button type="button" className={rdButton.outline} onClick={resetText}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  {t("texts.reset")}
                </button>
              )}
            </div>

            <Textarea ref={textRef} rows={3} maxLength={600} className="text-[13px]" value={text} onChange={(e) => setText(e.target.value)} />

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{t("texts.insert")}</span>
              {PLACEHOLDERS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => insertPlaceholder(name)}
                  title={t(`placeholders.${name}`)}
                  className="inline-flex h-5 items-center rounded border bg-muted/60 px-1.5 font-mono text-[11px] hover:bg-accent"
                >
                  {`{${name}}`}
                </button>
              ))}
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-[13px]">
              <p className="mb-1 text-xs text-muted-foreground">{t("texts.preview")}</p>
              <p className="whitespace-pre-wrap break-words">{preview || "—"}</p>
              <p className={cn("mt-2 text-xs text-muted-foreground", segments > 1 && "text-amber-600")}>
                {t("texts.counter", { chars: smsLength(preview), segments })}
                {segments > 1 && ` · ${t("texts.longHint")}`}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{t("texts.languageHint")}</p>
          </div>

          {/* Test */}
          <FieldRow label={t("test.title")} help={typedKey ? t("test.saveFirst") : t("test.hint")} htmlFor="sms-test-phone">
            <div className="flex flex-wrap gap-2">
              <input
                id="sms-test-phone"
                type="tel"
                className={cn(settingsInputClass, "w-full sm:w-[180px]")}
                placeholder="599 12 34 56"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <ActionButton
                icon={testing ? Loader2 : Send}
                className={cn("h-[34px]", testing && "[&>svg]:animate-spin")}
                disabled={testing || !isBookingAdmin || testPhone.replace(/\D/g, "").length < 9}
                onClick={sendTest}
              >
                {t("test.send")}
              </ActionButton>
            </div>
          </FieldRow>
        </>
      ) : null}
    </SettingsSection>
  )
}
