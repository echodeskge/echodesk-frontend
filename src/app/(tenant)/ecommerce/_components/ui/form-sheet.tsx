"use client"

import type { FormEvent, ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { rdButton } from "@/components/redesign/buttons"
import { cn } from "@/lib/utils"

const WIDTHS = {
  /** language, shipping method, promo code */
  md: "sm:max-w-[480px]",
  /** attribute, homepage section */
  lg: "sm:max-w-[640px]",
  /** product (variants, attributes, images) */
  xl: "sm:max-w-[760px]",
} as const

/** Input / select / textarea sizing inside the e-commerce forms (34px, 13px text). */
export const ecField = {
  input: "h-[34px] text-[13px]",
  select: "h-[34px] text-[13px]",
  textarea: "min-h-[72px] text-[13px]",
} as const

/**
 * Right-hand form sheet in the design's form-card style: 56px header (15px
 * semibold title + 12px description), a scrolling body of `FormSection`s and
 * a sticky 56px footer (Cancel + primary submit, 32px). Full width on phones.
 *
 * With `onSubmit` the body is a <form> (Enter submits, the submit button is
 * `type=submit`); without it, pass your own `footer`. `extraFooter` goes on
 * the left of the footer (e.g. a destructive "Delete product").
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  children,
  onSubmit,
  submitLabel,
  submitting,
  submitDisabled,
  cancelLabel,
  footer,
  extraFooter,
  testId = "ec-form-sheet",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  size?: keyof typeof WIDTHS
  children: ReactNode
  onSubmit?: () => void
  submitLabel?: string
  submitting?: boolean
  submitDisabled?: boolean
  cancelLabel?: string
  footer?: ReactNode
  extraFooter?: ReactNode
  testId?: string
}) {
  const tc = useTranslations("common")
  const handle = (e: FormEvent) => {
    e.preventDefault()
    if (!submitting && !submitDisabled) onSubmit?.()
  }
  const actions =
    footer ??
    (onSubmit ? (
      <>
        <button type="button" className={rdButton.outline} onClick={() => onOpenChange(false)} disabled={submitting}>
          {cancelLabel ?? tc("cancel")}
        </button>
        <button type="submit" className={rdButton.primary} disabled={submitting || submitDisabled} data-testid="ec-form-submit">
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          {submitLabel ?? tc("save")}
        </button>
      </>
    ) : null)
  const body = (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
      {(actions || extraFooter) && (
        <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-t bg-background px-4 py-3 sm:px-5">
          {extraFooter}
          <span aria-hidden className="ms-auto" />
          {actions}
        </div>
      )}
    </>
  )
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn("w-full gap-0 p-0", WIDTHS[size])} data-testid={testId}>
        <div className="flex min-h-14 shrink-0 flex-col justify-center gap-0.5 border-b px-4 py-3 pe-12 sm:px-5">
          <SheetTitle className="text-[15px] font-semibold leading-5">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-xs leading-4 text-muted-foreground">{description}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">{title}</SheetDescription>
          )}
        </div>
        {onSubmit && !footer ? (
          <form onSubmit={handle} className="flex min-h-0 flex-1 flex-col" noValidate>
            {body}
          </form>
        ) : (
          body
        )}
      </SheetContent>
    </Sheet>
  )
}

/** A titled group of fields inside a `FormSheet` (13px semibold title · 12px hint, optional actions). */
export function FormSection({
  title,
  hint,
  actions,
  children,
  className,
}: {
  title?: ReactNode
  hint?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3 border-t pt-4 first:border-t-0 first:pt-0", className)}>
      {(title || actions) && (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {title && <h3 className="text-[13px] font-semibold">{title}</h3>}
          {hint && <span className="min-w-0 text-xs text-muted-foreground">· {hint}</span>}
          {actions && <div className="ms-auto flex items-center gap-1.5">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

/** Two columns from `sm` (price / old price, valid from / until). */
export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid min-w-0 gap-3 sm:grid-cols-2", className)}>{children}</div>
}

/** Label (13px/500) + control + help (12px muted) or error (12px destructive). */
export function FormField({
  label,
  htmlFor,
  help,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode
  htmlFor?: string
  help?: ReactNode
  error?: ReactNode
  required?: boolean
  children: ReactNode
  className?: string
}) {
  const Label = htmlFor ? "label" : "span"
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label {...(htmlFor ? { htmlFor } : {})} className="text-[13px] font-medium leading-4">
        {label}
        {required && (
          <span aria-hidden className="ms-0.5 text-destructive">
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <span role="alert" className="text-xs leading-4 text-destructive">
          {error}
        </span>
      ) : help ? (
        <span className="text-xs leading-4 text-muted-foreground">{help}</span>
      ) : null}
    </div>
  )
}

/** A switch row inside a form section: label + help left, control right (design toggle row). */
export function FormSwitchRow({
  label,
  help,
  htmlFor,
  children,
  disabled,
}: {
  label: ReactNode
  help?: ReactNode
  htmlFor?: string
  children: ReactNode
  disabled?: boolean
}) {
  const Label = htmlFor ? "label" : "span"
  return (
    <div className={cn("flex min-w-0 items-start justify-between gap-4 rounded-lg border px-3 py-2.5", disabled && "opacity-50")}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label {...(htmlFor ? { htmlFor } : {})} className="text-[13px] font-medium">
          {label}
        </Label>
        {help && <span className="text-xs leading-4 text-muted-foreground">{help}</span>}
      </div>
      <div className="flex shrink-0 items-center pt-0.5">{children}</div>
    </div>
  )
}
