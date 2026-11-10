"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Plus, type LucideIcon } from "lucide-react"
import { DataTable, type Column } from "@/components/redesign/data-table"
import { TonePill } from "@/components/redesign/pill"
import type { Tone } from "@/components/redesign/tones"
import { rdButton } from "@/components/redesign/buttons"
import { cn } from "@/lib/utils"
import { initials } from "@/app/(tenant)/tickets/_components/primitives/initials"
import { SettingsPage } from "./page"
import { SettingsToggle } from "./controls"

export interface SettingsListAction {
  label: string
  onClick?: () => void
  /** A link instead of a button. */
  href?: string
  icon?: LucideIcon
  disabled?: boolean
  testId?: string
}

export interface SettingsListPageProps<T> {
  icon: LucideIcon
  title: string
  description?: ReactNode
  /** Header "New …" button (design `stList.newLabel`). */
  newAction?: SettingsListAction | null
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string | number
  /** Opens the row's edit dialog (clicks on buttons / switches inside the row are ignored). */
  onRowClick?: (row: T) => void
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  renderError: (error: unknown, onRetry?: () => void) => ReactNode
  empty?: ReactNode
  /** Line under the table: "3 lists · click a row to edit" (already translated). */
  countLabel?: ReactNode
  ariaLabel: string
  /** Blocks between the header and the table (filters, banners). */
  before?: ReactNode
  /** Blocks after the table and dialogs (rendered inside the page). */
  children?: ReactNode
  idPrefix?: string
  testId?: string
}

/**
 * Design LIST PAGE: header with a "New" button, a bordered table (36px header,
 * 48px rows, row click edits) and the "N · click a row to edit" line. Built on
 * the redesign `DataTable` (two-line rows below 768px container width).
 */
export function SettingsListPage<T>({
  icon,
  title,
  description,
  newAction,
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  error,
  onRetry,
  renderError,
  empty,
  countLabel,
  ariaLabel,
  before,
  children,
  idPrefix = "st-list",
  testId,
}: SettingsListPageProps<T>) {
  return (
    <SettingsPage
      icon={icon}
      title={title}
      description={description}
      width="list"
      gap={16}
      testId={testId}
      action={newAction ? <ListActionButton action={newAction} /> : undefined}
    >
      {before}
      <DataTable
        variant="card"
        density="comfortable"
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        onRowClick={onRowClick}
        loading={loading}
        error={error}
        onRetry={onRetry}
        renderError={renderError}
        empty={empty}
        ariaLabel={ariaLabel}
        idPrefix={idPrefix}
      />
      {countLabel && rows && rows.length > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums" data-testid={`${idPrefix}-count`}>
          {countLabel}
        </span>
      )}
      {children}
    </SettingsPage>
  )
}

/** The 32px primary header button of a list / agents page. */
export function ListActionButton({ action }: { action: SettingsListAction }) {
  const Icon = action.icon ?? Plus
  const content = (
    <>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {action.label}
    </>
  )
  if (action.href && !action.disabled) {
    return (
      <Link href={action.href} className={cn(rdButton.primary, "px-3")} data-testid={action.testId}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={action.onClick} disabled={action.disabled} className={cn(rdButton.primary, "px-3")} data-testid={action.testId}>
      {content}
    </button>
  )
}

/** Table cell: 13px text with an optional 11px muted second line (design `c.text` / `c.sub`). */
export function TextCell({
  text,
  sub,
  strong,
  mono,
  muted,
  className,
}: {
  text: ReactNode
  sub?: ReactNode
  strong?: boolean
  mono?: boolean
  muted?: boolean
  className?: string
}) {
  return (
    <span className={cn("flex min-w-0 flex-col", className)}>
      <span
        className={cn(
          "truncate",
          strong && "font-medium",
          mono && "font-mono text-xs tabular-nums",
          muted && "text-xs text-muted-foreground"
        )}
      >
        {text}
      </span>
      {sub && <span className="truncate text-[11px] text-muted-foreground">{sub}</span>}
    </span>
  )
}

/** Table cell: 28px initials tile (round for people, 7px radius for things) + text/sub. */
export function AvatarCell({
  name,
  sub,
  shape = "round",
  icon: Icon,
  className,
}: {
  name: string
  sub?: ReactNode
  shape?: "round" | "square"
  /** An icon instead of initials (lists, forms, trunks). */
  icon?: LucideIcon
  className?: string
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center bg-primary/10 text-[10px] font-semibold text-primary",
          shape === "round" ? "rounded-full" : "rounded-[7px]"
        )}
      >
        {Icon ? <Icon className="h-3.5 w-3.5" /> : initials(name)}
      </span>
      <TextCell text={name} sub={sub} strong />
    </span>
  )
}

/** Table cell: design badge (20px, 4px radius, tinted). */
export function BadgeCell({ tone, children, dot }: { tone: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <TonePill tone={tone} dot={dot}>
      {children}
    </TonePill>
  )
}

/**
 * Table cell: 32x18 switch (design `c.toggle`). Clicks never open the row
 * (`role="switch"` is ignored by the row click). Saves exactly like the
 * page's old switch: pass its handler.
 */
export function ToggleCell({
  checked,
  onCheckedChange,
  label,
  disabled,
  testId,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Accessible name ("Active"). */
  label: string
  disabled?: boolean
  testId?: string
}) {
  return (
    <SettingsToggle
      size="sm"
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      title={label}
      data-testid={testId}
    />
  )
}
