/**
 * Navigation configuration with feature-based access control
 * Access is controlled purely by feature_key - no Django permissions needed
 * Items without requiredFeatureKey are visible to all users
 */

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  requiredFeatureKey?: string; // Feature key from user's feature_keys array (optional - items without this are always visible)
  description: string;
  isPremium?: boolean; // Visual indicator for premium features
  children?: Omit<NavigationItem, 'children' | 'label' | 'description'>[]; // Nested navigation items
}

export const navigationConfig: Omit<NavigationItem, 'label' | 'description'>[] = [
  {
    id: "tickets",
    icon: "Ticket",
    requiredFeatureKey: "ticket_management",
  },
  {
    id: "time-tracking",
    icon: "Clock",
    requiredFeatureKey: "ticket_management",
  },
  {
    id: "user-statistics",
    icon: "BarChart3",
    requiredFeatureKey: "advanced_analytics",
    isPremium: true,
  },
  {
    id: "calls",
    icon: "Phone",
    requiredFeatureKey: "ip_calling",
    isPremium: true,
    children: [
      {
        id: "calls/dashboard",
        icon: "LayoutDashboard",
        requiredFeatureKey: "ip_calling",
        isPremium: true,
      },
      {
        id: "calls/logs",
        icon: "History",
        requiredFeatureKey: "ip_calling",
        isPremium: true,
      },
      {
        id: "calls/settings",
        icon: "Settings",
        requiredFeatureKey: "ip_calling",
        isPremium: true,
      },
    ],
  },
  {
    id: "ecommerce",
    icon: "ShoppingBag",
    requiredFeatureKey: "ecommerce_crm",
    isPremium: true,
    children: [
      {
        id: "ecommerce/orders",
        icon: "ShoppingCart",
        requiredFeatureKey: "ecommerce_crm",
        isPremium: true,
      },
      {
        id: "ecommerce/clients",
        icon: "Users",
        requiredFeatureKey: "ecommerce_crm",
        isPremium: true,
      },
      {
        id: "ecommerce/products",
        icon: "Package",
        requiredFeatureKey: "ecommerce_crm",
        isPremium: true,
      },
      {
        id: "ecommerce/product-attributes",
        icon: "ListTree",
        requiredFeatureKey: "ecommerce_crm",
        isPremium: true,
      },
      {
        id: "ecommerce/languages",
        icon: "Globe",
        requiredFeatureKey: "ecommerce_crm",
        isPremium: true,
      },
      {
        id: "ecommerce/homepage-builder",
        icon: "LayoutDashboard",
        requiredFeatureKey: "ecommerce_crm",
        isPremium: true,
      },
      {
        id: "ecommerce/settings",
        icon: "Settings",
        requiredFeatureKey: "ecommerce_crm",
        isPremium: true,
      },
    ],
  },
  {
    id: "bookings",
    icon: "Calendar",
    requiredFeatureKey: "booking_management",
    isPremium: true,
    children: [
      {
        id: "bookings/bookings",
        icon: "CalendarCheck",
        requiredFeatureKey: "booking_management",
        isPremium: true,
      },
      {
        id: "bookings/calendar",
        icon: "Calendar",
        requiredFeatureKey: "booking_management",
        isPremium: true,
      },
      {
        id: "bookings/services",
        icon: "Briefcase",
        requiredFeatureKey: "booking_management",
        isPremium: true,
      },
      {
        id: "bookings/categories",
        icon: "FolderTree",
        requiredFeatureKey: "booking_management",
        isPremium: true,
      },
      {
        id: "bookings/staff",
        icon: "UserCheck",
        requiredFeatureKey: "booking_management",
        isPremium: true,
      },
      {
        id: "bookings/clients",
        icon: "Users",
        requiredFeatureKey: "booking_management",
        isPremium: true,
      },
      {
        id: "bookings/settings",
        icon: "Settings",
        requiredFeatureKey: "booking_management",
        isPremium: true,
      },
    ],
  },
  {
    id: "leave",
    icon: "Calendar",
    requiredFeatureKey: "leave_management",
    isPremium: true,
    children: [
      {
        id: "leave/my-requests",
        icon: "FileText",
        requiredFeatureKey: "leave_management",
        isPremium: true,
      },
      {
        id: "leave/my-balance",
        icon: "BarChart3",
        requiredFeatureKey: "leave_management",
        isPremium: true,
      },
      {
        id: "leave/team-requests",
        icon: "Users",
        requiredFeatureKey: "leave_management",
        isPremium: true,
      },
      {
        id: "leave/all-requests",
        icon: "CalendarCheck",
        requiredFeatureKey: "leave_management",
        isPremium: true,
      },
      {
        id: "leave/leave-types",
        icon: "List",
        requiredFeatureKey: "leave_management",
        isPremium: true,
      },
      {
        id: "leave/public-holidays",
        icon: "CalendarDays",
        requiredFeatureKey: "leave_management",
        isPremium: true,
      },
      {
        id: "leave/settings",
        icon: "Settings",
        requiredFeatureKey: "leave_management",
        isPremium: true,
      },
    ],
  },
  {
    id: "invoices",
    icon: "FileText",
    requiredFeatureKey: "invoice_management",
    isPremium: true,
    children: [
      {
        id: "invoices/invoices",
        icon: "FileText",
        requiredFeatureKey: "invoice_management",
        isPremium: true,
      },
      {
        id: "invoices/settings",
        icon: "Settings",
        requiredFeatureKey: "invoice_management",
        isPremium: true,
      },
    ],
  },
  {
    id: "messages",
    icon: "MessageSquare",
    requiredFeatureKey: "facebook_integration",
    isPremium: true,
  },
  {
    id: "users",
    icon: "Users",
    requiredFeatureKey: "user_management",
  },
  {
    id: "groups",
    icon: "UsersRound",
    requiredFeatureKey: "user_management",
  },
  {
    id: "social",
    icon: "Share2",
    requiredFeatureKey: "social_integrations",
    isPremium: true,
    children: [
      {
        id: "social/connections",
        icon: "Link",
        requiredFeatureKey: "social_integrations",
        isPremium: true,
      },
      {
        id: "social/messages",
        icon: "MessageSquare",
        requiredFeatureKey: "social_integrations",
        isPremium: true,
      },
      {
        id: "social/templates",
        icon: "FileText",
        requiredFeatureKey: "social_integrations",
        isPremium: true,
      },
      {
        id: "social/settings",
        icon: "Settings",
        requiredFeatureKey: "social_integrations",
        isPremium: true,
      },
    ],
  },
  {
    id: "settings",
    icon: "Settings",
    requiredFeatureKey: "settings",
  },
];

/**
 * Get required feature key for a navigation item
 */
export function getRequiredFeatureKey(itemId: string): string | undefined {
  const item = navigationConfig.find(i => i.id === itemId);
  return item?.requiredFeatureKey;
}

/**
 * Check if a navigation item is premium
 */
export function isNavigationItemPremium(itemId: string): boolean {
  const item = navigationConfig.find(i => i.id === itemId);
  return item?.isPremium || false;
}
