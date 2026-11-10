import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Design settings page header (FORM / AGENTS / STATS / LIST / CONNECTIONS pages):
 * 40px icon tile on primary/10, 20px title, 13px description and an optional
 * action on the right (it wraps under the text on narrow screens).
 * Moved from settings/templates (ST-00); templates re-exports it.
 */
export function SettingsPageHeader({
  icon: Icon,
  title,
  description,
  action,
  className,
  testId,
}: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
  testId?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-start gap-3.5", className)} data-testid={testId}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
        <h2 className="text-xl font-semibold leading-[26px] tracking-[-0.02em]">{title}</h2>
        {description && <p className="text-[13px] text-muted-foreground [text-wrap:pretty]">{description}</p>}
      </div>
      {action}
    </div>
  )
}
