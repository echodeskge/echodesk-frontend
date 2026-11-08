"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { ChevronsUpDown, LogOut, Monitor, Moon, Search, Sun } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/contexts/ThemeContext"
import { MenuItem } from "@/services/permissionService"

function initials(text: string | undefined | null, fallback = "ED") {
  const parts = (text || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("")
}

/* ── Workspace header: small logo / initials tile + name + domain ─────── */

interface WorkspaceHeaderProps {
  name?: string | null
  domain?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
}

export function SidebarWorkspaceHeader({ name, domain, logoUrl, primaryColor }: WorkspaceHeaderProps) {
  const title = name || "EchoDesk"
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
      {logoUrl ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md">
          <Image src={logoUrl} alt={title} width={56} height={56} className="h-7 w-7 object-contain" />
        </span>
      ) : (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground"
          style={primaryColor ? { backgroundColor: primaryColor } : undefined}
        >
          {initials(title)}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
        <span className="truncate text-[13px] font-semibold leading-4" title={title}>{title}</span>
        {domain && (
          <span className="truncate text-[11px] leading-[14px] text-muted-foreground" title={domain}>{domain}</span>
        )}
      </span>
    </div>
  )
}

/* ── Search: ⌘K / Ctrl+K command palette over every visible page ─────── */

interface SearchEntry {
  id: string
  label: string
  parent?: string
  Icon?: React.ComponentType<{ className?: string }>
}

export function flattenSearchEntries(
  items: MenuItem[],
  iconFor: (icon: string) => React.ComponentType<{ className?: string }> | undefined,
): SearchEntry[] {
  const out: SearchEntry[] = []
  for (const item of items) {
    if (item.isLocked) continue
    const Icon = iconFor(item.icon)
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        if (child.isLocked) continue
        out.push({ id: child.id, label: child.label, parent: item.label, Icon: iconFor(child.icon) || Icon })
      }
    } else {
      out.push({ id: item.id, label: item.label, Icon })
    }
  }
  return out
}

interface SearchProps {
  items: MenuItem[]
  iconFor: (icon: string) => React.ComponentType<{ className?: string }> | undefined
  /** Items that are actions rather than routes (help, report-bug). */
  onAction: (id: string) => void
  actionIds: ReadonlySet<string>
  onNavigate?: () => void
}

export function SidebarSearch({ items, iconFor, onAction, actionIds, onNavigate }: SearchProps) {
  const t = useTranslations("nav.sidebar")
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const entries = React.useMemo(() => flattenSearchEntries(items, iconFor), [items, iconFor])
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const select = (id: string) => {
    setOpen(false)
    onNavigate?.()
    if (actionIds.has(id)) onAction(id)
    else router.push(`/${id}`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full items-center gap-2 rounded-md bg-muted px-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground group-data-[collapsible=icon]:hidden"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">{t("search")}</span>
        <kbd className="rounded border border-border px-1 font-mono text-[11px] leading-4">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("search")}
        title={t("search")}
        className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground group-data-[collapsible=icon]:flex"
      >
        <Search className="h-4 w-4" />
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title={t("search")}>
        <CommandInput placeholder={t("searchPlaceholder")} />
        <CommandList>
          <CommandEmpty>{t("noResults")}</CommandEmpty>
          <CommandGroup heading={t("pages")}>
            {entries.map(({ id, label, parent, Icon }) => (
              <CommandItem
                key={id}
                value={`${parent ?? ""} ${label} ${id}`}
                onSelect={() => select(id)}
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                <span>{label}</span>
                {parent && <span className="ms-auto text-xs text-muted-foreground">{parent}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

/* ── User menu: avatar button that opens theme + logout ───────────────── */

interface UserMenuProps {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  onLogout: () => void
}

export function SidebarUserMenu({ firstName, lastName, email, onLogout }: UserMenuProps) {
  const t = useTranslations("nav.sidebar")
  const { mode, setMode } = useTheme()
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || email || ""

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            {initials(fullName, "?")}
          </span>
          <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-[13px] font-medium leading-4">{fullName}</span>
            {email && <span className="truncate text-[11px] leading-[14px] text-muted-foreground">{email}</span>}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-[13px] font-medium leading-4">{fullName}</p>
          {email && <p className="truncate text-[11px] leading-[14px] text-muted-foreground">{email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("theme")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setMode(v as "light" | "dark" | "system")}>
          <DropdownMenuRadioItem value="light"><Sun className="me-2 h-4 w-4" />{t("light")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon className="me-2 h-4 w-4" />{t("dark")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><Monitor className="me-2 h-4 w-4" />{t("system")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout} className="text-destructive focus:text-destructive">
          <LogOut className="me-2 h-4 w-4" />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
