"use client"

import Link from "next/link"
import { useRef } from "react"
import type { LucideIcon } from "lucide-react"
import { useHeaderActions } from "@/contexts/HeaderActionsContext"
import { cn } from "@/lib/utils"
import { rdButton } from "./buttons"

export interface HeaderAction {
  /** Already translated: the header renders outside the section's intl provider. */
  label: string
  icon?: LucideIcon
  /** A link (`href`) or a button (`onClick`). */
  href?: string
  onClick?: () => void
  disabled?: boolean
  testId?: string
}

export interface HeaderBridgeProps {
  /** Drill-down crumb after the page title: "Payroll / Report". Hidden title on mobile, as in Email. */
  breadcrumb?: string | null
  /** Muted "· sub" after the title (design simple page `sp.sub`): a count or the period. */
  sub?: string | null
  /** The page's one primary action (32px filled; icon only below `sm`). */
  primary?: HeaderAction | null
  /** Secondary actions as ghost buttons before the theme / bell icons (label from `sm`). */
  secondary?: HeaderAction[]
  /** Prefix of the slot test ids: `<prefix>-header-crumb`, `<prefix>-header-sub`. */
  testIdPrefix?: string
}

function actionKey(a: HeaderAction | null | undefined): string {
  if (!a) return ""
  return [a.label, a.href ?? "", a.disabled ? 1 : 0, a.testId ?? "", a.icon?.displayName ?? a.icon?.name ?? ""].join("|")
}

/**
 * Fills the app header for a redesigned page (the header bridge pattern of
 * Email, Calls and Clients; promoted from the leave redesign): page title
 * from the sidebar, optional "/ crumb" or
 * "· sub", the primary action and secondary actions. Renders nothing itself.
 *
 * Click handlers are read through a ref, so a new `onClick` identity on every
 * render does not re-publish the slot; only labels, links and disabled flags do.
 */
export function HeaderBridge({ breadcrumb, sub, primary, secondary = [], testIdPrefix = "rd" }: HeaderBridgeProps) {
  const latest = useRef({ primary, secondary })
  latest.current = { primary, secondary }

  const run = (which: "primary" | number) => () => {
    const a = which === "primary" ? latest.current.primary : latest.current.secondary[which]
    a?.onClick?.()
  }

  const renderAction = (a: HeaderAction, onClick: () => void, kind: "primary" | "secondary") => {
    const Icon = a.icon
    const className =
      kind === "primary"
        ? rdButton.primary
        : cn(rdButton.ghostIcon, "w-auto px-2 sm:px-2.5 text-[13px] font-normal")
    const content = (
      <>
        {Icon && <Icon className={kind === "primary" ? "h-3.5 w-3.5" : "h-[15px] w-[15px]"} aria-hidden />}
        <span className={Icon ? "hidden sm:inline" : undefined}>{a.label}</span>
      </>
    )
    if (a.href && !a.disabled) {
      return (
        <Link href={a.href} className={className} aria-label={a.label} title={a.label} data-testid={a.testId}>
          {content}
        </Link>
      )
    }
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={a.disabled}
        className={className}
        aria-label={a.label}
        title={a.label}
        data-testid={a.testId}
      >
        {content}
      </button>
    )
  }

  useHeaderActions(
    {
      breadcrumb: breadcrumb ? (
        <span className="truncate" data-testid={`${testIdPrefix}-header-crumb`}>
          {breadcrumb}
        </span>
      ) : undefined,
      meta: sub ? (
        // Hidden on phones: the page title needs the room (it was cut to "My Reque…").
        <span className="hidden truncate text-xs text-muted-foreground sm:inline" data-testid={`${testIdPrefix}-header-sub`}>
          · {sub}
        </span>
      ) : undefined,
      primary: primary ? renderAction(primary, run("primary"), "primary") : undefined,
      icons:
        secondary.length > 0 ? (
          <>
            {secondary.map((a, i) => (
              <span key={`${a.label}-${i}`} className="contents">
                {renderAction(a, run(i), "secondary")}
              </span>
            ))}
          </>
        ) : undefined,
    },
    [breadcrumb ?? "", sub ?? "", actionKey(primary), secondary.map(actionKey).join("||"), testIdPrefix]
  )

  return null
}
