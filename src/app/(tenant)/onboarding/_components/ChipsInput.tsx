"use client"

import { useState, type ReactNode } from "react"
import { X } from "lucide-react"
import { rdButton } from "@/components/redesign/buttons"
import { cn } from "@/lib/utils"
import { FieldShell, inputClass } from "./fields/field-shell"

/**
 * Free-text chips (DIDs, tags…): type + Enter or "Add", optional suggestion
 * chips, one remove button per value. Values are trimmed and unique
 * (case-insensitive).
 */
export function ChipsInput({
  label,
  help,
  error,
  value,
  onChange,
  suggestions = [],
  placeholder,
  addLabel,
  suggestionsLabel,
  inputMode,
  disabled,
  className,
  testId = "chips",
}: {
  label?: ReactNode
  help?: ReactNode
  error?: string | null
  value: string[]
  onChange: (next: string[]) => void
  suggestions?: string[]
  placeholder?: string
  addLabel: string
  suggestionsLabel?: string
  inputMode?: "text" | "tel"
  disabled?: boolean
  className?: string
  testId?: string
}) {
  const [draft, setDraft] = useState("")
  const has = (v: string) => value.some((d) => d.toLowerCase() === v.toLowerCase())
  const add = (raw: string) => {
    const clean = raw.trim()
    if (!clean || has(clean)) return
    onChange([...value, clean])
  }
  const remaining = suggestions.filter((s) => !has(s))

  return (
    <FieldShell as="div" label={label} help={help} error={error} className={className} testId={testId}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid={`${testId}-chips`}>
          {value.map((d) => (
            <span key={d} className="inline-flex h-6 items-center gap-1 rounded-full border bg-muted/60 ps-2.5 pe-1 text-xs">
              {d}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== d))}
                disabled={disabled}
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
          inputMode={inputMode}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add(draft)
              setDraft("")
            }
          }}
          placeholder={placeholder}
          aria-label={typeof label === "string" ? label : undefined}
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
          disabled={disabled || !draft.trim()}
          className={rdButton.outline}
          data-testid={`${testId}-add`}
        >
          {addLabel}
        </button>
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {suggestionsLabel && <span>{suggestionsLabel}:</span>}
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => add(s)}
              className="inline-flex h-6 items-center rounded-full border border-dashed px-2.5 text-xs text-foreground hover:bg-accent"
              data-testid={`${testId}-suggest-${s}`}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </FieldShell>
  )
}
