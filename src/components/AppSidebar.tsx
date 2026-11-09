"use client"

import * as React from "react"
import NextLink from "next/link"
import {
  Ticket,
  Phone,
  ShoppingCart,
  Users,
  UserCheck,
  UserRound,
  MessageCircle,
  Share2,
  Settings,
  Clock,
  BarChart3,
  FileText,
  Timer,
  Home,
  Package,
  ShoppingBag,
  Tags,
  UsersRound,
  ListTree,
  ChevronDown,
  Globe,
  Calendar,
  CalendarCheck,
  Briefcase,
  FolderTree,
  List,
  PieChart,
  Link as LinkIcon,
  LayoutDashboard,
  History,
  Mail,
  HelpCircle,
  Palette,
  Shield,
  CreditCard,
  Sparkles,
  Bug,
  Receipt,
  SlidersHorizontal,
  Bell,
  Truck,
  Tag,
  Star,
  Handshake,
  Target,
  CalendarRange,
  Wallet,
  Plus,
  CircleDashed,
  SignalHigh,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { AuthUser, TenantInfo } from "@/types/auth"
import { User } from "@/api/generated/interfaces"
import { MenuItem } from "@/services/permissionService"
import { LockedFeatureBadge } from "@/components/subscription/LockedFeatureBadge"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useUnreadMessagesCount } from "@/hooks/api/useSocial"
import { useIsMobile } from "@/hooks/use-mobile"
import { SidebarSearch, SidebarUserMenu, SidebarWorkspaceHeader } from "@/components/sidebar/SidebarChrome"
import { usePathname, useSearchParams } from "next/navigation"
import { useBoard } from "@/contexts/BoardContext"
import { useBoardAdmin } from "@/components/tickets-admin/board-admin-host"
import { useBoardsLite, useViewCounts } from "@/app/(tenant)/tickets/_hooks/use-boards-lite"
import {
  EMPTY_FILTERS,
  parseTicketSearchParams,
  serializeTicketState,
  type ResolvedFilters,
} from "@/app/(tenant)/tickets/_hooks/use-ticket-filters"
import { flags } from "@/app/(tenant)/tickets/_lib/flags"
import { ColorDot } from "@/app/(tenant)/tickets/_components/primitives/color-dot"
import type { ViewCounts } from "@/app/(tenant)/tickets/_lib/types"

// Icon mapping for menu items (lucide-react icon names) — includes Receipt for invoices
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  // Lucide icon names (from navigationConfig)
  "Ticket": Ticket,
  "Clock": Clock,
  "BarChart3": BarChart3,
  "Phone": Phone,
  "FileText": FileText,
  "Package": Package,
  "ShoppingBag": ShoppingBag,
  "ShoppingCart": ShoppingCart,
  "Tags": Tags,
  "ListTree": ListTree,
  "MessageSquare": MessageCircle,
  "Users": Users,
  "UsersRound": UsersRound,
  "UserRound": UserRound,
  "UserCheck": UserCheck,
  "Share2": Share2,
  "Settings": Settings,
  "SlidersHorizontal": SlidersHorizontal,
  "Bell": Bell,
  "Globe": Globe,
  "Calendar": Calendar,
  "CalendarCheck": CalendarCheck,
  "Briefcase": Briefcase,
  "FolderTree": FolderTree,
  "List": List,
  "PieChart": PieChart,
  "CalendarDays": Calendar,
  "Link": LinkIcon,
  "LayoutDashboard": LayoutDashboard,
  "History": History,
  "Mail": Mail,
  "HelpCircle": HelpCircle,
  "Palette": Palette,
  "Shield": Shield,
  "CreditCard": CreditCard,
  "Sparkles": Sparkles,
  "Bug": Bug,
  "Receipt": Receipt,
  "Truck": Truck,
  "Tag": Tag,
  "Star": Star,
  "Handshake": Handshake,
  "Target": Target,
  "CalendarRange": CalendarRange,
  "Wallet": Wallet,
  // Legacy emoji support (for backward compatibility)
  "🏠": Home,
  "🎫": Ticket,
  "📦": Package,
  "📝": FileText,
  "📞": Phone,
  "⏱️": Timer,
  "📊": BarChart3,
  "👥": Users,
  "👨‍👩‍👧‍👦": UserCheck,
  "💬": MessageCircle,
  "📱": Share2,
  "⚙️": Settings,
  "⏰": Clock,
  "🛒": ShoppingCart,
}

const FOOTER_ITEM_IDS_ORDER = ['settings', 'preferences', 'help', 'report-bug'] as const
const FOOTER_ITEM_IDS = new Set<string>(FOOTER_ITEM_IDS_ORDER)
// Menu entries that open a dialog instead of navigating.
const ACTION_ITEM_IDS: ReadonlySet<string> = new Set(['help', 'report-bug'])
const iconFor = (icon: string) => iconMap[icon as keyof typeof iconMap] as React.ComponentType<{ className?: string }> | undefined

/**
 * Section headers (design: uppercase group labels). Items keep the order the
 * tenant configured; a header is drawn whenever the group changes, so a custom
 * order never moves an item.
 */
export type NavGroup = "work" | "business" | "channels"
const GROUP_OF: Record<string, NavGroup> = {
  "tickets": "work",
  "user-statistics": "work",
  "calls": "work",
  "time-tracking": "work",
  "ecommerce": "business",
  "bookings": "business",
  "leave": "business",
  "invoices/invoices": "business",
  "invoices": "business",
  "social/messages": "channels",
  "email": "channels",
  "social/clients": "channels",
}
export function navGroupOf(id: string): NavGroup {
  if (GROUP_OF[id]) return GROUP_OF[id]
  if (id.startsWith("social/")) return "channels"
  if (id.startsWith("ecommerce") || id.startsWith("bookings") || id.startsWith("leave") || id.startsWith("invoices")) return "business"
  return "work"
}

/** Consecutive runs of items that share a group. */
export function groupNavItems<T extends { id: string }>(items: T[]): { group: NavGroup; items: T[] }[] {
  const runs: { group: NavGroup; items: T[] }[] = []
  for (const item of items) {
    const group = navGroupOf(item.id)
    const last = runs[runs.length - 1]
    if (last && last.group === group) last.items.push(item)
    else runs.push({ group, items: [item] })
  }
  return runs
}

const ITEM_CLASS =
  "h-8 gap-2 text-[13px] font-normal text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground"

function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null
  return (
    <>
      <span
        aria-label={label}
        className="ms-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-none text-destructive-foreground tabular-nums group-data-[collapsible=icon]:hidden"
      >
        {count > 99 ? "99+" : count}
      </span>
      <span
        aria-hidden
        className="absolute right-1.5 top-1.5 hidden h-[7px] w-[7px] rounded-full bg-destructive ring-[1.5px] ring-sidebar group-data-[collapsible=icon]:block"
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Boards item: nested boards + saved views (plan §3 sidebar, U4, DC6, DC7)
// ---------------------------------------------------------------------------

/** Saved views: sidebar shortcuts that open the list view with URL filters (U4). */
export interface SidebarView {
  key: "mine" | "unassigned" | "urgent" | "dueThisWeek"
  icon: React.ComponentType<{ className?: string }>
  count: keyof ViewCounts
  filters: ResolvedFilters
}

export const SIDEBAR_VIEWS: readonly SidebarView[] = [
  { key: "mine", icon: UserRound, count: "mine", filters: { ...EMPTY_FILTERS, assignee: ["me"] } },
  { key: "unassigned", icon: CircleDashed, count: "unassigned", filters: { ...EMPTY_FILTERS, unassigned: true } },
  { key: "urgent", icon: SignalHigh, count: "urgent", filters: { ...EMPTY_FILTERS, priority: ["critical", "high"] } },
  { key: "dueThisWeek", icon: Calendar, count: "due_this_week", filters: { ...EMPTY_FILTERS, due: "week" } },
]

const sameSet = <T,>(a: readonly T[], b: readonly T[]) =>
  a.length === b.length && a.every((x) => b.includes(x))

/** True when two filter sets are equal (order-insensitive lists; DC7). */
export function filtersEqual(a: ResolvedFilters, b: ResolvedFilters): boolean {
  return (
    sameSet(a.assignee, b.assignee) &&
    a.unassigned === b.unassigned &&
    sameSet(a.priority, b.priority) &&
    sameSet(a.label, b.label) &&
    a.due === b.due &&
    a.q.trim() === b.q.trim()
  )
}

/** `/tickets?board=…&view=list&<filters>` for a saved view. */
export function viewHref(boardId: number | null, filters: ResolvedFilters): string {
  const qs = serializeTicketState({ boardId, view: "list", sort: "created", filters })
  return qs ? `/tickets?${qs}` : "/tickets"
}

const BOARDS_OPEN_KEY = "echodesk_sidebar_boards_open"

function readBoardsOpen(): boolean | null {
  try {
    const v = typeof window === "undefined" ? null : window.localStorage.getItem(BOARDS_OPEN_KEY)
    return v === "1" ? true : v === "0" ? false : null
  } catch {
    return null
  }
}

function writeBoardsOpen(open: boolean) {
  try {
    window.localStorage.setItem(BOARDS_OPEN_KEY, open ? "1" : "0")
  } catch {
    // Storage blocked: the toggle still works for this page view.
  }
}

const SUB_ROW_CLASS =
  "flex h-7 w-full items-center gap-2 rounded-md px-2 text-[13px] text-sidebar-foreground/85 outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground"

/**
 * The nested list under "Boards": one 28px row per accessible board (dot,
 * name, open count), "+ New board" (gated), then the Views section (behind
 * `flags.listViewEnabled`). Reads `useSearchParams`, so it renders inside a
 * Suspense boundary.
 */
function BoardsSubList({ onNavigate }: { onNavigate: () => void }) {
  const tViews = useTranslations("tickets.views")
  const tMenu = useTranslations("tickets.boardAdmin.menu")
  const pathname = usePathname() ?? ""
  const searchParams = useSearchParams()
  const { selectedBoardId, setSelectedBoardId } = useBoard()
  const { openCreateBoard, gates } = useBoardAdmin()
  const { data: boards } = useBoardsLite()

  const onTickets = pathname === "/tickets" || pathname.startsWith("/tickets/")
  const url = React.useMemo(
    () => parseTicketSearchParams(new URLSearchParams(searchParams?.toString() ?? ""), null),
    [searchParams],
  )
  // Highlighted board: `?board` on the tickets screens, else the context's board there.
  const activeBoardId = onTickets ? (url.boardId ?? selectedBoardId) : null
  // Board the views (and their counts) apply to.
  const viewsBoardId =
    activeBoardId ?? selectedBoardId ?? boards?.find((b) => b.is_default)?.id ?? boards?.[0]?.id ?? null
  const { data: counts } = useViewCounts(viewsBoardId, { enabled: flags.listViewEnabled })
  const listOnBoardScreen = pathname === "/tickets" && url.view === "list"

  return (
    <div
      data-testid="sidebar-boards"
      className="mb-1 ml-[15px] mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-[9px] group-data-[collapsible=icon]:hidden"
    >
      <ul className="flex flex-col gap-0.5" aria-label={tMenu("switchBoard")}>
        {(boards ?? []).map((b) => {
          const active = activeBoardId === b.id
          return (
            <li key={b.id}>
              <NextLink
                href={`/tickets?board=${b.id}${listOnBoardScreen ? "&view=list" : ""}`}
                data-active={active}
                aria-current={active ? "page" : undefined}
                data-testid={`sidebar-board-${b.id}`}
                className={SUB_ROW_CLASS}
                onClick={() => {
                  setSelectedBoardId(b.id)
                  onNavigate()
                }}
              >
                <ColorDot color={b.color} size={8} />
                <span className="flex-1 truncate">{b.name}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">{b.open_count}</span>
              </NextLink>
            </li>
          )
        })}
      </ul>
      {gates.canCreateBoard && (
        <button
          type="button"
          data-testid="sidebar-new-board"
          className={`${SUB_ROW_CLASS} text-muted-foreground`}
          onClick={() => {
            openCreateBoard()
            onNavigate()
          }}
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{tMenu("newBoard")}</span>
        </button>
      )}
      {flags.listViewEnabled && (
        <div data-testid="sidebar-views" className="mt-2 flex flex-col gap-0.5">
          <div className="flex h-6 items-center px-2 text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">
            {tViews("title")}
          </div>
          <ul className="flex flex-col gap-0.5">
            {SIDEBAR_VIEWS.map((v) => {
              const Icon = v.icon
              const active = pathname === "/tickets" && filtersEqual(url.filters, v.filters)
              const count = counts?.[v.count]
              return (
                <li key={v.key}>
                  <NextLink
                    href={viewHref(viewsBoardId, v.filters)}
                    data-active={active}
                    aria-current={active ? "page" : undefined}
                    data-testid={`sidebar-view-${v.key}`}
                    className={`${SUB_ROW_CLASS} h-[30px]`}
                    onClick={onNavigate}
                  >
                    <Icon className="h-[15px] w-[15px] shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{tViews(v.key)}</span>
                    {typeof count === "number" && (
                      <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>
                    )}
                  </NextLink>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

interface AppSidebarProps {
  tenant: TenantInfo
  userProfile: User | null
  visibleMenuItems: MenuItem[]
  currentView: string
  onMenuClick: (viewId: string) => void
  onPrefetch?: (viewId: string) => void
  onLogout: () => void
}

export function AppSidebar({
  tenant,
  userProfile,
  visibleMenuItems,
  currentView,
  onMenuClick,
  onPrefetch,
  onLogout
}: AppSidebarProps) {
  const t = useTranslations("nav.sidebar")
  const isMobile = useIsMobile()
  const { setOpenMobile, state, setOpen } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile
  // Requests waiting for this user's substitute consent (profile.leave_features).
  const pendingSubstituteCount =
    (userProfile as unknown as { leave_features?: { pending_substitute_count?: number } | null } | null)
      ?.leave_features?.pending_substitute_count ?? 0

  const closeOnMobile = () => { if (isMobile) setOpenMobile(false) }
  const handleMenuClick = (viewId: string) => {
    onMenuClick(viewId)
    closeOnMobile()
  }
  const showLocked = (label: string) => toast.info(t("premiumRequired", { name: label }))

  // Boards item expansion (DC6): the user's last choice, else open on /tickets.
  const onTicketsView = currentView === "tickets"
  const [boardsOpenPref, setBoardsOpenPref] = React.useState<boolean | null>(null)
  React.useEffect(() => { setBoardsOpenPref(readBoardsOpen()) }, [])
  const boardsOpen = boardsOpenPref ?? onTicketsView
  const toggleBoards = () => {
    const next = !boardsOpen
    setBoardsOpenPref(next)
    writeBoardsOpen(next)
  }

  // Get unread counts for sidebar badges
  const { data: unreadCount } = useUnreadMessagesCount()
  const emailUnread = unreadCount?.email ?? 0
  // Social messages unread = facebook + instagram + whatsapp
  const socialUnread = (unreadCount?.facebook ?? 0) + (unreadCount?.instagram ?? 0) + (unreadCount?.whatsapp ?? 0)
  const countFor = (id: string) =>
    id === "social/messages" ? socialUnread : id === "email" ? emailUnread : id === "leave/covering" ? pendingSubstituteCount : 0

  // Settings / Help / Report a bug live in the footer, above the user block.
  const mainItems = visibleMenuItems.filter((item) => !FOOTER_ITEM_IDS.has(item.id))
  const footerItems = FOOTER_ITEM_IDS_ORDER
    .map((id) => visibleMenuItems.find((item) => item.id === id))
    .filter((item): item is MenuItem => !!item)
  const groups = groupNavItems(mainItems)

  const tooltipFor = (item: MenuItem) =>
    item.isLocked ? `${t("premiumFeature")} · ${item.label}` : item.label

  const renderIcon = (item: { icon: string }, locked: boolean, size = "h-4 w-4") => {
    const Icon = iconMap[item.icon as keyof typeof iconMap]
    return Icon
      ? <Icon className={`${size} shrink-0 ${locked ? "text-muted-foreground" : ""}`} />
      : <span className={`text-sm ${locked ? "text-muted-foreground" : ""}`}>{item.icon}</span>
  }

  const renderItem = (item: MenuItem, inFooter = false) => {
    const isActive = currentView === item.id || (item.id === 'settings' && currentView.startsWith('settings/'))
    const isLocked = item.isLocked || false
    const isAction = ACTION_ITEM_IDS.has(item.id)
    // On desktop, settings uses its own internal sidebar — don't expand children here
    const hasChildren = item.children && item.children.length > 0 && !(item.id === 'settings' && !isMobile)
    const isChildActive = hasChildren && item.children!.some(child => currentView === child.id)
    const childCount = hasChildren ? item.children!.reduce((sum, c) => sum + countFor(c.id), 0) : 0

    if (hasChildren) {
      return (
        <SidebarMenuItem key={item.id}>
          <Collapsible className="group/collapsible" defaultOpen={isChildActive}>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                onMouseEnter={() => {
                  if (!isLocked && item.children?.length) onPrefetch?.(item.children[0].id)
                }}
                onClick={(e) => {
                  // In icon mode the children have nowhere to show: open the sidebar first.
                  if (collapsed) { e.preventDefault(); setOpen(true) }
                }}
                isActive={isChildActive && collapsed}
                tooltip={tooltipFor(item)}
                className={`${ITEM_CLASS} relative [&[data-state=open]>svg:last-child]:rotate-180`}
              >
                {renderIcon(item, isLocked)}
                <span className={`truncate ${isLocked ? "text-muted-foreground" : ""}`}>{item.label}</span>
                {isLocked && <LockedFeatureBadge className="ms-1" size="sm" />}
                {childCount > 0 && collapsed && <CountBadge count={childCount} label={String(childCount)} />}
                <ChevronDown className="ms-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <SidebarMenuSub className="mx-0 mb-1 ms-[15px] mt-0.5 gap-0.5 border-l border-sidebar-border px-0 ps-[9px]">
                {item.children!.map((child) => {
                  const isChildItemActive = currentView === child.id
                  const isChildLocked = child.isLocked || false
                  const count = countFor(child.id)
                  return (
                    <SidebarMenuSubItem key={child.id}>
                      <SidebarMenuSubButton
                        onMouseEnter={() => !isChildLocked && onPrefetch?.(child.id)}
                        asChild={!isChildLocked}
                        isActive={isChildItemActive}
                        className="h-7 cursor-pointer gap-2 text-[13px] text-sidebar-foreground/85 hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground [&>svg]:size-3.5"
                      >
                        {isChildLocked ? (
                          <span className="flex w-full items-center gap-2" onClick={() => showLocked(child.label)}>
                            {renderIcon(child, true, "h-3.5 w-3.5")}
                            <span className="truncate text-muted-foreground">{child.label}</span>
                            <LockedFeatureBadge className="ms-auto" size="sm" />
                          </span>
                        ) : (
                          <NextLink href={`/${child.id}`} className="flex w-full items-center gap-2" onClick={closeOnMobile}>
                            {renderIcon(child, false, "h-3.5 w-3.5")}
                            <span className="truncate">{child.label}</span>
                            {count > 0 && (
                              <span className="ms-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-none text-destructive-foreground tabular-nums">
                                {count > 99 ? "99+" : count}
                              </span>
                            )}
                          </NextLink>
                        )}
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
      )
    }

    if (item.id === "tickets" && !isLocked) {
      return (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton
            onMouseEnter={() => onPrefetch?.(item.id)}
            asChild
            isActive={isActive}
            tooltip={tooltipFor(item)}
            className={`${ITEM_CLASS} relative cursor-pointer pe-8`}
          >
            <NextLink href="/tickets" className="flex w-full items-center gap-2" onClick={closeOnMobile}>
              {renderIcon(item, false)}
              <span className="truncate">{item.label}</span>
            </NextLink>
          </SidebarMenuButton>
          <SidebarMenuAction
            onClick={toggleBoards}
            aria-expanded={boardsOpen}
            aria-controls="sidebar-boards-list"
            aria-label={boardsOpen ? t("hideBoards") : t("showBoards")}
            data-testid="sidebar-boards-toggle"
            className="text-muted-foreground"
          >
            <ChevronDown
              className={`!size-3.5 transition-transform duration-200 ${boardsOpen ? "rotate-0" : "-rotate-90"}`}
            />
          </SidebarMenuAction>
          {boardsOpen && !collapsed && (
            <div id="sidebar-boards-list">
              <React.Suspense fallback={null}>
                <BoardsSubList onNavigate={closeOnMobile} />
              </React.Suspense>
            </div>
          )}
        </SidebarMenuItem>
      )
    }

    const count = countFor(item.id)
    const menuContent = (
      <>
        {renderIcon(item, isLocked)}
        <span className={`truncate ${isLocked ? "text-muted-foreground" : ""}`}>{item.label}</span>
        <CountBadge count={count} label={String(count)} />
        {isLocked && <LockedFeatureBadge className="ms-auto" size="sm" />}
      </>
    )

    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          onMouseEnter={() => !isLocked && !isAction && onPrefetch?.(item.id)}
          asChild={!isLocked && !isAction}
          isActive={isActive}
          tooltip={tooltipFor(item)}
          className={`${ITEM_CLASS} relative cursor-pointer ${isLocked ? "opacity-60 hover:opacity-80" : ""}${inFooter ? " text-muted-foreground hover:text-foreground" : ""}`}
          disabled={isLocked}
        >
          {isLocked ? (
            <span className="flex w-full items-center gap-2" onClick={() => showLocked(item.label)}>
              {menuContent}
            </span>
          ) : isAction ? (
            <span className="flex w-full items-center gap-2" onClick={() => handleMenuClick(item.id)}>
              {menuContent}
            </span>
          ) : (
            <NextLink href={`/${item.id}`} className="flex w-full items-center gap-2" onClick={closeOnMobile}>
              {menuContent}
            </NextLink>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="gap-1 bg-sidebar p-2">
        <SidebarWorkspaceHeader
          name={tenant?.name}
          domain={tenant?.domain}
          logoUrl={tenant?.theme?.logo_url}
          primaryColor={tenant?.theme?.primary_color}
        />
        <SidebarSearch
          items={visibleMenuItems}
          iconFor={iconFor}
          actionIds={ACTION_ITEM_IDS}
          onAction={handleMenuClick}
          onNavigate={closeOnMobile}
        />
      </SidebarHeader>

      <SidebarContent className="gap-4 bg-sidebar px-2 py-1">
        {groups.map(({ group, items }, index) => (
          <SidebarGroup key={`${group}-${index}`} className="p-0" data-testid={`nav-group-${group}`}>
            <div className="flex h-6 items-center px-2 text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground group-data-[collapsible=icon]:hidden">
              {t(`groups.${group}`)}
            </div>
            {index > 0 && <SidebarSeparator className="mx-1 mb-1 hidden group-data-[collapsible=icon]:block" />}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {items.map((item) => renderItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-0 border-t border-sidebar-border bg-sidebar p-0">
        {footerItems.length > 0 && (
          <SidebarMenu className="gap-0.5 p-2">
            {footerItems.map((item) => renderItem(item, true))}
          </SidebarMenu>
        )}
        {userProfile && (
          <div className="border-t border-sidebar-border p-2">
            <SidebarUserMenu
              firstName={userProfile.first_name}
              lastName={userProfile.last_name}
              email={userProfile.email}
              onLogout={onLogout}
            />
          </div>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
