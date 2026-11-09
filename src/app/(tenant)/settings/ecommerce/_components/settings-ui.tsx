"use client"

import { useState, type ReactNode } from "react"
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { TONE_CLASS } from "@/components/redesign/tones"
import { cn } from "@/lib/utils"

/** 34px inputs of this page (design form fields: 13px text). */
export const settingsInput = "h-[34px] text-[13px]"
/** Control width inside a `FieldRow` (full width on phones). */
export const fieldWidth = "w-full sm:w-[300px]"

/** Secret input with a show / hide toggle (named for screen readers). */
export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  showLabel,
  hideLabel,
  className,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  showLabel: string
  hideLabel: string
  className?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "••••••••••••••••"}
        className={cn(settingsInput, "pe-9 font-mono")}
        autoComplete="off"
      />
      <button
        type="button"
        className="absolute inset-y-0 end-0 flex w-9 items-center justify-center rounded-e-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setShow(!show)}
        aria-label={show ? hideLabel : showLabel}
        aria-pressed={show}
      >
        {show ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
      </button>
    </div>
  )
}

type NoticeTone = "info" | "warning" | "success" | "danger"
const NOTICE_ICON = { info: Info, warning: AlertCircle, success: CheckCircle2, danger: AlertCircle } as const

/** Inline status message (tinted like the status pills): credentials state, deploy result, DNS help. */
export function Notice({
  tone,
  children,
  className,
  testId,
}: {
  tone: NoticeTone
  children: ReactNode
  className?: string
  testId?: string
}) {
  const Icon = NOTICE_ICON[tone]
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn("flex min-w-0 items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-[17px]", TONE_CLASS[tone], className)}
      data-testid={testId}
    >
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 [text-wrap:pretty]">{children}</div>
    </div>
  )
}

/**
 * A payment provider inside the Payment methods card: switch row (label +
 * optional help) and, while it is on, its credential fields in a muted panel
 * below (as before: fields show only for active providers).
 */
export function ProviderBlock({
  id,
  label,
  help,
  active,
  onToggle,
  children,
}: {
  id: string
  label: string
  help?: string
  active: boolean
  onToggle: () => void
  children?: ReactNode
}) {
  return (
    <div className="border-b last:border-b-0" data-testid={`provider-${id}`} data-active={active || undefined}>
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <label htmlFor={`provider-${id}-switch`} className="cursor-pointer text-[13px] font-medium">
            {label}
          </label>
          {help && <span className="text-xs leading-[17px] text-muted-foreground">{help}</span>}
        </div>
        <Switch id={`provider-${id}-switch`} checked={active} onCheckedChange={onToggle} />
      </div>
      {active && children && (
        <div className="flex min-w-0 flex-col gap-3 border-t bg-muted/25 px-4 py-3.5">{children}</div>
      )}
    </div>
  )
}

/** Label + control stacked (fields inside a provider panel or the pickup block). */
export function StackField({
  label,
  htmlFor,
  suffix,
  help,
  children,
  className,
}: {
  label: ReactNode
  htmlFor?: string
  suffix?: ReactNode
  help?: ReactNode
  children: ReactNode
  className?: string
}) {
  const Label = htmlFor ? "label" : "span"
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label {...(htmlFor ? { htmlFor } : {})} className="flex flex-wrap items-center gap-x-1.5 text-[13px] font-medium leading-4">
        {label}
        {suffix && <span className="text-xs font-normal text-muted-foreground">{suffix}</span>}
      </Label>
      {children}
      {help && <span className="text-xs leading-[17px] text-muted-foreground">{help}</span>}
    </div>
  )
}

/** Switch row inside a panel (label + help left, switch right). */
export function InlineSwitch({
  id,
  label,
  help,
  checked,
  onChange,
}: {
  id: string
  label: string
  help?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-lg border bg-background px-3 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={id} className="text-[13px] font-medium">
          {label}
        </label>
        {help && <span className="text-xs leading-4 text-muted-foreground">{help}</span>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
