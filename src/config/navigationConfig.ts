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
}

export const navigationConfig: Omit<NavigationItem, 'label' | 'description'>[] = [
  {
    id: "tickets",
    icon: "🎫",
    requiredFeatureKey: "ticket_management",
  },
  {
    id: "time-tracking",
    icon: "⏱️",
    requiredFeatureKey: "ticket_management",
  },
  {
    id: "user-statistics",
    icon: "📊",
    requiredFeatureKey: "advanced_analytics",
    isPremium: true,
  },
  {
    id: "calls",
    icon: "📞",
    requiredFeatureKey: "sip_calling",
    isPremium: true,
  },
  {
    id: "orders",
    icon: "📝",
    requiredFeatureKey: "order_management",
  },
  {
    id: "messages",
    icon: "💬",
    requiredFeatureKey: "facebook_integration",
    isPremium: true,
  },
  {
    id: "users",
    icon: "👥",
    requiredFeatureKey: "user_management",
  },
  {
    id: "groups",
    icon: "👨‍👩‍👧‍👦",
    requiredFeatureKey: "user_management",
  },
  {
    id: "social",
    icon: "📱",
    requiredFeatureKey: "social_integrations",
    isPremium: true,
  },
  {
    id: "settings",
    icon: "⚙️",
    // No requiredFeatureKey - visible to all users
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
