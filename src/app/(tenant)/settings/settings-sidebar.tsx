"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { useSubscription } from "@/contexts/SubscriptionContext"
import { useAuth } from "@/contexts/AuthContext"
import { useUserProfile } from "@/hooks/useUserProfile"
import {
  Settings,
  Palette,
  List,
  FileText,
  CreditCard,
  Shield,
  MessageSquare,
  Phone,
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

interface SettingsNavItem {
  id: string
  href: string
  icon: React.ElementType
  labelKey: string
  featureKey?: string
  staffOnly?: boolean
}

const settingsNav: SettingsNavItem[] = [
  {
    id: "general",
    href: "/settings/general",
    icon: Settings,
    labelKey: "nav.general",
  },
  {
    id: "appearance",
    href: "/settings/appearance",
    icon: Palette,
    labelKey: "nav.appearance",
  },
  {
    id: "notifications",
    href: "/settings/notifications",
    icon: Bell,
    labelKey: "nav.notifications",
  },
  {
    id: "social",
    href: "/settings/social",
    icon: MessageSquare,
    labelKey: "nav.social",
    featureKey: "social_integrations",
  },
  {
    id: "social-connections",
    href: "/settings/social/connections",
    icon: Link2,
    labelKey: "nav.socialConnections",
    featureKey: "social_integrations",
  },
  {
    id: "social-auto-posting",
    href: "/settings/social/auto-posting",
    icon: Sparkles,
    labelKey: "nav.autoPosting",
    featureKey: "social_integrations",
  },
  {
    id: "social-rating-statistics",
    href: "/settings/social/rating-statistics",
    icon: BarChart3,
    labelKey: "nav.ratingStatistics",
    featureKey: "social_integrations",
    staffOnly: true,
  },
  {
    id: "calls",
    href: "/settings/calls",
    icon: Phone,
    labelKey: "nav.calls",
    featureKey: "ip_calling",
  },
  {
    id: "ecommerce",
    href: "/settings/ecommerce",
    icon: ShoppingBag,
    labelKey: "nav.ecommerce",
    featureKey: "ecommerce_crm",
  },
  {
    id: "invoices",
    href: "/settings/invoices",
    icon: Receipt,
    labelKey: "nav.invoices",
    featureKey: "invoice_management",
  },
  {
    id: "bookings",
    href: "/settings/bookings",
    icon: Calendar,
    labelKey: "nav.bookings",
    featureKey: "booking_management",
  },
  {
    id: "leave",
    href: "/settings/leave",
    icon: CalendarDays,
    labelKey: "nav.leave",
    featureKey: "leave_management",
  },
  {
    id: "item-lists",
    href: "/settings/item-lists",
    icon: List,
    labelKey: "nav.itemLists",
    featureKey: "ticket_management",
  },
  {
    id: "ticket-forms",
    href: "/settings/ticket-forms",
    icon: FileText,
    labelKey: "nav.ticketForms",
    featureKey: "ticket_management",
  },
  {
    id: "users",
    href: "/settings/users",
    icon: Users,
    labelKey: "nav.users",
  },
  {
    id: "groups",
    href: "/settings/groups",
    icon: UsersRound,
    labelKey: "nav.groups",
  },
  {
    id: "subscription",
    href: "/settings/subscription",
    icon: CreditCard,
    labelKey: "nav.subscription",
    staffOnly: true,
  },
  {
    id: "security",
    href: "/settings/security",
    icon: Shield,
    labelKey: "nav.security",
    staffOnly: true,
  },
]

/** Desktop-only settings sidebar — hidden on mobile (main sidebar handles mobile nav) */
export function SettingsSidebar() {
  const pathname = usePathname()
  const t = useTranslations("settings")
  const { hasFeature } = useSubscription()
  const { user } = useAuth()
  const { data: userProfile } = useUserProfile()

  const isStaffOrAdmin = user?.is_staff || user?.is_superuser

  // Use feature_keys from user profile (same as main sidebar)
  const userFeatureKeys: string[] = userProfile?.feature_keys
    ? typeof userProfile.feature_keys === "string"
      ? JSON.parse(userProfile.feature_keys)
      : userProfile.feature_keys
    : []

  const hasFeatureAccess = (key: string): boolean => {
    // Staff/superadmin see everything
    if (isStaffOrAdmin && userFeatureKeys.length === 0) return true
    // Check user's feature_keys first (from group), then fall back to subscription
    if (userFeatureKeys.length > 0) return userFeatureKeys.includes(key)
    return hasFeature(key as any)
  }

  const visibleItems = settingsNav.filter((item) => {
    if (item.staffOnly && !isStaffOrAdmin) return false
    if (item.featureKey && !hasFeatureAccess(item.featureKey)) return false
    return true
  })

  return (
    <nav className="hidden md:block w-56 flex-shrink-0 border-r bg-muted/30 overflow-y-auto">
      <div className="p-4 pb-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("title")}
        </h2>
      </div>
      <div className="px-2 pb-4 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
