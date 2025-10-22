/**
 * Navigation configuration with subscription feature requirements
 */

import { SubscriptionFeature } from '@/contexts/SubscriptionContext';

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  permission: string; // User permission (role-based)
  subscriptionFeature?: SubscriptionFeature; // Subscription feature (package-based)
  description: string;
  isPremium?: boolean; // Visual indicator for premium features
}

export const navigationConfig: Omit<NavigationItem, 'label' | 'description'>[] = [
  {
    id: "tickets",
    icon: "🎫",
    permission: "can_access_tickets",
    subscriptionFeature: "ticket_management",
  },
  {
    id: "time-tracking",
    icon: "⏱️",
    permission: "can_access_tickets",
    subscriptionFeature: "ticket_management",
  },
  {
    id: "user-statistics",
    icon: "📊",
    permission: "can_access_user_management",
    subscriptionFeature: "advanced_analytics",
    isPremium: true,
  },
  {
    id: "calls",
    icon: "📞",
    permission: "can_access_calls",
    subscriptionFeature: "sip_calling",
    isPremium: true,
  },
  {
    id: "orders",
    icon: "📝",
    permission: "can_access_orders",
    subscriptionFeature: "ticket_management",
  },
  {
    id: "messages",
    icon: "💬",
    permission: "can_manage_settings",
    subscriptionFeature: "facebook_integration", // Requires Facebook integration
    isPremium: true,
  },
  {
    id: "users",
    icon: "👥",
    permission: "can_access_user_management",
    subscriptionFeature: "ticket_management", // Basic feature
  },
  {
    id: "groups",
    icon: "👨‍👩‍👧‍👦",
    permission: "can_access_user_management",
    subscriptionFeature: "ticket_management", // Basic feature
  },
  {
    id: "social",
    icon: "📱",
    permission: "can_manage_settings",
    // No specific feature - will check individual integrations
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
 * Get subscription feature for a navigation item
 */
export function getNavigationFeature(itemId: string): SubscriptionFeature | undefined {
  const item = navigationConfig.find(i => i.id === itemId);
  return item?.subscriptionFeature;
}

/**
 * Check if a navigation item is premium
 */
export function isNavigationItemPremium(itemId: string): boolean {
  const item = navigationConfig.find(i => i.id === itemId);
  return item?.isPremium || false;
}
