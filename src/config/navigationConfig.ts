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
    requiredFeatureKey: "sip_calling",
    isPremium: true,
  },
  {
    id: "orders",
    icon: "FileText",
    requiredFeatureKey: "order_management",
  },
  {
    id: "ecommerce",
    icon: "ShoppingBag",
    requiredFeatureKey: "ecommerce_crm",
    isPremium: true,
    children: [
      {
        id: "products",
        icon: "Package",
        requiredFeatureKey: "ecommerce_crm",
        isPremium: true,
      },
      {
        id: "product-attributes",
        icon: "ListTree",
        requiredFeatureKey: "ecommerce_crm",
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
