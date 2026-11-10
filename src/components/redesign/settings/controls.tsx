"use client"

import { useState, type ComponentProps, type ReactNode } from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { AlertTriangle, Check, CheckCircle2, Eye, EyeOff, Info, type LucideIcon } from "lucide-react"
import { TONE_CLASS } from "@/components/redesign/tones"
import { Segmented, type SegmentedOption } from "@/components/redesign/segmented"
import { cn } from "@/lib/utils"

/**
 * Field-row controls of the design FORM PAGE (settings kit, ST-00). Every
 * visible text is a prop: the kit carries no translations.
 */

/** 34px text input of the settings rows (design `isText`: 6px radius, 13px text, 3px focus ring). */
export const settingsInputClass =
  "h-[34px] w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-50"

/** Width of a text control inside a `FieldRow`: full width on phones, 300px from `sm`. */
export const settingsFieldWidth = "w-full sm:w-[300px]"

/**
 * Design switch. `md` = form rows (40x22, 18px knob), `sm` = table cells
 * (32x18, 14px knob). Radix Switch underneath, so it takes the same props as
 * `@/components/ui/switch` (`checked`, `onCheckedChange`, `disabled`, `id`, ...).
 */
export function SettingsToggle({
  size = "md",
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitives.Root> & { size?: "md" | "sm" }) {
  return (
    <SwitchPrimitives.Root
      data-slot="settings-toggle"
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        size === "md" ? "h-[22px] w-10" : "h-[18px] w-8",
        className
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.25)] transition-transform data-[state=unchecked]:translate-x-0",
          size === "md"
            ? "h-[18px] w-[18px] data-[state=checked]:translate-x-[18px] rtl:data-[state=checked]:-translate-x-[18px]"
            : "h-3.5 w-3.5 data-[state=checked]:translate-x-3.5 rtl:data-[state=checked]:-translate-x-3.5"
        )}
      />
    </SwitchPrimitives.Root>
  )
}

/** Secret input with a show / hide button (design `isSecret`: 26px eye button inside the input). */
export function SecretInput({
  id,
  value,
  onChange,
  placeholder,
  showLabel,
  hideLabel,
  disabled,
  mono = true,
  autoComplete = "off",
  className,
  testId,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Accessible names of the eye button. */
  showLabel: string
  hideLabel: string
  disabled?: boolean
  mono?: boolean
  autoComplete?: string
  className?: string
  testId?: string
}) {
  const [shown, setShown] = useState(false)
  return (
    <div className={cn("relative w-full", className)}>
      <input
        id={id}
        type={shown ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        data-testid={testId}
        className={cn(settingsInputClass, "pe-9", mono && "font-mono")}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? hideLabel : showLabel}
        title={shown ? hideLabel : showLabel}
        aria-pressed={shown}
        disabled={disabled}
        className="absolute end-1 top-1 inline-flex h-[26px] w-[26px] items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
      >
        {shown ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
      </button>
    </div>
  )
}

/** Choice segment of a form row (design `isChoice`: 30px muted track, 26px segments, wraps). */
export function ChoiceControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  testId,
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  ariaLabel: string
  className?: string
  testId?: string
}) {
  return (
    <Segmented
      size="md"
      value={value}
      onChange={onChange}
      options={options}
      ariaLabel={ariaLabel}
      className={className}
      testId={testId}
      dataSlot="settings-choice"
    />
  )
}

/** Row action button (design `isAction`: 30px outline, 12px medium; `danger` = destructive border/text). */
export function ActionButton({
  children,
  onClick,
  icon: Icon,
  tone = "default",
  disabled,
  type = "button",
  className,
  testId,
  ...rest
}: {
  children: ReactNode
  onClick?: () => void
  icon?: LucideIcon
  tone?: "default" | "danger"
  disabled?: boolean
  type?: "button" | "submit"
  className?: string
  testId?: string
  "aria-label"?: string
  title?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={cn(
        "inline-flex h-[30px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border bg-background px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        tone === "danger"
          ? "border-destructive/50 text-destructive hover:bg-destructive/[0.08]"
          : "border-border text-foreground hover:bg-accent",
        className
      )}
      {...rest}
    >
      {Icon && <Icon className="h-[13px] w-[13px]" aria-hidden />}
      {children}
    </button>
  )
}

export interface SwatchOption<T extends string = string> {
  value: T
  /** Accessible name and tooltip. */
  label: string
  /** Any CSS colour (`#2563eb`, `hsl(...)`). */
  color: string
}

/** Colour swatches (design `isSwatches`: 26px circles, white check on the active one, ring). */
export function SwatchPicker<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  disabled,
  className,
  testId,
}: {
  value: T | null | undefined
  onChange: (value: T) => void
  options: SwatchOption<T>[]
  ariaLabel: string
  disabled?: boolean
  className?: string
  testId?: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex flex-wrap gap-1.5", className)} data-testid={testId}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            disabled={disabled}
            onClick={() => !active && onChange(o.value)}
            style={{ background: o.color }}
            className={cn(
              "flex h-[26px] w-[26px] items-center justify-center rounded-full transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
              active ? "shadow-[0_0_0_2px_hsl(var(--background)),0_0_0_4px_hsl(var(--foreground)/0.35)]" : "shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]"
            )}
          >
            {active && <Check className="h-[13px] w-[13px] text-white" aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}

export type NoteTone = "info" | "warning" | "success" | "danger" | "neutral"
const NOTE_ICON: Record<NoteTone, LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  danger: AlertTriangle,
  neutral: Info,
}

/** Inline note (design `isNote`: 8px 10px padding, 6px radius, tinted, 12px/17px text, 14px icon). */
export function SettingsNote({
  tone = "info",
  icon,
  children,
  action,
  className,
  testId,
}: {
  tone?: NoteTone
  icon?: LucideIcon
  children: ReactNode
  action?: ReactNode
  className?: string
  testId?: string
}) {
  const Icon = icon ?? NOTE_ICON[tone]
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn(
        "flex w-full min-w-0 items-start gap-2 rounded-md border px-2.5 py-2 text-xs leading-[17px]",
        TONE_CLASS[tone],
        className
      )}
      data-testid={testId}
      data-tone={tone}
    >
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 [text-wrap:pretty]">{children}</div>
      {action}
    </div>
  )
}
