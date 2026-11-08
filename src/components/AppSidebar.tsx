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
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
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
  "social/templates": "channels",
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
