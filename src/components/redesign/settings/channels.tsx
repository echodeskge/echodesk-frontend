"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { AlertTriangle, ArrowRight, MessageSquare, RefreshCw, type LucideIcon } from "lucide-react"
import { TONE_CLASS, TONE_DOT, type Tone } from "@/components/redesign/tones"
import { cn } from "@/lib/utils"

/**
 * Design CONNECTIONS shells (settings kit, ST-00): channel list + channel
 * detail. They only lay out what the page passes; every connect / disconnect
 * / sync handler stays the page's own.
 */

/** Channel list left (240px) and the detail right; stacked with a sideways-scrolling list below `md`. */
export function ConnectionsLayout({ list, children, className }: { list: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col items-stretch gap-[18px] md:flex-row", className)}>
      {list}
      <div className="flex min-w-0 flex-1 flex-col gap-3.5" data-testid="channel-detail">
        {children}
      </div>
    </div>
  )
}

export interface ChannelListItem<T extends string = string> {
  id: T
  label: string
  /** "2 pages connected", "Not connected" */
  status?: string
  icon: LucideIcon
  /** Brand colour of the 28px icon tile (any CSS colour). */
  color: string
  /** 8px status dot. */
  dot?: Tone | null
  testId?: string
}

export function ChannelList<T extends string>({
  channels,
  value,
  onSelect,
  ariaLabel,
  className,
}: {
  channels: ChannelListItem<T>[]
  value: T
  onSelect: (id: T) => void
  ariaLabel: string
  className?: string
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "flex shrink-0 gap-1 overflow-x-auto p-0.5 [scrollbar-width:none] md:w-[240px] md:flex-col md:overflow-visible [&::-webkit-scrollbar]:hidden",
        className
      )}
      data-testid="channel-list"
    >
      {channels.map((ch) => {
        const active = ch.id === value
        const Icon = ch.icon
        return (
          <button
            key={ch.id}
            type="button"
            onClick={() => onSelect(ch.id)}
            aria-current={active ? "true" : undefined}
            data-testid={ch.testId ?? `channel-${ch.id}`}
            className={cn(
              "flex min-h-11 min-w-[150px] shrink-0 items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-start transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-w-0",
              active ? "border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06)]" : "border-transparent"
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-white" style={{ background: ch.color }}>
              <Icon className="h-[15px] w-[15px]" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={cn("truncate text-[13px]", active ? "font-semibold" : "font-medium")}>{ch.label}</span>
              {ch.status && <span className="hidden truncate text-[11px] text-muted-foreground md:block">{ch.status}</span>}
            </span>
            {ch.dot && <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[ch.dot])} />}
          </button>
        )
      })}
    </nav>
  )
}

export interface ChannelAction {
  label: string
  onClick?: () => void
  href?: string
  icon?: LucideIcon
  /** "facebook" = Meta's official Facebook Login button (brand blue, white "f" logo). */
  variant?: "primary" | "outline" | "danger" | "facebook"
  disabled?: boolean
  testId?: string
}

const ACTION_CLASS = {
  primary: "border-primary bg-primary text-primary-foreground",
  outline: "border-border bg-background text-foreground",
  danger: "border-destructive/40 bg-background text-destructive",
  // Facebook brand guidelines: #1877F2 background, white label and logo.
  facebook:
    "h-10 gap-2.5 rounded-[6px] border-[#1877F2] bg-[#1877F2] px-4 text-[14px] font-semibold text-white hover:bg-[#166FE5] hover:opacity-100 dark:border-[#1877F2]",
} as const

/** The official Facebook "f" logo (white circle, brand-blue f), as Meta ships it. */
export function FacebookLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" className={className} aria-hidden focusable="false" data-testid="facebook-logo">
      <path
        fill="#fff"
        d="M1024 512C1024 229.23 794.77 0 512 0S0 229.23 0 512c0 255.55 187.23 467.37 432 505.78V660H302V512h130V399.2C432 270.88 508.44 200 625.39 200 681.41 200 740 210 740 210v126h-64.56c-63.6 0-83.44 39.47-83.44 79.96V512h142l-22.7 148H592v357.78C836.77 979.37 1024 767.55 1024 512Z"
      />
      <path
        fill="#1877F2"
        d="M711.3 660 734 512H592v-96.04c0-40.49 19.84-79.96 83.44-79.96H740V210s-58.59-10-114.61-10C508.44 200 432 270.88 432 399.2V512H302v148h130v357.78a517.4 517.4 0 0 0 160 0V660Z"
      />
    </svg>
  )
}

/** 32px channel action (Connect, Add account, Disconnect). */
export function ChannelActionButton({ action }: { action: ChannelAction }) {
  const Icon = action.icon
  const cls = cn(
    "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-[13px] font-medium transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    ACTION_CLASS[action.variant ?? "outline"]
  )
  const isFacebook = action.variant === "facebook"
  const content = (
    <>
      {Icon ? (
        <Icon className={cn(isFacebook ? "h-5 w-5" : "h-3.5 w-3.5", isFacebook && Icon === RefreshCw && "animate-spin")} aria-hidden />
      ) : (
        isFacebook && <FacebookLogo className="h-5 w-5 shrink-0" />
      )}
      {action.label}
    </>
  )
  if (action.href && !action.disabled) {
    return (
      <Link href={action.href} className={cls} data-testid={action.testId}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={action.onClick} disabled={action.disabled} className={cls} data-testid={action.testId}>
      {content}
    </button>
  )
}

const STATUS_TEXT: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  info: "text-blue-700 dark:text-blue-400",
  warning: "text-amber-700 dark:text-amber-400",
  success: "text-green-700 dark:text-green-400",
  danger: "text-destructive dark:text-red-400",
  violet: "text-violet-700 dark:text-violet-400",
}

/** Channel detail head card: 48px brand tile, 17px title, status line, badge, inbox link, actions. */
export function ChannelDetailCard({
  icon: Icon,
  color,
  title,
  status,
  statusIcon: StatusIcon,
  statusTone = "neutral",
  badge,
  inbox,
  actions,
  children,
  testId = "channel-detail-card",
}: {
  icon: LucideIcon
  color: string
  title: string
  status?: ReactNode
  statusIcon?: LucideIcon
  statusTone?: Tone
  badge?: { label: string; tone: Tone } | null
  /** "12 open conversations · View messages →" */
  inbox?: { count: ReactNode; label: string; actionLabel: string; href?: string; onClick?: () => void } | null
  actions?: ChannelAction[]
  children?: ReactNode
  testId?: string
}) {
  const statusColor = STATUS_TEXT[statusTone]
  const inboxBody = inbox && (
    <>
      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 flex-1">
        <strong className="font-semibold tabular-nums">{inbox.count}</strong> {inbox.label}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
        {inbox.actionLabel}
        <ArrowRight className="h-[13px] w-[13px]" aria-hidden />
      </span>
    </>
  )
  const inboxCls =
    "flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-2.5 text-start text-[13px] transition-colors hover:bg-primary/10"
  return (
    <section className="flex flex-col gap-3.5 rounded-[10px] border bg-card p-4" data-testid={testId}>
      <div className="flex flex-wrap items-start gap-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: color }}>
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div className="flex min-w-[180px] flex-1 flex-col gap-[3px]">
          <span className="text-[17px] font-semibold tracking-[-0.01em]">{title}</span>
          {status && (
            <span className={cn("inline-flex items-center gap-1.5 text-[13px]", statusColor)}>
              {StatusIcon && <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              {status}
            </span>
          )}
        </div>
        {badge && (
          <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-xs font-semibold", TONE_CLASS[badge.tone])}>{badge.label}</span>
        )}
      </div>
      {inbox &&
        (inbox.href ? (
          <Link href={inbox.href} className={inboxCls} data-testid="channel-inbox-link">
            {inboxBody}
          </Link>
        ) : (
          <button type="button" onClick={inbox.onClick} className={inboxCls} data-testid="channel-inbox-link">
            {inboxBody}
          </button>
        ))}
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((a, i) => (
            <ChannelActionButton key={`${a.label}-${i}`} action={a} />
          ))}
        </div>
      )}
      {children}
    </section>
  )
}

/** Amber alert banner under the head card (token expired, sync failing) with one action. */
export function ChannelAlert({
  title,
  text,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = RefreshCw,
  actionDisabled,
  testId = "channel-alert",
}: {
  title: string
  text?: ReactNode
  actionLabel?: string
  onAction?: () => void
  actionIcon?: LucideIcon
  actionDisabled?: boolean
  testId?: string
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-start gap-3 rounded-[10px] border border-amber-500/40 bg-amber-500/[0.08] px-3.5 py-3"
      data-testid={testId}
    >
      <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
      <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">{title}</span>
        {text && <span className="text-xs leading-[17px] text-foreground/80">{text}</span>}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className="inline-flex h-[30px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-amber-700/40 bg-background px-2.5 text-xs font-medium text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 dark:text-amber-400"
        >
          <ActionIcon className="h-[13px] w-[13px]" aria-hidden />
          {actionLabel}
        </button>
      )}
    </div>
  )
}

/** One connected account (page, number, mailbox): 36px avatar, name, meta, sub, badge, row actions. */
export function AccountRow({
  avatar,
  name,
  meta,
  sub,
  subTone = "muted",
  badge,
  actions,
  testId,
}: {
  /** Initials / emoji, or an `<img>`. */
  avatar: ReactNode
  name: ReactNode
  meta?: ReactNode
  sub?: ReactNode
  subTone?: "muted" | "danger" | "warning" | "success"
  badge?: { label: string; tone: Tone } | null
  /** Row buttons (28px ghost, see `AccountRowAction`). */
  actions?: ReactNode
  testId?: string
}) {
  const SUB = {
    muted: "text-muted-foreground",
    danger: "text-destructive",
    warning: "text-amber-700 dark:text-amber-400",
    success: "text-green-700 dark:text-green-400",
  } as const
  return (
    <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-b-0" data-testid={testId}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[13px] font-semibold text-primary">
        {avatar}
      </span>
      <div className="flex min-w-[180px] flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-medium">{name}</span>
        {meta && <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{meta}</span>}
        {sub && <span className={cn("text-xs", SUB[subTone])}>{sub}</span>}
      </div>
      {badge && (
        <span className={cn("inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full border px-2 text-[11px] font-semibold", TONE_CLASS[badge.tone])}>
          {badge.label}
        </span>
      )}
      {actions && <div className="flex flex-wrap gap-1">{actions}</div>}
    </div>
  )
}

/** 28px ghost row action of an `AccountRow` (Settings, Assign, Disconnect). */
export function AccountRowAction({
  label,
  icon: Icon,
  onClick,
  tone = "default",
  disabled,
  testId,
}: {
  label: string
  icon?: LucideIcon
  onClick: () => void
  tone?: "default" | "danger"
  disabled?: boolean
  testId?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={cn(
        "inline-flex h-7 items-center gap-[5px] whitespace-nowrap rounded-md px-2 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        tone === "danger" ? "text-destructive" : "text-foreground"
      )}
    >
      {Icon && <Icon className="h-[13px] w-[13px]" aria-hidden />}
      {label}
    </button>
  )
}

/** Key facts grid (WhatsApp coexistence: number, quality, tier, ...): auto-fit 150px cells. */
export function FactsGrid({ items, className }: { items: { k: string; v: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] border-b", className)}>
      {items.map((f) => (
        <div key={f.k} className="flex flex-col gap-0.5 border-e px-4 py-3 last:border-e-0">
          <dt className="text-[11px] text-muted-foreground">{f.k}</dt>
          <dd className="text-[13px] font-semibold">{f.v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Granted permissions (scope code + why): auto-fit 260px cells. */
export function PermissionList({ items }: { items: { scope: string; why: ReactNode }[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
      {items.map((p) => (
        <div key={p.scope} className="flex flex-col gap-[3px] border-b px-4 py-2.5">
          <code className="self-start rounded bg-muted px-1.5 py-px font-mono text-[11px]">{p.scope}</code>
          <span className="text-xs leading-4 text-muted-foreground">{p.why}</span>
        </div>
      ))}
    </div>
  )
}

/** Bordered note under the channel (12px/17px, muted icon). */
export function ChannelNote({ icon: Icon, children, testId }: { icon: LucideIcon; children: ReactNode; testId?: string }) {
  return (
    <div className="flex gap-2.5 rounded-lg border px-3 py-2.5 text-xs leading-[17px] text-foreground/85" data-testid={testId}>
      <Icon className="mt-px h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="[text-wrap:pretty]">{children}</span>
    </div>
  )
}
