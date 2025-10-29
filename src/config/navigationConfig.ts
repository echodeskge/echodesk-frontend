/**
 * Navigation configuration with feature-based access control
 */

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  permission: string; // User permission (role-based)
  requiredFeatureKey?: string; // Feature key from tenant group features
  description: string;
  isPremium?: boolean; // Visual indicator for premium features
}

export const navigationConfig: Omit<NavigationItem, 'label' | 'description'>[] = [
  {
    id: "tickets",
    icon: "🎫",
    permission: "can_access_tickets",
    requiredFeatureKey: "ticket_management",
  },
  {
    id: "time-tracking",
    icon: "⏱️",
    permission: "can_access_tickets",
    requiredFeatureKey: "ticket_management",
  },
  {
    id: "user-statistics",
    icon: "📊",
    permission: "can_access_user_management",
    requiredFeatureKey: "advanced_analytics",
    isPremium: true,
  },
  {
    id: "calls",
    icon: "📞",
    permission: "can_access_calls",
    requiredFeatureKey: "sip_calling",
    isPremium: true,
  },
  {
    id: "orders",
    icon: "📝",
    permission: "can_access_orders",
    requiredFeatureKey: "ticket_management",
  },
  {
    id: "messages",
    icon: "💬",
    permission: "can_manage_settings",
    requiredFeatureKey: "facebook_integration",
    isPremium: true,
  },
  {
    id: "users",
    icon: "👥",
    permission: "can_access_user_management",
    requiredFeatureKey: "ticket_management",
  },
  {
    id: "groups",
    icon: "👨‍👩‍👧‍👦",
    permission: "can_access_user_management",
    requiredFeatureKey: "ticket_management",
  },
  {
    id: "social",
    icon: "📱",
    permission: "can_manage_settings",
    // No specific feature - basic access for integrations
    isPremium: true,
  },
  {
    id: "settings",
    icon: "⚙️",
    permission: "can_manage_settings",
    // Basic feature - everyone can access settings
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
