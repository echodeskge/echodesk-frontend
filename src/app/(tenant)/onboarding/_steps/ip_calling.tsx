"use client"

import { useTranslations } from "next-intl"
import { Cloud, Server } from "lucide-react"
import { TonePill } from "@/components/redesign/pill"
import { SectionCard } from "@/components/redesign/section-card"
import { Segmented } from "@/components/redesign/segmented"
import { SecretInput } from "@/components/redesign/settings/controls"
import type { Tone } from "@/components/redesign/tones"
import type { OnboardingStep } from "../_lib/onboarding-api"
import { errorAt } from "../_lib/nested-errors"
import { ChipsInput } from "../_components/ChipsInput"
import { CopyButton } from "../_components/CopyButton"
import { HoursGrid, MultiChoiceCards, NumberField, SelectField, TextField, UsersPicker, normalizeHours, usePickerUsers, pickerUserLabel, type HoursValue } from "../_components/fields"
import type { StepComponentProps, StepDefinition } from "./types"

/**
 * SCHEMAS.md `ip_calling`:
 * {"hosting": "byo"|"hosted",
 *  "server": {name, fqdn, public_ip, ami_port: 5038} | null,
 *  "trunk": {provider: "magti"|"silknet"|"other", sip_server, sip_port: 5060, username, password, realm, phone_numbers: [str], caller_id_number} | null,
 *  "agent_user_ids": [UserId],
 *  "queue": {strategy: "ringall"|"rrmemory"|"leastrecent", timeout_seconds: 30, max_wait_seconds: 300},
 *  "hours": {timezone, schedule: Hours, after_hours_action: "announcement"|"voicemail"|"forward", forward_number},
 *  "rating": {review_method: "none"|"callback"|"sms"|"both", sms_api_key: str|null}}
 * context = {server: {...status, install_command} | null, trunks: n, users: [...], hosted_request_sent: bool}
 */
export type Hosting = "byo" | "hosted"
export type TrunkProvider = "magti" | "silknet" | "other"
export type QueueStrategy = "ringall" | "rrmemory" | "leastrecent"
export type AfterHoursAction = "announcement" | "voicemail" | "forward"
export type ReviewMethod = "none" | "callback" | "sms" | "both"

export interface CallsServer {
  name: string
  fqdn: string
  public_ip: string
  ami_port: number | null
}

export interface CallsTrunk {
  provider: TrunkProvider
  sip_server: string
  sip_port: number | null
  username: string
  password: string
  realm: string
  phone_numbers: string[]
  caller_id_number: string
}

export interface CallsQueue {
  strategy: QueueStrategy
  timeout_seconds: number | null
  max_wait_seconds: number | null
}

export interface CallsHours {
  timezone: string
  schedule: HoursValue
  after_hours_action: AfterHoursAction
  forward_number: string
}

export interface CallsRating {
  review_method: ReviewMethod
  sms_api_key: string
}

export interface CallsAnswers {
  hosting: Hosting
  server: CallsServer
  trunk: CallsTrunk
  agent_user_ids: number[]
  queue: CallsQueue
  hours: CallsHours
  rating: CallsRating
  [key: string]: unknown
}

export const PROVIDERS: TrunkProvider[] = ["magti", "silknet", "other"]
export const STRATEGIES: QueueStrategy[] = ["ringall", "rrmemory", "leastrecent"]
const AFTER_HOURS: AfterHoursAction[] = ["announcement", "voicemail", "forward"]
const REVIEW_METHODS: ReviewMethod[] = ["none", "callback", "sms", "both"]
export const FIRST_EXTENSION = 100

export const TIMEZONES = [
  "Asia/Tbilisi",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Kiev",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Asia/Yerevan",
  "Asia/Baku",
  "Asia/Dubai",
  "America/New_York",
  "UTC",
]

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback)
const int = (v: unknown, fallback: number | null): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v)
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Math.trunc(Number(v))
  return fallback
}
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => ((list as readonly string[]).includes(str(v)) ? (v as T) : fallback)

/** Draft with every section filled; `server` from `context.server` when one is registered. */
export function initCallsAnswers(step: Pick<OnboardingStep, "answers" | "prefill" | "context">): CallsAnswers {
  const src = (Object.keys(step.answers ?? {}).length ? step.answers : step.prefill) ?? {}
  const ctx = step.context ?? {}
  const ctxServer = rec(ctx.server)
  const server = rec(src.server)
  const trunk = rec(src.trunk)
  const queue = rec(src.queue)
  const hours = rec(src.hours)
  const rating = rec(src.rating)
  return {
    hosting: oneOf(src.hosting, ["byo", "hosted"] as const, "byo"),
    server: {
      name: str(server.name, str(ctxServer.name)),
      fqdn: str(server.fqdn, str(ctxServer.fqdn)),
      public_ip: str(server.public_ip, str(ctxServer.public_ip)),
      ami_port: int(server.ami_port, int(ctxServer.ami_port, 5038)),
    },
    trunk: {
      provider: oneOf(trunk.provider, PROVIDERS, "magti"),
      sip_server: str(trunk.sip_server),
      sip_port: int(trunk.sip_port, 5060),
      username: str(trunk.username),
      password: str(trunk.password),
      realm: str(trunk.realm),
      phone_numbers: Array.isArray(trunk.phone_numbers) ? trunk.phone_numbers.filter((n): n is string => typeof n === "string" && !!n) : [],
      caller_id_number: str(trunk.caller_id_number),
    },
    agent_user_ids: Array.isArray(src.agent_user_ids) ? src.agent_user_ids.map((id) => int(id, null)).filter((id): id is number => id !== null) : [],
    queue: {
      strategy: oneOf(queue.strategy, STRATEGIES, "ringall"),
      timeout_seconds: int(queue.timeout_seconds, 30),
      max_wait_seconds: int(queue.max_wait_seconds, 300),
    },
    hours: {
      timezone: str(hours.timezone, "Asia/Tbilisi"),
      schedule: normalizeHours(hours.schedule),
      after_hours_action: oneOf(hours.after_hours_action, AFTER_HOURS, "announcement"),
      forward_number: str(hours.forward_number),
    },
    rating: {
      review_method: oneOf(rating.review_method, REVIEW_METHODS, "none"),
      sms_api_key: str(rating.sms_api_key),
    },
  }
}

/** Payload: `server` only for BYO, `trunk` null until a host and user are typed, keys null when unused. */
export function prepareCallsAnswers(a: CallsAnswers): CallsAnswers {
  const out: Record<string, unknown> = { hosting: a.hosting }

  out.server =
    a.hosting === "byo"
      ? { name: a.server.name.trim(), fqdn: a.server.fqdn.trim().toLowerCase(), public_ip: a.server.public_ip.trim(), ami_port: a.server.ami_port ?? 5038 }
      : null

  const t = a.trunk
  const sipServer = t.sip_server.trim()
  const username = t.username.trim()
  out.trunk =
    sipServer || username
      ? {
          provider: t.provider,
          sip_server: sipServer,
          sip_port: t.sip_port ?? 5060,
          username,
          password: t.password,
          realm: t.realm.trim(),
          phone_numbers: [...new Set(t.phone_numbers.map((n) => n.replace(/\s+/g, "")).filter(Boolean))],
          caller_id_number: t.caller_id_number.trim(),
        }
      : null

  out.agent_user_ids = [...new Set(a.agent_user_ids)]
  out.queue = { strategy: a.queue.strategy, timeout_seconds: a.queue.timeout_seconds ?? 30, max_wait_seconds: a.queue.max_wait_seconds ?? 300 }
  out.hours = {
    timezone: a.hours.timezone,
    schedule: a.hours.schedule,
    after_hours_action: a.hours.after_hours_action,
    forward_number: a.hours.after_hours_action === "forward" ? a.hours.forward_number.trim() : "",
  }
  const needsKey = a.rating.review_method === "sms" || a.rating.review_method === "both"
  out.rating = { review_method: a.rating.review_method, sms_api_key: needsKey ? a.rating.sms_api_key.trim() || null : null }
  return out as CallsAnswers
}

const SERVER_TONE: Record<string, Tone> = { active: "success", pending: "warning", provisioning: "info", error: "danger", revoked: "neutral" }

export function CallsStep({ answers, setAnswers, errors, context }: StepComponentProps<CallsAnswers>) {
  const t = useTranslations("onboarding.calls")
  const patch = <K extends "server" | "trunk" | "queue" | "hours" | "rating">(section: K, p: Partial<CallsAnswers[K]>) =>
    setAnswers((prev) => ({ ...prev, [section]: { ...prev[section], ...p } }))

  const ctxServer = rec(context.server)
  const hasServer = Object.keys(ctxServer).length > 0
  const serverStatus = str(ctxServer.status, "pending")
  const installCommand = str(ctxServer.install_command)
  const hostedRequestSent = context.hosted_request_sent === true
  const { users } = usePickerUsers(context.users)
  const agents = answers.agent_user_ids.map((id, i) => ({ id, ext: FIRST_EXTENSION + i, user: users.find((u) => u.id === id) }))
  const needsSmsKey = answers.rating.review_method === "sms" || answers.rating.review_method === "both"

  return (
    <div className="flex flex-col gap-4" data-testid="onb-step-ip_calling">
      <SectionCard title={t("hosting.title")} hint={t("hosting.hint")} bodyClassName="flex flex-col gap-3 p-4">
        <MultiChoiceCards
          options={[
            { value: "byo", label: t("hosting.byo"), description: t("hosting.byoHint"), icon: Server },
            { value: "hosted", label: t("hosting.hosted"), description: t("hosting.hostedHint"), icon: Cloud },
          ]}
          value={answers.hosting}
          onChange={(v) => setAnswers((prev) => ({ ...prev, hosting: v }))}
          columns={2}
          error={errorAt(errors, "hosting")}
          testId="onb-calls-hosting"
        />
        {answers.hosting === "hosted" && (
          <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-dashed bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground" data-testid="onb-calls-hosted-note">
            <span>{t("hosting.hostedNote")}</span>
            {hostedRequestSent && (
              <TonePill tone="success" dot>
                {t("hosting.requestSent")}
              </TonePill>
            )}
          </div>
        )}
      </SectionCard>

      {answers.hosting === "byo" && (
        <SectionCard title={t("server.title")} hint={t("server.hint")} bodyClassName="flex flex-col gap-4 p-4" testId="onb-calls-server">
          {hasServer && (
            <div className="flex flex-wrap items-center gap-2 text-[13px]" data-testid="onb-calls-server-status">
              <TonePill tone={SERVER_TONE[serverStatus] ?? "neutral"} dot>
                {t(`server.status.${serverStatus in SERVER_TONE ? serverStatus : "pending"}`)}
              </TonePill>
              <span className="font-mono text-xs">{str(ctxServer.fqdn)}</span>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={t("server.name")} value={answers.server.name} onChange={(v) => patch("server", { name: v })} placeholder="pbx" error={errorAt(errors, "server.name")} testId="onb-calls-server-name" />
            <TextField label={t("server.fqdn")} value={answers.server.fqdn} onChange={(v) => patch("server", { fqdn: v })} placeholder="pbx.company.ge" error={errorAt(errors, "server.fqdn")} testId="onb-calls-server-fqdn" />
            <TextField label={t("server.publicIp")} value={answers.server.public_ip} onChange={(v) => patch("server", { public_ip: v })} placeholder="203.0.113.10" error={errorAt(errors, "server.public_ip")} testId="onb-calls-server-ip" />
            <NumberField label={t("server.amiPort")} value={answers.server.ami_port} onChange={(v) => patch("server", { ami_port: v })} min={1} max={65535} error={errorAt(errors, "server.ami_port")} testId="onb-calls-server-ami" />
          </div>
          {hasServer && installCommand && (
            <div className="flex flex-col gap-2" data-testid="onb-calls-install">
              <span className="text-[13px] font-medium">{t("server.install")}</span>
              <span className="text-xs text-muted-foreground">{t("server.installHint")}</span>
              <code className="block max-w-full overflow-x-auto whitespace-pre rounded-md border bg-muted px-3 py-2 font-mono text-xs" data-testid="onb-calls-install-command">
                {installCommand}
              </code>
              <div>
                <CopyButton text={installCommand} label={t("server.copy")} copiedLabel={t("server.copied")} testId="onb-calls-install-copy" />
              </div>
            </div>
          )}
          {!hasServer && <span className="text-xs text-muted-foreground">{t("server.afterApply")}</span>}
        </SectionCard>
      )}

      <SectionCard title={t("trunk.title")} hint={t("trunk.hint")} bodyClassName="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">{t("trunk.provider")}</span>
          <Segmented size="md" ariaLabel={t("trunk.provider")} value={answers.trunk.provider} onChange={(v) => patch("trunk", { provider: v })} options={PROVIDERS.map((p) => ({ value: p, label: t(`trunk.providers.${p}`) }))} testId="onb-calls-provider" />
          {errorAt(errors, "trunk.provider") && (
            <span role="alert" className="text-xs text-destructive">
              {errorAt(errors, "trunk.provider")}
            </span>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label={t("trunk.host")} value={answers.trunk.sip_server} onChange={(v) => patch("trunk", { sip_server: v })} placeholder="sip.provider.ge" error={errorAt(errors, "trunk.sip_server")} className="sm:col-span-2" testId="onb-calls-trunk-host" />
          <NumberField label={t("trunk.port")} value={answers.trunk.sip_port} onChange={(v) => patch("trunk", { sip_port: v })} min={1} max={65535} error={errorAt(errors, "trunk.sip_port")} testId="onb-calls-trunk-port" />
          <TextField label={t("trunk.username")} value={answers.trunk.username} onChange={(v) => patch("trunk", { username: v })} autoComplete="off" error={errorAt(errors, "trunk.username")} testId="onb-calls-trunk-username" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="onb-calls-trunk-password" className="text-[13px] font-medium">
              {t("trunk.password")}
            </label>
            <SecretInput id="onb-calls-trunk-password" value={answers.trunk.password} onChange={(v) => patch("trunk", { password: v })} showLabel={t("trunk.show")} hideLabel={t("trunk.hide")} autoComplete="new-password" testId="onb-calls-trunk-password" />
            {errorAt(errors, "trunk.password") && (
              <span role="alert" className="text-xs text-destructive">
                {errorAt(errors, "trunk.password")}
              </span>
            )}
          </div>
          <TextField label={t("trunk.realm")} value={answers.trunk.realm} onChange={(v) => patch("trunk", { realm: v })} error={errorAt(errors, "trunk.realm")} testId="onb-calls-trunk-realm" />
        </div>
        <ChipsInput label={t("trunk.dids")} help={t("trunk.didsHint")} value={answers.trunk.phone_numbers} onChange={(phone_numbers) => patch("trunk", { phone_numbers })} placeholder="+995322000000" addLabel={t("trunk.addDid")} inputMode="tel" error={errorAt(errors, "trunk.phone_numbers")} testId="onb-calls-dids" />
        <TextField label={t("trunk.callerId")} help={t("trunk.callerIdHint")} value={answers.trunk.caller_id_number} onChange={(v) => patch("trunk", { caller_id_number: v })} placeholder={answers.trunk.phone_numbers[0] ?? "+995322000000"} error={errorAt(errors, "trunk.caller_id_number")} inputClassName="sm:max-w-[240px]" testId="onb-calls-caller-id" />
      </SectionCard>

      <SectionCard title={t("agents.title")} hint={t("agents.hint")} bodyClassName="flex flex-col gap-4 p-4">
        <UsersPicker users={context.users} value={answers.agent_user_ids} onChange={(agent_user_ids) => setAnswers((prev) => ({ ...prev, agent_user_ids }))} error={errorAt(errors, "agent_user_ids")} testId="onb-calls-agents" />
        {agents.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">{t("agents.extensions")}</span>
            <ul className="flex flex-wrap gap-1.5" data-testid="onb-calls-extensions">
              {agents.map((a) => (
                <li key={a.id} className="inline-flex h-6 items-center gap-1.5 rounded-full border bg-muted/60 px-2.5 text-xs" data-testid={`onb-calls-ext-${a.id}`}>
                  <span className="font-mono font-medium">{a.ext}</span>
                  <span className="text-muted-foreground">{a.user ? pickerUserLabel(a.user) : `#${a.id}`}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      <SectionCard title={t("queue.title")} hint={t("queue.hint")} bodyClassName="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">{t("queue.strategy")}</span>
          <Segmented size="md" ariaLabel={t("queue.strategy")} value={answers.queue.strategy} onChange={(v) => patch("queue", { strategy: v })} options={STRATEGIES.map((s) => ({ value: s, label: t(`queue.strategies.${s}`) }))} testId="onb-calls-strategy" />
          {errorAt(errors, "queue.strategy") && (
            <span role="alert" className="text-xs text-destructive">
              {errorAt(errors, "queue.strategy")}
            </span>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label={t("queue.timeout")} help={t("queue.timeoutHint")} value={answers.queue.timeout_seconds} onChange={(v) => patch("queue", { timeout_seconds: v })} min={5} max={120} suffix={t("queue.seconds")} error={errorAt(errors, "queue.timeout_seconds")} testId="onb-calls-timeout" />
          <NumberField label={t("queue.maxWait")} help={t("queue.maxWaitHint")} value={answers.queue.max_wait_seconds} onChange={(v) => patch("queue", { max_wait_seconds: v })} min={30} max={3600} suffix={t("queue.seconds")} error={errorAt(errors, "queue.max_wait_seconds")} testId="onb-calls-max-wait" />
        </div>
      </SectionCard>

      <SectionCard title={t("hours.title")} hint={t("hours.hint")} bodyClassName="flex flex-col gap-4 p-4">
        <SelectField label={t("hours.timezone")} value={answers.hours.timezone} onChange={(v) => patch("hours", { timezone: v })} options={[...new Set([answers.hours.timezone, ...TIMEZONES])].map((z) => ({ value: z, label: z }))} error={errorAt(errors, "hours.timezone")} selectClassName="sm:max-w-[260px]" testId="onb-calls-timezone" />
        <HoursGrid label={t("hours.schedule")} value={answers.hours.schedule} onChange={(schedule) => patch("hours", { schedule })} error={errorAt(errors, "hours.schedule")} testId="onb-calls-hours" />
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">{t("hours.afterHours")}</span>
          <Segmented size="md" ariaLabel={t("hours.afterHours")} value={answers.hours.after_hours_action} onChange={(v) => patch("hours", { after_hours_action: v })} options={AFTER_HOURS.map((a) => ({ value: a, label: t(`hours.actions.${a}`) }))} testId="onb-calls-after-hours" />
          {errorAt(errors, "hours.after_hours_action") && (
            <span role="alert" className="text-xs text-destructive">
              {errorAt(errors, "hours.after_hours_action")}
            </span>
          )}
        </div>
        {answers.hours.after_hours_action === "forward" && (
          <TextField label={t("hours.forwardNumber")} type="tel" value={answers.hours.forward_number} onChange={(v) => patch("hours", { forward_number: v })} placeholder="+995 5XX XX XX XX" error={errorAt(errors, "hours.forward_number")} inputClassName="sm:max-w-[240px]" testId="onb-calls-forward" />
        )}
      </SectionCard>

      <SectionCard title={t("rating.title")} hint={t("rating.hint")} bodyClassName="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">{t("rating.method")}</span>
          <Segmented size="md" ariaLabel={t("rating.method")} value={answers.rating.review_method} onChange={(v) => patch("rating", { review_method: v })} options={REVIEW_METHODS.map((m) => ({ value: m, label: t(`rating.methods.${m}`) }))} testId="onb-calls-rating" />
          {errorAt(errors, "rating.review_method") && (
            <span role="alert" className="text-xs text-destructive">
              {errorAt(errors, "rating.review_method")}
            </span>
          )}
        </div>
        {needsSmsKey && (
          <div className="flex flex-col gap-1.5 sm:max-w-[360px]">
            <label htmlFor="onb-calls-sms-key" className="text-[13px] font-medium">
              {t("rating.smsKey")}
            </label>
            <SecretInput id="onb-calls-sms-key" value={answers.rating.sms_api_key} onChange={(v) => patch("rating", { sms_api_key: v })} showLabel={t("trunk.show")} hideLabel={t("trunk.hide")} testId="onb-calls-sms-key" />
            <span className="text-xs text-muted-foreground">{t("rating.smsKeyHint")}</span>
            {errorAt(errors, "rating.sms_api_key") && (
              <span role="alert" className="text-xs text-destructive">
                {errorAt(errors, "rating.sms_api_key")}
              </span>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

export const step: StepDefinition<CallsAnswers> = {
  key: "ip_calling",
  titleKey: "steps.ip_calling.title",
  Component: CallsStep,
  init: initCallsAnswers,
  prepare: prepareCallsAnswers,
}
