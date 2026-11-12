"use client"

import type { ReactNode } from "react"
import { Check, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { FieldShell } from "./field-shell"

export interface ChoiceCard<T extends string> {
  value: T
  label: string
  description?: string
  icon?: LucideIcon
  disabled?: boolean
}

interface BaseProps<T extends string> {
  label?: ReactNode
  help?: ReactNode
  error?: string | null
  options: ChoiceCard<T>[]
  /** Cards per row from `sm` (phones always get 2, or 1 with descriptions). */
  columns?: 2 | 3 | 4
  className?: string
  testId?: string
}

type SingleProps<T extends string> = BaseProps<T> & {
  multiple?: false
  value: T | null
  onChange: (value: T) => void
}

type MultiProps<T extends string> = BaseProps<T> & {
  multiple: true
  value: T[]
  onChange: (value: T[]) => void
}

const COLS = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" } as const

/** Selectable cards with an icon: one choice (radio) or several (checkboxes). */
export function MultiChoiceCards<T extends string>(props: SingleProps<T> | MultiProps<T>) {
  const { label, help, error, options, columns = 3, className, testId } = props
  const selected = (value: T) => (props.multiple ? props.value.includes(value) : props.value === value)
  const toggle = (value: T) => {
    if (props.multiple) {
      props.onChange(props.value.includes(value) ? props.value.filter((v) => v !== value) : [...props.value, value])
    } else {
      props.onChange(value)
    }
  }
  return (
    <FieldShell as="div" label={label} help={help} error={error} className={className} testId={testId}>
      <div
        role={props.multiple ? "group" : "radiogroup"}
        aria-label={typeof label === "string" ? label : undefined}
        className={cn("grid grid-cols-2 gap-2", COLS[columns])}
      >
        {options.map((o) => {
          const on = selected(o.value)
          const Icon = o.icon
          return (
            <button
              key={o.value}
              type="button"
              role={props.multiple ? "checkbox" : "radio"}
              aria-checked={on}
              disabled={o.disabled}
              onClick={() => toggle(o.value)}
              data-state={on ? "on" : "off"}
              data-testid={testId ? `${testId}-${o.value}` : undefined}
              className={cn(
                "relative flex min-h-[64px] flex-col items-start gap-1.5 rounded-[10px] border bg-card p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                on ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-accent"
              )}
            >
              {on && (
                <span className="absolute end-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
              )}
              {Icon && <Icon className={cn("h-5 w-5", on ? "text-primary" : "text-muted-foreground")} aria-hidden />}
              <span className="text-[13px] font-medium leading-tight">{o.label}</span>
              {o.description && <span className="text-xs leading-[16px] text-muted-foreground [text-wrap:pretty]">{o.description}</span>}
            </button>
          )
        })}
      </div>
    </FieldShell>
  )
}
