"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import {
  Check,
  ExternalLink,
  Facebook,
  Globe,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  Sparkles,
  Users,
  UserCheck,
  type LucideIcon,
} from "lucide-react"
import axios from "@/api/axios"
import { useToast } from "@/hooks/use-toast"
import { useCreateWidgetConnection } from "@/hooks/api/useSocial"
import { rdButton } from "@/components/redesign/buttons"
import { SectionCard } from "@/components/redesign/section-card"
import { TonePill } from "@/components/redesign/pill"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { EmailConnectForm } from "@/components/email/EmailConnectForm"
import { TelegramLoginFields } from "@/components/telegram/TelegramLoginFields"
import { useTelegramLogin } from "@/components/telegram/useTelegramLogin"
import { WidgetInstallCard } from "@/components/widget-settings/WidgetInstallCard"
import { cn } from "@/lib/utils"
import { firstError, nestedError, rowErrorsOf, useOnboardingCache, type OnboardingStep } from "../_lib/onboarding-api"
import {
  EMPTY_I18N,
  EditableTable,
  HoursGrid,
  I18nTextField,
  MultiChoiceCards,
  SelectField,
  TimezoneField,
  Toggle,
  DEFAULT_TIMEZONE,
  normalizeHours,
  inputClass,
  type HoursValue,
  type I18nText,
} from "../_components/fields"
import type { StepComponentProps, StepDefinition } from "./types"

/**
 * Inbox step (SCHEMAS.md `social_integrations`):
 * {"channels": [...], "timezone", "hours": Hours, "welcome_message": I18n, "away_message": I18n,
 *  "assignment": "shared"|"claim", "collect_rating": bool,
 *  "quick_replies": [{"title", "message": I18n}], "ai": {"enabled","company_description","language"} | (omitted)}
 * Channel connections happen inline through the existing endpoints; `channels`
 * is informational (which channels the tenant wants).
 */
export type Channel = "facebook" | "whatsapp" | "telegram" | "email" | "widget"
export type Assignment = "shared" | "claim"
export type AiLanguage = "ka" | "en"

export interface QuickReplyRow {
  title: string
  message: I18nText
}

export interface AiAnswers {
  enabled: boolean
  company_description: string
  language: AiLanguage
}

export interface SocialAnswers {
  channels: Channel[]
  timezone: string
  hours: HoursValue
  welcome_message: I18nText
  away_message: I18nText
  assignment: Assignment
  collect_rating: boolean
  quick_replies: QuickReplyRow[]
  ai: AiAnswers | null
  [key: string]: unknown
}

export const CHANNELS: Channel[] = ["facebook", "whatsapp", "telegram", "email", "widget"]
const CHANNEL_ICON: Record<Channel, LucideIcon> = { facebook: Facebook, whatsapp: MessageCircle, telegram: Send, email: Mail, widget: Globe }
const CHANNEL_COLOR: Record<Channel, string> = {
  facebook: "#1877F2",
  whatsapp: "#25D366",
  telegram: "#229ED9",
  email: "#dc2626",
  widget: "#6366f1",
}

export const DEFAULT_OAUTH = {
  facebook_start: "/api/social/facebook/oauth/start/",
  whatsapp_start: "/api/social/whatsapp/oauth/start/",
}

/** Where the OAuth callback should come back to, if the backend learns to honour it. */
export const OAUTH_RETURN_TO = "onboarding"

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback
}

function i18n(v: unknown): I18nText {
  if (typeof v === "string") return { ka: v, en: v }
  if (v && typeof v === "object") {
    const r = v as Record<string, unknown>
    return { ka: str(r.ka), en: str(r.en) }
  }
  return { ...EMPTY_I18N }
}

export interface ConnectionInfo {
  count: number
  names: string[]
}

function nameOf(item: unknown): string | null {
  if (typeof item === "string") return item
  if (!item || typeof item !== "object") return null
  const r = item as Record<string, unknown>
  for (const key of ["name", "page_name", "display_name", "email_address", "label", "username", "phone_number", "business_name"]) {
    const v = r[key]
    if (typeof v === "string" && v) return v
  }
  return null
}

/** Counts a channel's `context.connections.<channel>` of whatever shape the backend sends. */
export function connectionInfo(raw: unknown): ConnectionInfo {
  if (Array.isArray(raw)) {
    const active = raw.filter((x) => !(x && typeof x === "object" && (x as Record<string, unknown>).is_active === false))
    return { count: active.length, names: active.map(nameOf).filter((n): n is string => !!n) }
  }
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>
    if (Array.isArray(r.accounts)) return connectionInfo(r.accounts)
    if (Array.isArray(r.pages)) return connectionInfo(r.pages)
    if (typeof r.connected === "boolean") return { count: r.connected ? 1 : 0, names: [nameOf(r)].filter((n): n is string => !!n) }
    const name = nameOf(r)
    return { count: 1, names: name ? [name] : [] }
  }
  return { count: 0, names: [] }
}

/** Per channel: Facebook pages + Instagram accounts count as one card. */
export function connectionsOf(context: Record<string, unknown>): Record<Channel, ConnectionInfo> {
  const c = context.connections && typeof context.connections === "object" ? (context.connections as Record<string, unknown>) : {}
  const fb = connectionInfo(c.facebook)
  const ig = connectionInfo(c.instagram)
  return {
    facebook: { count: fb.count + ig.count, names: [...fb.names, ...ig.names] },
    whatsapp: connectionInfo(c.whatsapp),
    telegram: connectionInfo(c.telegram),
    email: connectionInfo(c.email),
    widget: connectionInfo(c.widget),
  }
}

export function firstWidgetToken(context: Record<string, unknown>): string | null {
  const c = context.connections && typeof context.connections === "object" ? (context.connections as Record<string, unknown>) : {}
  const list = Array.isArray(c.widget) ? c.widget : []
  for (const w of list) {
    const token = w && typeof w === "object" ? (w as Record<string, unknown>).widget_token : null
    if (typeof token === "string" && token) return token
  }
  return null
}

export function emptyQuickReply(): QuickReplyRow {
  return { title: "", message: { ...EMPTY_I18N } }
}

function quickRepliesFrom(raw: unknown): QuickReplyRow[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((r): QuickReplyRow | null => {
      if (!r || typeof r !== "object") return null
      const rec = r as Record<string, unknown>
      return { title: str(rec.title), message: i18n(rec.message) }
    })
    .filter((r): r is QuickReplyRow => r !== null)
}

/** Draft: last answers, else prefill; quick replies fall back to the industry presets of `context`. */
export function initSocialAnswers(step: Pick<OnboardingStep, "answers" | "prefill" | "context">): SocialAnswers {
  const applied = Object.keys(step.answers ?? {}).length > 0
  const src = (applied ? step.answers : step.prefill) ?? {}
  const context = step.context ?? {}
  const channelsRaw = Array.isArray(src.channels) ? src.channels.filter((c): c is Channel => (CHANNELS as string[]).includes(c as string)) : []
  const connected = connectionsOf(context)
  const channels = [...new Set([...channelsRaw, ...CHANNELS.filter((c) => connected[c].count > 0)])]
  const assignment = str(src.assignment)
  let quick = quickRepliesFrom(src.quick_replies)
  if (quick.length === 0 && !applied) quick = quickRepliesFrom(context.quick_reply_presets)
  const hasAi = context.has_ai_feature === true
  const aiSrc = src.ai && typeof src.ai === "object" ? (src.ai as Record<string, unknown>) : null
  const aiLang = aiSrc ? str(aiSrc.language) : ""
  return {
    channels,
    timezone: str(src.timezone) || DEFAULT_TIMEZONE,
    hours: normalizeHours(src.hours),
    welcome_message: i18n(src.welcome_message),
    away_message: i18n(src.away_message),
    assignment: assignment === "claim" ? "claim" : "shared",
    collect_rating: src.collect_rating === true,
    quick_replies: quick,
    ai: hasAi
      ? {
          enabled: aiSrc?.enabled === true,
          company_description: aiSrc ? str(aiSrc.company_description) : "",
          language: aiLang === "en" ? "en" : "ka",
        }
      : null,
  }
}

function trimI18n(v: I18nText): I18nText {
  return { ka: v.ka.trim(), en: v.en.trim() }
}

/** Contract payload: trimmed texts, empty quick replies dropped, `ai` only with the feature. */
export function prepareSocialAnswers(a: SocialAnswers): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    channels: [...new Set(a.channels)],
    timezone: a.timezone || DEFAULT_TIMEZONE,
    hours: a.hours,
    welcome_message: trimI18n(a.welcome_message),
    away_message: trimI18n(a.away_message),
    assignment: a.assignment,
    collect_rating: !!a.collect_rating,
    quick_replies: a.quick_replies
      .map((r) => ({ title: r.title.trim(), message: trimI18n(r.message) }))
      .filter((r) => r.title || r.message.ka || r.message.en),
  }
  if (a.ai) {
    payload.ai = { enabled: !!a.ai.enabled, company_description: a.ai.company_description.trim(), language: a.ai.language }
  }
  return payload
}

/** `GET <oauth start>` → `{oauth_url}`; the step opens it in a new tab. */
export async function fetchOAuthUrl(startUrl: string): Promise<string> {
  const res = await axios.get<{ oauth_url?: string }>(startUrl, { params: { return_to: OAUTH_RETURN_TO } })
  const url = res.data?.oauth_url
  if (!url) throw new Error("No OAuth URL received")
  return url
}

function ChannelCard({
  channel,
  selected,
  onToggle,
  info,
  action,
  children,
}: {
  channel: Channel
  selected: boolean
  onToggle: () => void
  info: ConnectionInfo
  action?: ReactNode
  children?: ReactNode
}) {
  const t = useTranslations("onboarding.social")
  const Icon = CHANNEL_ICON[channel]
  const connected = info.count > 0
  return (
    <div
      className={cn("flex flex-col gap-3 rounded-[10px] border bg-card p-3", selected && "border-primary/60")}
      data-testid={`onb-social-channel-${channel}`}
      data-connected={connected ? "true" : "false"}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={t(`channels.${channel}.name`)}
          onClick={onToggle}
          data-testid={`onb-social-select-${channel}`}
          className={cn(
            "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"
          )}
        >
          {selected && <Check className="h-3 w-3" aria-hidden />}
        </button>
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white"
          style={{ backgroundColor: CHANNEL_COLOR[channel] }}
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[13px] font-medium">{t(`channels.${channel}.name`)}</span>
            <TonePill tone={connected ? "success" : "neutral"} testId={`onb-social-status-${channel}`}>
              {connected ? t("connectedCount", { count: info.count }) : t("notConnected")}
            </TonePill>
          </div>
          <span className="text-xs leading-[17px] text-muted-foreground [text-wrap:pretty]">{t(`channels.${channel}.description`)}</span>
          {info.names.length > 0 && (
            <span className="truncate text-xs text-muted-foreground" data-testid={`onb-social-names-${channel}`}>
              {info.names.slice(0, 3).join(", ")}
              {info.names.length > 3 ? ` +${info.names.length - 3}` : ""}
            </span>
          )}
        </div>
        {action && <div className="flex shrink-0 items-start">{action}</div>}
      </div>
      {children}
    </div>
  )
}

export function SocialIntegrationsStep({ answers, setAnswers, errors, context }: StepComponentProps<SocialAnswers>) {
  const t = useTranslations("onboarding.social")
  const { toast } = useToast()
  const cache = useOnboardingCache()
  const patch = (p: Partial<SocialAnswers>) => setAnswers((prev) => ({ ...prev, ...p }))

  // Connection status: from `context.connections`, plus what was connected in this session.
  const base = connectionsOf(context)
  const [local, setLocal] = useState<Partial<Record<Channel, ConnectionInfo>>>({})
  const info = (c: Channel): ConnectionInfo => local[c] ?? base[c]
  const markConnected = (c: Channel, name?: string | null) => {
    const prev = info(c)
    setLocal((all) => ({ ...all, [c]: { count: prev.count + 1, names: name ? [...prev.names, name] : prev.names } }))
    if (!answers.channels.includes(c)) patch({ channels: [...answers.channels, c] })
    cache.invalidate()
  }

  const toggleChannel = (c: Channel) =>
    patch({ channels: answers.channels.includes(c) ? answers.channels.filter((x) => x !== c) : [...answers.channels, c] })

  // Facebook / WhatsApp: OAuth in a new tab; re-poll the state when this tab regains focus.
  const oauth = context.oauth && typeof context.oauth === "object" ? (context.oauth as Record<string, unknown>) : {}
  const [oauthBusy, setOauthBusy] = useState<Channel | null>(null)
  const awaitingOAuth = useRef(false)
  useEffect(() => {
    const onFocus = () => {
      if (!awaitingOAuth.current) return
      awaitingOAuth.current = false
      cache.invalidate()
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const startOAuth = async (channel: "facebook" | "whatsapp") => {
    const startUrl = str(oauth[`${channel}_start`]) || DEFAULT_OAUTH[`${channel}_start`]
    setOauthBusy(channel)
    try {
      const url = await fetchOAuthUrl(startUrl)
      awaitingOAuth.current = true
      const win = window.open(url, "_blank", "noopener")
      if (!win) window.location.href = url
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } }; message?: string }
      toast({ title: t("oauthFailed"), description: e.response?.data?.error || e.message, variant: "destructive" })
    } finally {
      setOauthBusy(null)
    }
  }

  // Telegram: inline phone → code → 2FA.
  const [telegramOpen, setTelegramOpen] = useState(false)
  const telegram = useTelegramLogin({
    notify: { success: (m) => toast({ title: m }), error: (m) => toast({ title: m, variant: "destructive" }) },
    onConnected: (res) => {
      setTelegramOpen(false)
      const a = res.account
      markConnected("telegram", a ? [a.first_name, a.last_name].filter(Boolean).join(" ") || a.username || a.phone_number : null)
    },
  })

  // E-mail: the connect form in a sheet.
  const [emailOpen, setEmailOpen] = useState(false)

  // Website chat: create the widget, then show the embed snippet.
  const createWidget = useCreateWidgetConnection()
  const [widgetToken, setWidgetToken] = useState<string | null>(() => firstWidgetToken(context))
  const [snippetOpen, setSnippetOpen] = useState(false)
  const onCreateWidget = async () => {
    try {
      const res = await createWidget.mutateAsync({ label: t("widgetDefaultLabel") })
      setWidgetToken(res.widget_token)
      setSnippetOpen(true)
      markConnected("widget", res.label || null)
      toast({ title: t("widgetCreated") })
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } }; message?: string }
      toast({ title: t("widgetFailed"), description: e.response?.data?.error || e.message, variant: "destructive" })
    }
  }

  const connectButton = (channel: "facebook" | "whatsapp") => (
    <button
      type="button"
      onClick={() => startOAuth(channel)}
      disabled={oauthBusy !== null}
      className={rdButton.outlineSm}
      data-testid={`onb-social-connect-${channel}`}
    >
      {oauthBusy === channel ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ExternalLink className="h-3.5 w-3.5" aria-hidden />}
      {info(channel).count > 0 ? t("connectAnother") : t("connect")}
    </button>
  )

  const quickReplyErrors = rowErrorsOf(errors, "quick_replies")
  const ai = answers.ai

  return (
    <div className="flex flex-col gap-4" data-testid="onb-step-social">
      <SectionCard title={t("channels.title")} hint={t("channels.hint")} bodyClassName="flex flex-col gap-3 p-4">
        {firstError(errors, "channels") && (
          <span role="alert" className="text-xs text-destructive">
            {firstError(errors, "channels")}
          </span>
        )}
        <ChannelCard
          channel="facebook"
          selected={answers.channels.includes("facebook")}
          onToggle={() => toggleChannel("facebook")}
          info={info("facebook")}
          action={connectButton("facebook")}
        />
        <ChannelCard
          channel="whatsapp"
          selected={answers.channels.includes("whatsapp")}
          onToggle={() => toggleChannel("whatsapp")}
          info={info("whatsapp")}
          action={connectButton("whatsapp")}
        />
        <ChannelCard
          channel="telegram"
          selected={answers.channels.includes("telegram")}
          onToggle={() => toggleChannel("telegram")}
          info={info("telegram")}
          action={
            !telegramOpen && (
              <button
                type="button"
                onClick={() => {
                  telegram.reset()
                  setTelegramOpen(true)
                }}
                className={rdButton.outlineSm}
                data-testid="onb-social-connect-telegram"
              >
                {info("telegram").count > 0 ? t("connectAnother") : t("connect")}
              </button>
            )
          }
        >
          {telegramOpen && (
            <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3" data-testid="onb-social-telegram-form">
              <TelegramLoginFields login={telegram} idPrefix="onb-tg" autoFocus={false} />
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => setTelegramOpen(false)} className={rdButton.outlineSm} data-testid="onb-social-telegram-cancel">
                  {t("cancel")}
                </button>
                {telegram.step === "phone" ? (
                  <button type="button" onClick={telegram.sendCode} disabled={!telegram.canSend} className={rdButton.primarySm} data-testid="onb-social-telegram-send">
                    {telegram.sending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                    {t("telegramSendCode")}
                  </button>
                ) : (
                  <button type="button" onClick={telegram.verify} disabled={!telegram.canVerify} className={rdButton.primarySm} data-testid="onb-social-telegram-verify">
                    {telegram.verifying && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                    {t("telegramVerify")}
                  </button>
                )}
              </div>
            </div>
          )}
        </ChannelCard>
        <ChannelCard
          channel="email"
          selected={answers.channels.includes("email")}
          onToggle={() => toggleChannel("email")}
          info={info("email")}
          action={
            <button type="button" onClick={() => setEmailOpen(true)} className={rdButton.outlineSm} data-testid="onb-social-connect-email">
              {info("email").count > 0 ? t("connectAnother") : t("connect")}
            </button>
          }
        />
        <ChannelCard
          channel="widget"
          selected={answers.channels.includes("widget")}
          onToggle={() => toggleChannel("widget")}
          info={info("widget")}
          action={
            widgetToken ? (
              <button type="button" onClick={() => setSnippetOpen((v) => !v)} className={rdButton.outlineSm} data-testid="onb-social-widget-snippet">
                {snippetOpen ? t("hideSnippet") : t("showSnippet")}
              </button>
            ) : (
              <button
                type="button"
                onClick={onCreateWidget}
                disabled={createWidget.isPending}
                className={rdButton.outlineSm}
                data-testid="onb-social-connect-widget"
              >
                {createWidget.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                {t("createWidget")}
              </button>
            )
          }
        >
          {widgetToken && snippetOpen && <WidgetInstallCard widgetToken={widgetToken} />}
        </ChannelCard>
      </SectionCard>

      <Sheet open={emailOpen} onOpenChange={setEmailOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-[560px]">
          <SheetHeader className="px-4 pt-4">
            <SheetTitle>{t("emailSheetTitle")}</SheetTitle>
            <SheetDescription>{t("emailSheetHint")}</SheetDescription>
          </SheetHeader>
          <EmailConnectForm
            showProviderChips
            onConnected={() => {
              setEmailOpen(false)
              markConnected("email")
            }}
            onCancel={() => setEmailOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <SectionCard title={t("hours.title")} hint={t("hours.hint")} bodyClassName="flex flex-col gap-4 p-4">
        <TimezoneField value={answers.timezone} onChange={(timezone) => patch({ timezone })} error={firstError(errors, "timezone")} testId="onb-social-timezone" />
        <HoursGrid value={answers.hours} onChange={(hours) => patch({ hours })} error={firstError(errors, "hours")} testId="onb-social-hours" />
      </SectionCard>

      <SectionCard title={t("messages.title")} hint={t("messages.hint")} bodyClassName="flex flex-col gap-4 p-4">
        <I18nTextField
          label={t("messages.welcome")}
          help={t("messages.welcomeHint")}
          value={answers.welcome_message}
          onChange={(welcome_message) => patch({ welcome_message })}
          multiline
          error={nestedError(errors, "welcome_message")}
          testId="onb-social-welcome"
        />
        <I18nTextField
          label={t("messages.away")}
          help={t("messages.awayHint")}
          value={answers.away_message}
          onChange={(away_message) => patch({ away_message })}
          multiline
          error={nestedError(errors, "away_message")}
          testId="onb-social-away"
        />
      </SectionCard>

      <SectionCard title={t("assignment.title")} bodyClassName="flex flex-col gap-4 p-4">
        <MultiChoiceCards
          options={[
            { value: "shared", label: t("assignment.shared"), description: t("assignment.sharedHint"), icon: Users },
            { value: "claim", label: t("assignment.claim"), description: t("assignment.claimHint"), icon: UserCheck },
          ]}
          value={answers.assignment}
          onChange={(assignment) => patch({ assignment })}
          columns={2}
          error={firstError(errors, "assignment")}
          testId="onb-social-assignment"
        />
        <Toggle
          label={t("rating")}
          help={t("ratingHint")}
          checked={answers.collect_rating}
          onChange={(collect_rating) => patch({ collect_rating })}
          error={firstError(errors, "collect_rating")}
          testId="onb-social-rating"
        />
      </SectionCard>

      <SectionCard title={t("quickReplies.title")} hint={t("quickReplies.hint")} bodyClassName="p-4">
        <EditableTable<QuickReplyRow>
          columns={[
            { key: "title", label: t("quickReplies.colTitle"), placeholder: t("quickReplies.titlePlaceholder"), width: "minmax(0,0.8fr)" },
            {
              key: "message",
              label: t("quickReplies.colMessage"),
              type: "custom",
              width: "minmax(0,2fr)",
              render: (row, update, index) => (
                <div className="flex flex-col gap-1.5 sm:flex-row">
                  {(["ka", "en"] as const).map((lang) => (
                    <input
                      key={lang}
                      type="text"
                      value={row.message[lang]}
                      placeholder={lang.toUpperCase()}
                      aria-label={`${t("quickReplies.colMessage")} ${lang.toUpperCase()}`}
                      onChange={(e) => update({ message: { ...row.message, [lang]: e.target.value } })}
                      className={cn(inputClass, "h-8 text-xs")}
                      data-testid={`onb-social-quick-row-${index}-message-${lang}`}
                    />
                  ))}
                </div>
              ),
            },
          ]}
          rows={answers.quick_replies}
          onChange={(quick_replies) => patch({ quick_replies })}
          newRow={emptyQuickReply}
          rowErrors={quickReplyErrors}
          error={typeof errors?.quick_replies === "string" ? errors.quick_replies : null}
          addLabel={t("quickReplies.add")}
          emptyText={t("quickReplies.empty")}
          testId="onb-social-quick"
        />
      </SectionCard>

      {ai && (
        <SectionCard
          title={
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              {t("ai.title")}
            </span>
          }
          hint={t("ai.hint")}
          bodyClassName="flex flex-col gap-4 p-4"
          testId="onb-social-ai"
        >
          <Toggle
            label={t("ai.enabled")}
            help={t("ai.enabledHint")}
            checked={ai.enabled}
            onChange={(enabled) => patch({ ai: { ...ai, enabled } })}
            error={nestedError(errors, "ai.enabled")}
            testId="onb-social-ai-enabled"
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="onb-social-ai-description" className="text-[13px] font-medium">
              {t("ai.description")}
            </label>
            <textarea
              id="onb-social-ai-description"
              value={ai.company_description}
              onChange={(e) => patch({ ai: { ...ai, company_description: e.target.value } })}
              placeholder={t("ai.descriptionPlaceholder")}
              rows={4}
              aria-invalid={nestedError(errors, "ai.company_description") ? true : undefined}
              className={cn(inputClass, "h-auto min-h-[96px] py-2")}
              data-testid="onb-social-ai-description"
            />
            {nestedError(errors, "ai.company_description") ? (
              <span role="alert" className="text-xs text-destructive" data-testid="onb-social-ai-description-error">
                {nestedError(errors, "ai.company_description")}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">{t("ai.descriptionHint")}</span>
            )}
          </div>
          <SelectField
            label={t("ai.language")}
            value={ai.language}
            onChange={(language) => patch({ ai: { ...ai, language } })}
            options={[
              { value: "ka", label: "ქართული" },
              { value: "en", label: "English" },
            ]}
            error={nestedError(errors, "ai.language")}
            selectClassName="sm:max-w-[240px]"
            testId="onb-social-ai-language"
          />
        </SectionCard>
      )}
    </div>
  )
}

export const step: StepDefinition<SocialAnswers> = {
  key: "social_integrations",
  titleKey: "steps.social_integrations.title",
  Component: SocialIntegrationsStep,
  init: initSocialAnswers,
  prepare: prepareSocialAnswers,
}
