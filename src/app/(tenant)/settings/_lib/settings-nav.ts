import {
  Settings,
  Palette,
  List,
  FileText,
  CreditCard,
  Shield,
  MessageSquare,
  Phone,
  Headset,
  ShoppingBag,
  Receipt,
  Calendar,
  CalendarDays,
  Link2,
  Sparkles,
  BarChart3,
  Users,
  UsersRound,
  Bell,
} from "lucide-react"

/** Design nav groups, in display order. */
export const SETTINGS_GROUPS = ["workspace", "channels", "calls", "business", "team", "account"] as const
export type SettingsGroup = (typeof SETTINGS_GROUPS)[number]

export interface SettingsNavItem {
  id: string
  href: string
  icon: React.ElementType
  labelKey: string
  /** Design nav group (ST-00). */
  group: SettingsGroup
  /** One-line description under the label (mobile list, home cards): `settings.<descKey>`. */
  descKey: string
  /** Visible when the user has any of these feature keys. */
  featureKey?: string | string[]
  staffOnly?: boolean
  // Shown to staff/superusers and to holders of any of these permissions
  // (mirrors the backend gate of the page's API).
  anyPermission?: string[]
  // Where the link goes for users who see the item without
  // can_manage_settings (the first page they may open).
  hrefWithoutManageSettings?: string
}

// The gate fields (featureKey, staffOnly, anyPermission,
// hrefWithoutManageSettings) and the order are unchanged from the pre-redesign
// sidebar; ST-00 only added `group` and `descKey`.
export const settingsNav: SettingsNavItem[] = [
  {
    id: "general",
    href: "/settings/general",
    icon: Settings,
    labelKey: "nav.general",
    group: "workspace",
    descKey: "navDesc.general",
  },
  {
    id: "appearance",
    href: "/settings/appearance",
    icon: Palette,
    labelKey: "nav.appearance",
    group: "workspace",
    descKey: "navDesc.appearance",
  },
  {
    id: "notifications",
    href: "/settings/notifications",
    icon: Bell,
    labelKey: "nav.notifications",
    group: "workspace",
    descKey: "navDesc.notifications",
  },
  {
    id: "social",
    href: "/settings/social",
    icon: MessageSquare,
    labelKey: "nav.social",
    group: "channels",
    descKey: "navDesc.social",
    featureKey: "social_integrations",
  },
  {
    id: "social-connections",
    href: "/settings/social/connections",
    icon: Link2,
    labelKey: "nav.socialConnections",
    group: "channels",
    descKey: "navDesc.socialConnections",
    featureKey: "social_integrations",
  },
  {
    id: "social-auto-posting",
    href: "/settings/social/auto-posting",
    icon: Sparkles,
    labelKey: "nav.autoPosting",
    group: "channels",
    descKey: "navDesc.autoPosting",
    featureKey: "social_integrations",
  },
  {
    id: "templates",
    href: "/settings/templates",
    icon: FileText,
    labelKey: "nav.templates",
    group: "channels",
    descKey: "navDesc.templates",
    featureKey: "social_integrations",
  },
  {
    id: "social-rating-statistics",
    href: "/settings/social/rating-statistics",
    icon: BarChart3,
    labelKey: "nav.ratingStatistics",
    group: "channels",
    descKey: "navDesc.ratingStatistics",
    featureKey: "social_integrations",
    staffOnly: true,
  },
  {
    id: "calls",
    href: "/settings/calls",
    icon: Phone,
    labelKey: "nav.calls",
    group: "calls",
    descKey: "navDesc.calls",
    featureKey: "ip_calling",
    // SIP configuration + extensions: PBX admins (staff or manage_settings).
    anyPermission: ["can_manage_settings"],
  },
  {
    id: "pbx",
    href: "/settings/pbx",
    icon: Headset,
    labelKey: "nav.pbx",
    group: "calls",
    descKey: "navDesc.pbx",
    featureKey: "ip_calling",
    // PBX config (manage_settings) or its statistics tab (view_reports).
    anyPermission: ["can_manage_settings", "can_view_reports"],
    // view_reports-only users can open just the statistics tab.
    hrefWithoutManageSettings: "/settings/pbx/statistics",
  },
  {
    id: "ecommerce",
    href: "/settings/ecommerce",
    icon: ShoppingBag,
    labelKey: "nav.ecommerce",
    group: "business",
    descKey: "navDesc.ecommerce",
    featureKey: "ecommerce_crm",
  },
  {
    id: "invoices",
    href: "/settings/invoices",
    icon: Receipt,
    labelKey: "nav.invoices",
    group: "business",
    descKey: "navDesc.invoices",
    featureKey: "invoice_management",
  },
  {
    id: "bookings",
    href: "/settings/bookings",
    icon: Calendar,
    labelKey: "nav.bookings",
    group: "business",
    descKey: "navDesc.bookings",
    featureKey: "booking_management",
  },
  {
    id: "leave",
    href: "/settings/leave",
    icon: CalendarDays,
    labelKey: "nav.leave",
    group: "business",
    descKey: "navDesc.leave",
    featureKey: "leave_management",
  },
  {
    id: "item-lists",
    href: "/settings/item-lists",
    icon: List,
    labelKey: "nav.itemLists",
    group: "business",
    descKey: "navDesc.itemLists",
    // Lists also back e-commerce (store branches, homepage sections), so
    // e-commerce-only workspaces need them too.
    featureKey: ["ticket_management", "ecommerce_crm"],
  },
  {
    id: "ticket-forms",
    href: "/settings/ticket-forms",
    icon: FileText,
    labelKey: "nav.ticketForms",
    group: "business",
    descKey: "navDesc.ticketForms",
    featureKey: "ticket_management",
  },
  {
    id: "users",
    href: "/settings/users",
    icon: Users,
    labelKey: "nav.users",
    group: "team",
    descKey: "navDesc.users",
  },
  {
    id: "groups",
    href: "/settings/groups",
    icon: UsersRound,
    labelKey: "nav.groups",
    group: "team",
    descKey: "navDesc.groups",
  },
  {
    id: "subscription",
    href: "/settings/subscription",
    icon: CreditCard,
    labelKey: "nav.subscription",
    group: "account",
    descKey: "navDesc.subscription",
    staffOnly: true,
  },
  {
    id: "security",
    href: "/settings/security",
    icon: Shield,
    labelKey: "nav.security",
    group: "account",
    descKey: "navDesc.security",
    staffOnly: true,
  },
]

export interface NavGates {
  isStaffOrAdmin: boolean
  hasFeatureAccess: (keyOrKeys: string | string[]) => boolean
  hasBackendPermission: (permission: string) => boolean
}

/** The pre-redesign sidebar filter, unchanged (staffOnly, then anyPermission, then featureKey). */
export function filterSettingsNav(items: SettingsNavItem[], { isStaffOrAdmin, hasFeatureAccess, hasBackendPermission }: NavGates): SettingsNavItem[] {
  return items.filter((item) => {
    if (item.staffOnly && !isStaffOrAdmin) return false
    if (
      item.anyPermission &&
      !isStaffOrAdmin &&
      !item.anyPermission.some((p) => hasBackendPermission(p))
    )
      return false
    if (item.featureKey && !hasFeatureAccess(item.featureKey)) return false
    return true
  })
}

/**
 * Only one item is active: the one with the longest matching href. A plain
 * prefix match would light up "/settings/social" together with its
 * sub-pages ("/settings/social/connections", …).
 */
export function activeSettingsId(items: SettingsNavItem[], pathname: string): string | undefined {
  return items
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.id
}

/** Visible items grouped in design order (empty groups dropped). */
export function groupSettingsNav(items: SettingsNavItem[]): { group: SettingsGroup; items: SettingsNavItem[] }[] {
  return SETTINGS_GROUPS.map((group) => ({ group, items: items.filter((i) => i.group === group) })).filter((g) => g.items.length > 0)
}

/** Case-insensitive match of the query against the translated label and description. */
export function matchesSettingsSearch(query: string, label: string, desc: string): boolean {
  const q = query.trim().toLocaleLowerCase()
  if (!q) return true
  return label.toLocaleLowerCase().includes(q) || desc.toLocaleLowerCase().includes(q)
}
