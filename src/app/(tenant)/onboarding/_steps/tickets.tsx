"use client"

import { useLocale, useTranslations } from "next-intl"
import { Briefcase, Clock, Headset, ListChecks, type LucideIcon } from "lucide-react"
import { SectionCard } from "@/components/redesign/section-card"
import { cn } from "@/lib/utils"
import { firstError, nestedError, rowErrorsOf, useOnboardingIndustry, type OnboardingStep } from "../_lib/onboarding-api"
import {
  ChipsField,
  EditableTable,
  MultiChoiceCards,
  NumberField,
  SecretField,
  TextField,
  Toggle,
  UsersPicker,
} from "../_components/fields"
import type { StepComponentProps, StepDefinition } from "./types"

/**
 * Tickets step (SCHEMAS.md `tickets`):
 * {"purpose": "support"|"tasks"|"jobs", "board_name": str, "team_user_ids": [id],
 *  "form_fields": ["phone","address","site","deadline", {"label","type"}], "tags": [str],
 *  "only_superadmin_can_delete_tickets": bool, "min_users_per_ticket": 0-100,
 *  "telegram": {"bot_token","chat_id"} | (omitted when empty)}
 * The draft keeps the built-in and custom form fields apart and the Telegram
 * pair flat; `prepareTicketsAnswers` folds them back into the contract shape.
 */
export type TicketPurpose = "support" | "tasks" | "jobs"
export type BuiltinField = "phone" | "address" | "site" | "deadline"
export type CustomFieldType = "string" | "text" | "number" | "date"

export interface CustomFieldRow {
  label: string
  type: CustomFieldType
}

export interface TicketsAnswers {
  purpose: TicketPurpose | null
  board_name: string
  team_user_ids: number[]
  builtin_fields: BuiltinField[]
  custom_fields: CustomFieldRow[]
  tags: string[]
  only_superadmin_can_delete_tickets: boolean
  min_users_per_ticket: number | null
  telegram_bot_token: string
  telegram_chat_id: string
  [key: string]: unknown
}

export interface PresetColumn {
  en: string
  ka: string
  is_default?: boolean
  is_closed?: boolean
  track_time?: boolean
}

export const PURPOSES: TicketPurpose[] = ["support", "tasks", "jobs"]
export const BUILTIN_FIELDS: BuiltinField[] = ["phone", "address", "site", "deadline"]
export const CUSTOM_FIELD_TYPES: CustomFieldType[] = ["string", "text", "number", "date"]

/** Default board name per purpose (the ka label is UI-only, per the contract). */
export const DEFAULT_BOARD_NAME: Record<TicketPurpose, string> = { support: "Support", tasks: "Tasks", jobs: "Jobs" }

/** PLAN §3 column presets, used when `context.presets` does not carry them. */
export const FALLBACK_PRESETS: Record<TicketPurpose, PresetColumn[]> = {
  support: [
    { en: "New", ka: "ახალი", is_default: true },
    { en: "In progress", ka: "მიმდინარე", track_time: true },
    { en: "Waiting for customer", ka: "მომხმარებლის მოლოდინში" },
    { en: "Resolved", ka: "გადაჭრილი", is_closed: true },
  ],
  tasks: [
    { en: "To do", ka: "შესასრულებელი", is_default: true },
    { en: "In progress", ka: "მიმდინარე", track_time: true },
    { en: "Review", ka: "განხილვა" },
    { en: "Done", ka: "დასრულებული", is_closed: true },
  ],
  jobs: [
    { en: "New", ka: "ახალი", is_default: true },
    { en: "Scheduled", ka: "დაგეგმილი" },
    { en: "In progress", ka: "მიმდინარე", track_time: true },
    { en: "Done", ka: "დასრულებული", is_closed: true },
  ],
}

const PURPOSE_ICON: Record<TicketPurpose, LucideIcon> = { support: Headset, tasks: ListChecks, jobs: Briefcase }

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback
}

/** Accepts the column shapes the backend may send: `"New"`, `{en, ka}`, `{name, name_ka}`, `{name: {en, ka}}`. */
export function normalizePresetColumn(raw: unknown): PresetColumn | null {
  if (typeof raw === "string") return raw ? { en: raw, ka: raw } : null
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const nameObj = r.name && typeof r.name === "object" ? (r.name as Record<string, unknown>) : null
  const en = str(r.en) || str(r.name_en) || (nameObj ? str(nameObj.en) : str(r.name))
  const ka = str(r.ka) || str(r.name_ka) || (nameObj ? str(nameObj.ka) : "") || en
  if (!en && !ka) return null
  return {
    en: en || ka,
    ka,
    is_default: r.is_default === true,
    is_closed: r.is_closed === true || r.is_closed_status === true,
    track_time: r.track_time === true,
  }
}

/** Columns of a purpose: `context.presets[purpose]` when present, else the PLAN preset. */
export function presetColumns(context: Record<string, unknown>, purpose: TicketPurpose): PresetColumn[] {
  const presets = context.presets && typeof context.presets === "object" ? (context.presets as Record<string, unknown>) : null
  const raw = presets?.[purpose]
  if (Array.isArray(raw)) {
    const cols = raw.map(normalizePresetColumn).filter((c): c is PresetColumn => c !== null)
    if (cols.length > 0) return cols
  }
  return FALLBACK_PRESETS[purpose]
}

export function emptyCustomField(): CustomFieldRow {
  return { label: "", type: "string" }
}

function isDefaultBoardName(name: string): boolean {
  const clean = name.trim().toLowerCase()
  return !clean || Object.values(DEFAULT_BOARD_NAME).some((d) => d.toLowerCase() === clean)
}

/** Draft from the step payload: last answers if any, else prefill, with defaults for missing keys. */
export function initTicketsAnswers(step: Pick<OnboardingStep, "answers" | "prefill">): TicketsAnswers {
  const src = (Object.keys(step.answers ?? {}).length ? step.answers : step.prefill) ?? {}
  const purposeRaw = str(src.purpose)
  const purpose = (PURPOSES as string[]).includes(purposeRaw) ? (purposeRaw as TicketPurpose) : null
  const builtin: BuiltinField[] = []
  const custom: CustomFieldRow[] = []
  if (Array.isArray(src.form_fields)) {
    for (const f of src.form_fields) {
      if (typeof f === "string") {
        if ((BUILTIN_FIELDS as string[]).includes(f) && !builtin.includes(f as BuiltinField)) builtin.push(f as BuiltinField)
      } else if (f && typeof f === "object") {
        const r = f as Record<string, unknown>
        const type = str(r.type)
        custom.push({ label: str(r.label), type: (CUSTOM_FIELD_TYPES as string[]).includes(type) ? (type as CustomFieldType) : "string" })
      }
    }
  }
  const telegram = src.telegram && typeof src.telegram === "object" ? (src.telegram as Record<string, unknown>) : null
  const minUsers = typeof src.min_users_per_ticket === "number" ? src.min_users_per_ticket : null
  return {
    purpose,
    board_name: str(src.board_name) || (purpose ? DEFAULT_BOARD_NAME[purpose] : ""),
    team_user_ids: Array.isArray(src.team_user_ids) ? src.team_user_ids.filter((id): id is number => Number.isInteger(id)) : [],
    builtin_fields: builtin,
    custom_fields: custom,
    tags: Array.isArray(src.tags) ? src.tags.filter((t): t is string => typeof t === "string" && !!t) : [],
    only_superadmin_can_delete_tickets: src.only_superadmin_can_delete_tickets === true,
    min_users_per_ticket: minUsers,
    telegram_bot_token: telegram ? str(telegram.bot_token) : "",
    telegram_chat_id: telegram ? str(telegram.chat_id) : "",
  }
}

/** The contract payload: built-ins then custom rows in `form_fields`, Telegram only when filled. */
export function prepareTicketsAnswers(a: TicketsAnswers): Record<string, unknown> {
  // Unique case-insensitively (Tag names are matched by name on the backend).
  const tags: string[] = []
  for (const raw of a.tags) {
    const tag = raw.trim()
    if (tag && !tags.some((x) => x.toLowerCase() === tag.toLowerCase())) tags.push(tag)
  }
  const custom = a.custom_fields
    .map((r) => ({ label: r.label.trim(), type: r.type }))
    .filter((r) => r.label)
  const minUsers = Math.min(100, Math.max(0, Math.round(a.min_users_per_ticket ?? 0)))
  const payload: Record<string, unknown> = {
    board_name: a.board_name.trim() || (a.purpose ? DEFAULT_BOARD_NAME[a.purpose] : ""),
    team_user_ids: [...new Set(a.team_user_ids)],
    form_fields: [...BUILTIN_FIELDS.filter((f) => a.builtin_fields.includes(f)), ...custom],
    tags,
    only_superadmin_can_delete_tickets: !!a.only_superadmin_can_delete_tickets,
    min_users_per_ticket: minUsers,
  }
  if (a.purpose) payload.purpose = a.purpose
  const token = a.telegram_bot_token.trim()
  const chat = a.telegram_chat_id.trim()
  if (token || chat) payload.telegram = { bot_token: token, chat_id: chat }
  return payload
}

function ColumnPreview({ columns, boardName }: { columns: PresetColumn[]; boardName: string }) {
  const t = useTranslations("onboarding.tickets")
  const locale = useLocale()
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border bg-muted/30 p-3" data-testid="onb-tickets-preview">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{boardName || t("preview")}</span>
        <span>· {t("previewColumns", { count: columns.length })}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {columns.map((c, i) => {
          const name = locale === "ka" ? c.ka || c.en : c.en || c.ka
          return (
            <div
              key={`${i}-${c.en}`}
              className={cn(
                "flex min-w-[120px] shrink-0 flex-col gap-1 rounded-md border bg-card px-2.5 py-2",
                c.is_closed && "border-dashed"
              )}
              data-testid={`onb-tickets-preview-col-${i}`}
            >
              <span className="truncate text-[13px] font-medium">{name}</span>
              <span className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                {c.is_default && <span className="rounded bg-primary/10 px-1 text-primary">{t("previewDefault")}</span>}
                {c.is_closed && <span className="rounded bg-muted px-1">{t("previewClosed")}</span>}
                {c.track_time && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1">
                    <Clock className="h-2.5 w-2.5" aria-hidden />
                    {t("previewTime")}
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TicketsStep({ answers, setAnswers, errors, context }: StepComponentProps<TicketsAnswers>) {
  const t = useTranslations("onboarding.tickets")
  const industry = useOnboardingIndustry() ?? "other"
  const patch = (p: Partial<TicketsAnswers>) => setAnswers((prev) => ({ ...prev, ...p }))

  const tagSuggestions = t(`tagPresets.${industry}`)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  const columns = answers.purpose ? presetColumns(context, answers.purpose) : []
  const formFieldErrors = rowErrorsOf(errors, "form_fields")
  const builtinCount = BUILTIN_FIELDS.filter((f) => answers.builtin_fields.includes(f)).length
  const customRowErrors = answers.custom_fields.map((_, i) => formFieldErrors[builtinCount + i] ?? {})

  const choosePurpose = (purpose: TicketPurpose) =>
    patch({
      purpose,
      board_name: isDefaultBoardName(answers.board_name) ? DEFAULT_BOARD_NAME[purpose] : answers.board_name,
    })

  const toggleBuiltin = (field: BuiltinField) =>
    patch({
      builtin_fields: answers.builtin_fields.includes(field)
        ? answers.builtin_fields.filter((f) => f !== field)
        : [...answers.builtin_fields, field],
    })

  return (
    <div className="flex flex-col gap-4" data-testid="onb-step-tickets">
      <SectionCard title={t("purpose")} hint={t("purposeHint")} bodyClassName="flex flex-col gap-4 p-4">
        <MultiChoiceCards
          options={PURPOSES.map((p) => ({
            value: p,
            label: t(`purposes.${p}.label`),
            description: t(`purposes.${p}.description`),
            icon: PURPOSE_ICON[p],
          }))}
          value={answers.purpose}
          onChange={choosePurpose}
          columns={3}
          error={firstError(errors, "purpose")}
          testId="onb-tickets-purpose"
        />
        {answers.purpose && <ColumnPreview columns={columns} boardName={answers.board_name} />}
        <TextField
          label={t("boardName")}
          value={answers.board_name}
          onChange={(v) => patch({ board_name: v })}
          placeholder={t("boardNamePlaceholder")}
          error={firstError(errors, "board_name")}
          inputClassName="sm:max-w-[300px]"
          testId="onb-tickets-board-name"
        />
      </SectionCard>

      <SectionCard title={t("team")} hint={t("teamHint", { board: answers.board_name || "—" })} bodyClassName="p-4">
        <UsersPicker
          users={context.users}
          value={answers.team_user_ids}
          onChange={(team_user_ids) => patch({ team_user_ids })}
          error={firstError(errors, "team_user_ids")}
          testId="onb-tickets-team"
        />
      </SectionCard>

      <SectionCard title={t("fields")} hint={t("fieldsHint")} bodyClassName="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <div role="group" aria-label={t("builtinFields")} className="flex flex-wrap gap-1.5">
            {BUILTIN_FIELDS.map((f) => {
              const on = answers.builtin_fields.includes(f)
              return (
                <button
                  key={f}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggleBuiltin(f)}
                  data-state={on ? "on" : "off"}
                  data-testid={`onb-tickets-field-${f}`}
                  className={cn(
                    "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-colors",
                    on ? "border-primary bg-primary/5 text-foreground" : "border-dashed text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {on ? "✓ " : "+ "}
                  {t(`builtin.${f}`)}
                </button>
              )
            })}
          </div>
          {typeof errors?.form_fields === "string" || (Array.isArray(errors?.form_fields) && typeof errors.form_fields[0] === "string") ? (
            <span role="alert" className="text-xs text-destructive">
              {firstError(errors, "form_fields")}
            </span>
          ) : null}
        </div>
        <EditableTable<CustomFieldRow>
          label={t("customFields")}
          columns={[
            { key: "label", label: t("fieldLabel"), placeholder: t("fieldLabelPlaceholder"), width: "minmax(0,1.6fr)" },
            {
              key: "type",
              label: t("fieldType"),
              type: "select",
              options: CUSTOM_FIELD_TYPES.map((ft) => ({ value: ft, label: t(`fieldTypes.${ft}`) })),
              width: "140px",
            },
          ]}
          rows={answers.custom_fields}
          onChange={(custom_fields) => patch({ custom_fields })}
          newRow={emptyCustomField}
          rowErrors={customRowErrors}
          addLabel={t("addField")}
          emptyText={t("customFieldsEmpty")}
          testId="onb-tickets-custom"
        />
      </SectionCard>

      <SectionCard title={t("tags")} hint={t("tagsHint")} bodyClassName="p-4">
        <ChipsField
          value={answers.tags}
          onChange={(tags) => patch({ tags })}
          suggestions={tagSuggestions}
          placeholder={t("tagPlaceholder")}
          error={firstError(errors, "tags")}
          testId="onb-tickets-tags"
        />
      </SectionCard>

      <SectionCard title={t("rules")} bodyClassName="flex flex-col gap-4 p-4">
        <Toggle
          label={t("onlyAdminsDelete")}
          help={t("onlyAdminsDeleteHint")}
          checked={answers.only_superadmin_can_delete_tickets}
          onChange={(v) => patch({ only_superadmin_can_delete_tickets: v })}
          error={firstError(errors, "only_superadmin_can_delete_tickets")}
          testId="onb-tickets-only-admins"
        />
        <NumberField
          label={t("minUsers")}
          help={t("minUsersHint")}
          value={answers.min_users_per_ticket}
          onChange={(v) => patch({ min_users_per_ticket: v })}
          min={0}
          max={100}
          step={1}
          error={firstError(errors, "min_users_per_ticket")}
          testId="onb-tickets-min-users"
        />
      </SectionCard>

      <SectionCard title={t("telegram")} hint={t("telegramHint")} bodyClassName="flex flex-col gap-4 p-4">
        <SecretField
          label={t("botToken")}
          help={t("botTokenHint")}
          value={answers.telegram_bot_token}
          onChange={(v) => patch({ telegram_bot_token: v })}
          placeholder="123456789:AA…"
          error={nestedError(errors, "telegram.bot_token") ?? (typeof errors?.telegram === "string" ? errors.telegram : null)}
          testId="onb-tickets-bot-token"
        />
        <TextField
          label={t("chatId")}
          help={t("chatIdHint")}
          value={answers.telegram_chat_id}
          onChange={(v) => patch({ telegram_chat_id: v })}
          placeholder="-1001234567890"
          error={nestedError(errors, "telegram.chat_id")}
          inputClassName="sm:max-w-[300px]"
          testId="onb-tickets-chat-id"
        />
      </SectionCard>
    </div>
  )
}

export const step: StepDefinition<TicketsAnswers> = {
  key: "tickets",
  titleKey: "steps.tickets.title",
  Component: TicketsStep,
  init: initTicketsAnswers,
  prepare: prepareTicketsAnswers,
}
