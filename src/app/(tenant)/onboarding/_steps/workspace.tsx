"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import {
  Building2,
  Headset,
  ImageIcon,
  MoreHorizontal,
  Scissors,
  ShoppingBag,
  Stethoscope,
  Truck,
  Upload,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { rdButton } from "@/components/redesign/buttons"
import { SectionCard } from "@/components/redesign/section-card"
import { cn } from "@/lib/utils"
import { INDUSTRIES, firstError, rowErrorsOf, uploadTenantLogo, type Industry, type OnboardingStep } from "../_lib/onboarding-api"
import { EditableTable, MultiChoiceCards, SelectField, TextField, inputClass } from "../_components/fields"
import type { StepComponentProps, StepDefinition } from "./types"

/**
 * Workspace step answers (RULES.md "Workspace step answers"):
 * {"company_name", "preferred_language": "ka"|"en"|"ru", "industry",
 *  "departments": [str], "team": [{email, first_name, last_name, role, department}]}
 * The logo goes through `/api/tenant-settings/upload-logo/` directly.
 */
export type TeamRole = "admin" | "manager" | "agent"
export type PreferredLanguage = "ka" | "en" | "ru"

export interface TeamRow {
  email: string
  first_name: string
  last_name: string
  role: TeamRole
  department: string | null
}

export interface WorkspaceAnswers {
  company_name: string
  preferred_language: PreferredLanguage
  industry: Industry | null
  departments: string[]
  team: TeamRow[]
  [key: string]: unknown
}

const LANGUAGES: PreferredLanguage[] = ["ka", "en", "ru"]
const ROLES: TeamRole[] = ["admin", "manager", "agent"]

const INDUSTRY_ICON: Record<Industry, LucideIcon> = {
  salon: Scissors,
  clinic: Stethoscope,
  real_estate: Building2,
  shop: ShoppingBag,
  call_centre: Headset,
  logistics: Truck,
  services: Wrench,
  other: MoreHorizontal,
}

export function emptyTeamRow(): TeamRow {
  return { email: "", first_name: "", last_name: "", role: "agent", department: null }
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback
}

/** Draft from the step payload: last answers if any, else prefill, with defaults for missing keys. */
export function initWorkspaceAnswers(step: Pick<OnboardingStep, "answers" | "prefill">): WorkspaceAnswers {
  const src = (Object.keys(step.answers ?? {}).length ? step.answers : step.prefill) ?? {}
  const lang = str(src.preferred_language)
  const industry = str(src.industry)
  const departments = Array.isArray(src.departments) ? src.departments.filter((d): d is string => typeof d === "string") : []
  const team = Array.isArray(src.team)
    ? src.team.map((row): TeamRow => {
        const r = (row ?? {}) as Record<string, unknown>
        const role = str(r.role)
        return {
          email: str(r.email),
          first_name: str(r.first_name),
          last_name: str(r.last_name),
          role: (ROLES as string[]).includes(role) ? (role as TeamRole) : "agent",
          department: typeof r.department === "string" && r.department ? r.department : null,
        }
      })
    : []
  return {
    company_name: str(src.company_name),
    preferred_language: (LANGUAGES as string[]).includes(lang) ? (lang as PreferredLanguage) : "ka",
    industry: (INDUSTRIES as string[]).includes(industry) ? (industry as Industry) : null,
    departments,
    team,
  }
}

/** Payload for apply: trimmed strings, unique departments, empty team rows dropped. */
export function prepareWorkspaceAnswers(a: WorkspaceAnswers): WorkspaceAnswers {
  const departments = [...new Set(a.departments.map((d) => d.trim()).filter(Boolean))]
  const team = a.team
    .map((r) => ({
      email: r.email.trim().toLowerCase(),
      first_name: r.first_name.trim(),
      last_name: r.last_name.trim(),
      role: r.role,
      department: r.department && departments.includes(r.department.trim()) ? r.department.trim() : null,
    }))
    .filter((r) => r.email || r.first_name || r.last_name)
  return {
    company_name: a.company_name.trim(),
    preferred_language: a.preferred_language,
    industry: a.industry,
    departments,
    team,
  }
}

function DepartmentChips({
  value,
  onChange,
  suggestions,
  error,
  testId = "onb-departments",
}: {
  value: string[]
  onChange: (next: string[]) => void
  suggestions: string[]
  error: string | null
  testId?: string
}) {
  const t = useTranslations("onboarding.workspace")
  const [draft, setDraft] = useState("")
  const add = (name: string) => {
    const clean = name.trim()
    if (!clean || value.some((d) => d.toLowerCase() === clean.toLowerCase())) return
    onChange([...value, clean])
  }
  const remaining = suggestions.filter((s) => !value.some((d) => d.toLowerCase() === s.toLowerCase()))
  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid={`${testId}-chips`}>
          {value.map((d) => (
            <span key={d} className="inline-flex h-6 items-center gap-1 rounded-full border bg-muted/60 ps-2.5 pe-1 text-xs">
              {d}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== d))}
                aria-label={`${d} ×`}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add(draft)
              setDraft("")
            }
          }}
          placeholder={t("departmentPlaceholder")}
          aria-label={t("departments")}
          aria-invalid={error ? true : undefined}
          className={cn(inputClass, "sm:max-w-[300px]")}
          data-testid={`${testId}-input`}
        />
        <button
          type="button"
          onClick={() => {
            add(draft)
            setDraft("")
          }}
          disabled={!draft.trim()}
          className={rdButton.outline}
          data-testid={`${testId}-add`}
        >
          {t("addDepartment")}
        </button>
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{t("departmentSuggestions")}:</span>
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex h-6 items-center rounded-full border border-dashed px-2.5 text-xs text-foreground hover:bg-accent"
              data-testid={`${testId}-suggest-${s}`}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}

function LogoField({ initialUrl }: { initialUrl: string | null }) {
  const t = useTranslations("onboarding.workspace")
  const { toast } = useToast()
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const res = await uploadTenantLogo(file)
      setUrl(res.logo_url)
      toast({ title: t("logoUploaded") })
    } catch {
      toast({ title: t("logoFailed"), variant: "destructive" })
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium">{t("logo")}</span>
      <div className="flex items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border bg-muted/40"
          data-testid="onb-logo-preview"
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={t("logo")} className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="sr-only"
            id="onb-logo-file"
            onChange={(e) => onFile(e.target.files?.[0])}
            data-testid="onb-logo-input"
          />
          <label htmlFor="onb-logo-file" className={cn(rdButton.outlineSm, "cursor-pointer", busy && "pointer-events-none opacity-50")}>
            <Upload className="h-3.5 w-3.5" aria-hidden />
            {busy ? t("logoUploading") : url ? t("logoChange") : t("logoUpload")}
          </label>
          <span className="text-xs text-muted-foreground">{t("logoHint")}</span>
        </div>
      </div>
    </div>
  )
}

export function WorkspaceStep({ answers, setAnswers, errors, context }: StepComponentProps<WorkspaceAnswers>) {
  const t = useTranslations("onboarding.workspace")
  const patch = (p: Partial<WorkspaceAnswers>) => setAnswers((prev) => ({ ...prev, ...p }))

  const presetKey = answers.industry ?? "other"
  const suggestions = t(`departmentPresets.${presetKey}`)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const logoUrl = typeof context.logo_url === "string" ? context.logo_url : null

  const departmentOptions = answers.departments.map((d) => ({ value: d, label: d }))

  return (
    <div className="flex flex-col gap-4" data-testid="onb-step-workspace">
      <SectionCard title={t("company")} bodyClassName="flex flex-col gap-4 p-4">
        <TextField
          label={t("companyName")}
          value={answers.company_name}
          onChange={(v) => patch({ company_name: v })}
          placeholder={t("companyNamePlaceholder")}
          error={firstError(errors, "company_name")}
          autoComplete="organization"
          inputClassName="sm:max-w-[360px]"
          testId="onb-company-name"
        />
        <LogoField initialUrl={logoUrl} />
        <SelectField
          label={t("language")}
          help={t("languageHint")}
          value={answers.preferred_language}
          onChange={(v) => patch({ preferred_language: v })}
          options={LANGUAGES.map((l) => ({ value: l, label: t(`languages.${l}`) }))}
          error={firstError(errors, "preferred_language")}
          selectClassName="sm:max-w-[240px]"
          testId="onb-language"
        />
      </SectionCard>

      <SectionCard title={t("industry")} hint={t("industryHint")} bodyClassName="p-4">
        <MultiChoiceCards
          options={INDUSTRIES.map((i) => ({ value: i, label: t(`industries.${i}`), icon: INDUSTRY_ICON[i] }))}
          value={answers.industry}
          onChange={(v) => patch({ industry: v })}
          columns={4}
          error={firstError(errors, "industry")}
          testId="onb-industry"
        />
      </SectionCard>

      <SectionCard title={t("departments")} hint={t("departmentsHint")} bodyClassName="p-4">
        <DepartmentChips
          value={answers.departments}
          onChange={(departments) =>
            patch({
              departments,
              team: answers.team.map((r) => (r.department && !departments.includes(r.department) ? { ...r, department: null } : r)),
            })
          }
          suggestions={suggestions}
          error={firstError(errors, "departments")}
        />
      </SectionCard>

      <SectionCard title={t("team")} hint={t("teamHint")} bodyClassName="p-4">
        <EditableTable<TeamRow>
          columns={[
            { key: "email", label: t("columns.email"), type: "email", placeholder: "name@company.ge", width: "minmax(0,1.4fr)" },
            { key: "first_name", label: t("columns.firstName") },
            { key: "last_name", label: t("columns.lastName") },
            { key: "role", label: t("columns.role"), type: "select", options: ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) })), width: "110px" },
            {
              key: "department",
              label: t("columns.department"),
              type: "select",
              options: departmentOptions,
              placeholder: t("noDepartment"),
              width: "130px",
            },
          ]}
          rows={answers.team}
          onChange={(team) => patch({ team })}
          newRow={emptyTeamRow}
          rowErrors={rowErrorsOf(errors, "team")}
          error={typeof errors?.team === "string" ? errors.team : (Array.isArray(errors?.team) && typeof errors.team[0] === "string" ? errors.team[0] : null)}
          addLabel={t("addPerson")}
          emptyText={t("teamEmpty")}
          testId="onb-team"
        />
      </SectionCard>
    </div>
  )
}

export const step: StepDefinition<WorkspaceAnswers> = {
  key: "workspace",
  titleKey: "steps.workspace.title",
  Component: WorkspaceStep,
  init: initWorkspaceAnswers,
  prepare: prepareWorkspaceAnswers,
}
