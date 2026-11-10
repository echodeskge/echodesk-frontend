"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionCard, FieldRow } from "@/components/redesign/section-card"
import { SettingsPageHeader } from "./settings-page-header"

/**
 * Max widths of the design settings page types (settings content pane pads
 * 16px on phones, 24px from `sm`; the shell's scroll area owns the padding).
 */
export const SETTINGS_WIDTH = {
  /** FORM PAGE, LEAVE SETTINGS */
  form: "max-w-[720px]",
  /** HOME, AGENTS, STATS, TEMPLATES */
  wide: "max-w-[960px]",
  /** LIST PAGE */
  list: "max-w-[1040px]",
  /** CONNECTIONS */
  connections: "max-w-[1100px]",
  full: "",
} as const

export type SettingsWidth = keyof typeof SETTINGS_WIDTH

export interface SettingsPageProps {
  icon: LucideIcon
  title: string
  description?: ReactNode
  /** Right side of the header (the page's primary button, e.g. "Invite agent", "New"). */
  action?: ReactNode
  /** Page type width (design: form 720, agents/stats 960, list 1040, connections 1100). */
  width?: SettingsWidth
  /** Gap between blocks: 20 for forms/stats (design), 16 for agents/list, 18 for connections. */
  gap?: 16 | 18 | 20
  children?: ReactNode
  className?: string
  testId?: string
}

const GAP = { 16: "gap-4", 18: "gap-[18px]", 20: "gap-5" } as const

/** One settings page: padded column, header (icon, title, description, action) and the blocks. */
export function SettingsPage({
  icon,
  title,
  description,
  action,
  width = "form",
  gap = 20,
  children,
  className,
  testId,
}: SettingsPageProps) {
  return (
    <section className={cn("w-full p-4 sm:p-6", className)} data-testid={testId}>
      <div className={cn("flex w-full min-w-0 flex-col", GAP[gap], SETTINGS_WIDTH[width])}>
        <SettingsPageHeader icon={icon} title={title} description={description} action={action} />
        {children}
      </div>
    </section>
  )
}

/** Design FORM PAGE: 720px column, 20px gap, sections of field rows. */
export function SettingsFormPage(props: Omit<SettingsPageProps, "width" | "gap">) {
  return <SettingsPage {...props} width="form" gap={20} />
}

/** A form section: 10px card, 12px 16px header with title + "· hint", then `FieldRow`s. */
export const SettingsSection = SectionCard
export { FieldRow }

/**
 * Design danger zone: destructive-tinted 10px card with label + help left and
 * a 30px destructive outline button right (stacked on phones). Keep the
 * page's own confirmation dialog: `onAction` should open it.
 */
export function DangerZone({
  label,
  help,
  actionLabel,
  onAction,
  disabled,
  children,
  className,
  testId = "settings-danger-zone",
}: {
  label: string
  help?: ReactNode
  actionLabel: string
  onAction: () => void
  disabled?: boolean
  /** Extra content under the help text (e.g. a confirmation input). */
  children?: ReactNode
  className?: string
  testId?: string
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-x-4 gap-y-3 rounded-[10px] border border-destructive/40 px-4 py-3.5 sm:flex-row sm:items-center",
        className
      )}
      data-testid={testId}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-medium text-destructive">{label}</span>
        {help && <span className="text-xs text-muted-foreground [text-wrap:pretty]">{help}</span>}
        {children}
      </div>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className="inline-flex h-[30px] shrink-0 items-center justify-center self-start whitespace-nowrap rounded-md border border-destructive/50 px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 sm:self-auto"
      >
        {actionLabel}
      </button>
    </section>
  )
}
