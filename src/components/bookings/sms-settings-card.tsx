"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, RotateCcw, Send } from "lucide-react"
import { bookingsAdminSettingsTestSmsCreate } from "@/api/generated"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
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
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reminder-hours">{t("firstLabel")}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="reminder-hours"
              type="number"
              min={1}
              max={168}
              className="w-24"
              value={settings.reminder_hours_before}
              onChange={(e) => onChange({ reminder_hours_before: Math.max(1, parseInt(e.target.value) || 1) })}
            />
            <span className="text-sm text-muted-foreground">{t("hoursBefore")}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
          <div className="space-y-0.5">
            <Label>{t("secondLabel")}</Label>
            <p className="text-sm text-muted-foreground">{t("secondDesc")}</p>
          </div>
          <Switch
            checked={second !== null && second !== undefined}
            onCheckedChange={(checked) =>
              onChange({ second_reminder_hours_before: checked ? Math.min(2, Math.max(1, settings.reminder_hours_before - 1)) : null })
            }
          />
        </div>
        {second !== null && second !== undefined && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={Math.max(1, settings.reminder_hours_before - 1)}
              className="w-24"
              value={second}
              aria-label={t("secondLabel")}
              onChange={(e) => onChange({ second_reminder_hours_before: Math.max(1, parseInt(e.target.value) || 1) })}
            />
            <span className="text-sm text-muted-foreground">{t("hoursBefore")}</span>
            {second >= settings.reminder_hours_before && <span className="text-sm text-destructive">{t("secondMustBeCloser")}</span>}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t("rules")}</p>
      </CardContent>
    </Card>
  )
}

/** SMS to customers: account, which notices, their texts, and a test send. */
export function SmsSettingsCard<T extends SmsSettings>({ settings, onChange, businessName }: Props<T>) {
  const t = useTranslations("bookingSettings.sms")
  const { toast } = useToast()
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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <Switch checked={settings.sms_enabled} onCheckedChange={(checked) => onChange({ sms_enabled: checked })} aria-label={t("title")} />
        </div>
      </CardHeader>

      {settings.sms_enabled && (
        <CardContent className="space-y-6">
          {/* Account */}
          <div className="space-y-3">
            <Label>{t("account.title")}</Label>
            <div className={cn("rounded-md border p-3 text-sm", !canSend && !typedKey && "border-destructive/50 bg-destructive/5")}>
              {ownKey ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{t("account.own")}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => onChange({ sms_api_key_clear: true, sms_api_key: "" })}>
                    {t("account.removeKey")}
                  </Button>
                </div>
              ) : settings.sms_platform_available ? (
                <div className="space-y-1">
                  <p>{t("account.platform")}</p>
                  <p className={cn("text-muted-foreground", used >= limit && "text-destructive")}>
                    {t("account.platformUsage", { used, limit })}
                  </p>
                </div>
              ) : (
                <p>{t("account.none")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sms-key" className="text-sm font-normal text-muted-foreground">
                {ownKey ? t("account.replaceKey") : t("account.ownKeyLabel")}
              </Label>
              <Input
                id="sms-key"
                type="password"
                autoComplete="off"
                value={settings.sms_api_key || ""}
                placeholder={ownKey ? "••••••••" : t("account.keyPlaceholder")}
                onChange={(e) => onChange({ sms_api_key: e.target.value, sms_api_key_clear: false })}
              />
              <p className="text-xs text-muted-foreground">{t("account.keyHint")}</p>
            </div>
            {typeof settings.sms_sent_this_month === "number" && (
              <p className="text-xs text-muted-foreground">{t("account.sentThisMonth", { n: settings.sms_sent_this_month })}</p>
            )}
          </div>

          {/* Which notices */}
          <div className="space-y-3">
            <Label>{t("kinds.title")}</Label>
            {SMS_KINDS.map((k) => {
              const field = `sms_on_${k}` as const
              return (
                <div key={k} className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{t(`kinds.${k}`)}</p>
                    <p className="text-sm text-muted-foreground">{t(`kinds.${k}Desc`)}</p>
                  </div>
                  <Switch checked={settings[field]} onCheckedChange={(checked) => onChange({ [field]: checked })} aria-label={t(`kinds.${k}`)} />
                </div>
              )
            })}
          </div>

          {/* Texts */}
          <div className="space-y-3">
            <Label>{t("texts.title")}</Label>
            <div className="flex flex-wrap gap-2">
              <Select value={kind} onValueChange={(value) => setKind(value as SmsKind)}>
                <SelectTrigger className="w-[240px]">
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
                  <Button key={lang} type="button" size="sm" className="h-9" variant={language === lang ? "default" : "outline"} onClick={() => setLanguage(lang)}>
                    {lang === "ka" ? "ქართული" : "English"}
                  </Button>
                ))}
              </div>
              {isCustom && (
                <Button type="button" variant="ghost" size="sm" className="h-9" onClick={resetText}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  {t("texts.reset")}
                </Button>
              )}
            </div>

            <Textarea ref={textRef} rows={3} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} />

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{t("texts.insert")}</span>
              {PLACEHOLDERS.map((name) => (
                <button key={name} type="button" onClick={() => insertPlaceholder(name)} title={t(`placeholders.${name}`)}>
                  <Badge variant="secondary" className="cursor-pointer font-mono text-[11px] hover:bg-accent">{`{${name}}`}</Badge>
                </button>
              ))}
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-sm">
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
          <div className="space-y-2">
            <Label htmlFor="sms-test-phone">{t("test.title")}</Label>
            <div className="flex flex-wrap gap-2">
              <Input id="sms-test-phone" type="tel" className="w-[200px]" placeholder="599 12 34 56" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
              <Button type="button" variant="outline" disabled={testing || testPhone.replace(/\D/g, "").length < 9} onClick={sendTest}>
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {t("test.send")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{typedKey ? t("test.saveFirst") : t("test.hint")}</p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
