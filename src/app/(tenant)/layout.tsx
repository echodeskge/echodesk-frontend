"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useBoards } from "@/hooks/useBoards";
import { getSidebarMenuItems, MenuItem } from "@/services/permissionService";
import { AppSidebar } from "@/components/AppSidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import BoardSwitcher from "@/components/BoardSwitcher";
import { TicketCreateProvider, useTicketCreate } from "@/contexts/TicketCreateContext";
import { BugReportProvider, useBugReport } from "@/contexts/BugReportContext";

const TicketCreateSheet = dynamic(() => import("@/components/TicketCreateSheet").then(m => ({ default: m.TicketCreateSheet })), { ssr: false });
const BugReportDialog = dynamic(() => import("@/components/BugReportDialog").then(m => ({ default: m.BugReportDialog })), { ssr: false });
import { BoardProvider, useBoard } from "@/contexts/BoardContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { LayoutSkeleton } from "@/components/LayoutSkeleton";
import { TenantInfo } from "@/types/auth";
import { useTenant } from "@/contexts/TenantContext";
import { NotificationBell } from "@/components/NotificationBell";
import { MessengerBell } from "@/components/MessengerBell";
import { BoardCollaborationIndicators } from "@/components/BoardCollaborationIndicators";
import { BoardCollaborationProvider } from "@/contexts/BoardCollaborationContext";
import { useTicketBoardWebSocket } from "@/hooks/useTicketBoardWebSocket";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";
import dynamic from "next/dynamic";

const BoardStatusEditor = dynamic(() => import("@/components/BoardStatusEditor"), { ssr: false });
const BoardUserManager = dynamic(() => import("@/components/BoardUserManager"), { ssr: false });
const BoardCreateSheet = dynamic(() => import("@/components/BoardCreateSheet").then(m => ({ default: m.BoardCreateSheet })), { ssr: false });
const TeamChatWidget = dynamic(() => import("@/components/TeamChat").then(m => ({ default: m.TeamChatWidget })), { ssr: false });
const DialpadWidget = dynamic(() => import("@/components/calls/DialpadWidget"), { ssr: false });
const IncomingCallSidebar = dynamic(() => import("@/components/calls/IncomingCallSidebar").then(m => ({ default: m.IncomingCallSidebar })), { ssr: false });
const PushNotificationPrompt = dynamic(() => import("@/components/PushNotificationPrompt").then(m => ({ default: m.PushNotificationPrompt })), { ssr: false });
import {
  SubscriptionProvider,
  useSubscription,
} from "@/contexts/SubscriptionContext";
import { CallProvider } from "@/contexts/CallContext";
import { IncomingCallSidebarProvider } from "@/contexts/IncomingCallSidebarContext";
import { useMessagesWebSocket } from "@/hooks/useMessagesWebSocket";
import { getNotificationSound } from "@/utils/notificationSound";
import { useSocialSettings } from "@/hooks/api/useSocial";
import { navigationConfig } from "@/config/navigationConfig";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionInactiveAdminScreen } from "@/components/subscription/SubscriptionInactiveAdminScreen";
import { SubscriptionInactiveUserScreen } from "@/components/subscription/SubscriptionInactiveUserScreen";
import { useReactivateSubscription, useDashboardAppearance } from "@/hooks/api";
import { Plus, Volume2, VolumeX, Sun, Moon, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

function TenantLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const t = useTranslations("nav");
  const { hasFeature, subscription, loading: subscriptionLoading } = useSubscription();
  const { user, logout } = useAuth();
  const { openTicketCreate } = useTicketCreate();
  const { openBugReport } = useBugReport();

  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const { mutateAsync: reactivateSubscription } = useReactivateSubscription();
  const { data: boards } = useBoards();
  const { data: appearance, isLoading: appearanceLoading } = useDashboardAppearance();
  const { setAppearance, resolvedMode, setMode } = useTheme();
  const { selectedBoardId, setSelectedBoardId, ticketSearchQuery, setTicketSearchQuery } = useBoard();
  const { data: socialSettings } = useSocialSettings();

  // Update notification sound manager with backend settings
  useEffect(() => {
    if (socialSettings) {
      getNotificationSound().updateSettings(socialSettings);
    }
  }, [socialSettings]);

  // Update theme context with appearance settings
  useEffect(() => {
    if (appearance) {
      setAppearance(appearance);
    }
  }, [appearance, setAppearance]);

  // Initialize WebSocket for board collaboration only on tickets page
  const isTicketsPage = pathname.includes('/tickets');
  const queryClient = useQueryClient();
  const [ticketsBeingMoved, setTicketsBeingMoved] = useState<Map<number, string>>(new Map());
  const [ticketsBeingEdited, setTicketsBeingEdited] = useState<Map<number, string>>(new Map());
  const [isSoundMuted, setIsSoundMuted] = useState(() => {
    // Initialize from sound manager (which reads from localStorage)
    if (typeof window !== 'undefined') {
      return !getNotificationSound().isEnabled();
    }
    return false;
  });

  const {
    isConnected: boardIsConnected,
    activeUsers: boardActiveUsers,
  } = useTicketBoardWebSocket({
    boardId: isTicketsPage && selectedBoardId ? selectedBoardId : 'none',

    // Real-time updates: Refetch board data when tickets are moved or updated
    onTicketMoved: (event) => {
      queryClient.invalidateQueries({ queryKey: ['kanbanBoard', selectedBoardId] });
    },

    onTicketUpdated: (event) => {
      queryClient.invalidateQueries({ queryKey: ['kanbanBoard', selectedBoardId] });
    },

    // Visual feedback: Someone is dragging a ticket
    onTicketBeingMoved: (event) => {
      setTicketsBeingMoved(prev => new Map(prev).set(event.ticket_id, event.user_name));

      // Remove after 3 seconds (in case drag is abandoned)
      setTimeout(() => {
        setTicketsBeingMoved(prev => {
          const next = new Map(prev);
          next.delete(event.ticket_id);
          return next;
        });
      }, 3000);
    },

    // Conflict prevention: Someone is editing a ticket
    onTicketBeingEdited: (event) => {
      setTicketsBeingEdited(prev => new Map(prev).set(event.ticket_id, event.user_name));
    },

    // Conflict prevention: Someone stopped editing
    onTicketEditingStopped: (ticketId) => {
      setTicketsBeingEdited(prev => {
        const next = new Map(prev);
        next.delete(ticketId);
        return next;
      });
    },
  });

  // Global WebSocket for message notifications (plays sound and updates sidebar)
  useMessagesWebSocket({
    onNewMessage: (data) => {
      // Instantly invalidate unread messages count so MessengerBell updates without waiting for poll
      queryClient.invalidateQueries({ queryKey: ['social', 'unreadCount'] });

      const messageData = data?.message;

      // Don't play sound for messages we sent (from page/business)
      if (messageData?.is_from_page || messageData?.is_from_business) {
        return;
      }

      // Check assignment - only play sound if:
      // 1. Chat is not assigned to anyone (assigned_user_id is null/undefined)
      // 2. Chat is assigned to the current user
      const assignedUserId = data?.assigned_user_id;
      const currentUserId = user?.id;

      // If chat is assigned to someone else, don't play sound
      if (assignedUserId !== null && assignedUserId !== undefined && assignedUserId !== currentUserId) {
        return;
      }

      // Play platform-specific notification sound
      const platform = data?.platform || messageData?.platform;
      if (platform && ['facebook', 'instagram', 'whatsapp', 'email', 'widget'].includes(platform)) {
        getNotificationSound().playForPlatform(platform);
      } else {
        // Fallback to system sound
        getNotificationSound().playForPlatform('system');
      }
    },
    autoReconnect: true,
  });

  const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
  const [managingBoardUsersId, setManagingBoardUsersId] = useState<
    number | null
  >(null);
  const [isBoardCreateOpen, setIsBoardCreateOpen] = useState(false);

  // Get tenant from context (using React Query under the hood)
  const { tenant: tenantConfig, loading: tenantLoading } = useTenant();

  // Convert tenant config to TenantInfo format
  const tenantInfo: TenantInfo | null = tenantConfig ? {
    id: tenantConfig.schema_name,
    name: tenantConfig.tenant_name,
    schema_name: tenantConfig.schema_name,
    domain: `${tenantConfig.schema_name}.${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'echodesk.ge'}`,
    api_url: tenantConfig.api_url,
    theme: tenantConfig.theme,
  } : null;

  // Redirect if no tenant found
  // Only redirect if tenant loading has completed AND tenant is null
  // Don't redirect if tenant is undefined (still initializing)
  useEffect(() => {
    if (!tenantLoading && tenantConfig === null) {
      router.push("/");
    }
  }, [tenantLoading, tenantConfig, router]);

  // Check social connections with React Query
  const { data: facebookStatus, isLoading: facebookStatusLoading } = useQuery({
    queryKey: ['social', 'facebook', 'status'],
    queryFn: async () => {
      const axiosInstance = (await import("@/api/axios")).default;
      const response = await axiosInstance.get("/api/social/facebook/status/");
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    enabled: !!tenantInfo, // Only check when tenant is loaded
  });

  const facebookConnected = facebookStatus?.connected || false;

  // Translation key mapping for navigation items
  const translationKeyMap: Record<string, string> = {
    tickets: "tickets",
    "time-tracking": "timeTracking",
    "user-statistics": "userStatistics",
    calls: "calls",
    "calls/dashboard": "callsDashboard",
    "calls/logs": "callsLogs",
    "calls/settings": "callsSettings",
    orders: "orders",
    ecommerce: "ecommerce",
    "ecommerce/dashboard": "ecommerceDashboard",
    "ecommerce/orders": "ecommerceOrders",
    "ecommerce/clients": "clients",
    "ecommerce/products": "products",
    "ecommerce/product-attributes": "productAttributes",
    "ecommerce/languages": "languages",
    "ecommerce/homepage-builder": "homepageBuilder",
    "ecommerce/shipping-methods": "shippingMethods",
    "ecommerce/promo-codes": "promoCodes",
    "ecommerce/reviews": "ecommerceReviews",
    "ecommerce/settings": "ecommerceSettings",
    bookings: "bookings",
    "bookings/bookings": "bookingsManagement",
    "bookings/calendar": "bookingsCalendar",
    "bookings/services": "bookingsServices",
    "bookings/categories": "bookingsCategories",
    "bookings/staff": "bookingsStaff",
    "bookings/clients": "bookingsClients",
    "bookings/settings": "bookingsSettings",
    leave: "leave",
    "leave/my-requests": "myRequests",
    "leave/my-balance": "myBalance",
    "leave/team-requests": "teamRequests",
    "leave/all-requests": "allRequests",
    "leave/leave-types": "leaveTypes",
    "leave/public-holidays": "publicHolidays",
    "leave/settings": "settings",
    invoices: "invoices",
    "invoices/invoices": "invoicesManagement",
    "invoices/settings": "invoiceSettings",
    clients: "clients",
    products: "products",
    "product-attributes": "productAttributes",
    languages: "languages",
    messages: "messages",
    "social/messages": "messages",
    email: "email",
    users: "users",
    groups: "groups",
    social: "social",
    "social/clients": "socialClients",
    "social/connections": "socialConnections",
    "social/templates": "socialTemplates",
    "social/settings": "socialSettings",
    "social/auto-posting": "socialAutoPosting",
    "social/rating-statistics": "socialRatingStatistics",
    settings: "settings",
    "settings/general": "settingsGeneral",
    "settings/appearance": "settingsAppearance",
    "settings/item-lists": "settingsItemLists",
    "settings/ticket-forms": "settingsTicketForms",
    "settings/subscription": "settingsSubscription",
    "settings/security": "settingsSecurity",
    "settings/social": "settingsSocial",
    "settings/social/connections": "settingsSocialConnections",
    "settings/social/auto-posting": "settingsSocialAutoPosting",
    "settings/social/rating-statistics": "settingsSocialRatingStatistics",
    "settings/calls": "settingsCalls",
    "settings/ecommerce": "settingsEcommerce",
    "settings/invoices": "settingsInvoices",
    "settings/bookings": "settingsBookings",
    "settings/leave": "settingsLeave",
    "settings/users": "settingsUsers",
    "settings/groups": "settingsGroups",
    preferences: "preferences",
    "preferences/notifications": "settingsNotifications",
    "preferences/social": "settingsSocial",
    "report-bug": "reportBug",
    help: "help",
  };

  // Parse user's feature keys
  // Handle both string (JSON) and array formats from API
  const userFeatureKeys = userProfile?.feature_keys
    ? typeof userProfile.feature_keys === "string"
      ? JSON.parse(userProfile.feature_keys)
      : userProfile.feature_keys
    : [];


  // Helper function to check if user has a feature key
  const hasFeatureKey = (featureKey: string): boolean => {
    return userFeatureKeys.includes(featureKey);
  };

  // Check if user is staff/admin
  const isStaffOrAdmin = Boolean(user?.is_staff || user?.is_superuser);

  // Build menu items with feature-based requirements
  const buildMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = navigationConfig.map((config) => ({
      ...config,
      label: t(translationKeyMap[config.id] || config.id),
      description: t(
        `description.${translationKeyMap[config.id] || config.id}`
      ),
      requiredFeatureKey: config.requiredFeatureKey,
      isPremium: config.isPremium,
      isLocked: false, // We'll filter locked items instead of showing them
      // Process children if they exist
      children: config.children?.map((child) => ({
        ...child,
        label: t(translationKeyMap[child.id] || child.id),
        description: t(
          `description.${translationKeyMap[child.id] || child.id}`
        ),
        requiredFeatureKey: child.requiredFeatureKey,
        isPremium: child.isPremium,
        isLocked: false,
      })),
    }));

    // Filter items based on feature keys and other conditions
    return items.filter((item) => {
      // Special handling for messages - only show if Facebook is connected
      if (item.id === "messages" && !facebookConnected) {
        return false;
      }

      // Filter out staffOnly items for non-staff users
      const configItem = navigationConfig.find(c => c.id === item.id);
      if (configItem?.staffOnly && !isStaffOrAdmin) {
        return false;
      }

      // Check if user has required feature key (applies to all users including staff)
      if (item.requiredFeatureKey) {
        return hasFeatureKey(item.requiredFeatureKey);
      }

      // Hide items when user HAS the excluded feature key (inverse visibility)
      const configForExclude = navigationConfig.find(c => c.id === item.id);
      if (configForExclude?.excludeFeatureKey) {
        return !hasFeatureKey(configForExclude.excludeFeatureKey);
      }

      // Items without required features are always visible
      return true;
    });
  };

  const menuItems = buildMenuItems();

  const filteredMenuItems = getSidebarMenuItems(userProfile, menuItems);

  // Reorder menu items based on sidebar_order from appearance settings
  const visibleMenuItems = useMemo(() => {
    if (!appearance?.sidebar_order?.length) return filteredMenuItems;

    const sidebarOrder = appearance.sidebar_order as string[];
    const orderMap = new Map<string, number>(sidebarOrder.map((id, idx) => [id, idx]));
    return [...filteredMenuItems].sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? 999;
      const orderB = orderMap.get(b.id) ?? 999;
      return orderA - orderB;
    });
  }, [filteredMenuItems, appearance?.sidebar_order]);

  // IDs that are sidebar actions (open dialogs), not navigable pages
  const actionOnlyItems = new Set(["report-bug"]);

  // Get the first available route from visible menu items
  const getFirstAvailableRoute = (): string | null => {
    if (visibleMenuItems.length === 0) return null;

    const firstItem = visibleMenuItems.find(item => !actionOnlyItems.has(item.id));
    if (!firstItem) return null;
    // If first item has children, use the first child's route
    if (firstItem.children && firstItem.children.length > 0) {
      return `/${firstItem.children[0].id}`;
    }
    return `/${firstItem.id}`;
  };

  // Check if the current route is accessible by the user
  const isRouteAccessible = (currentPath: string): boolean => {
    const pathParts = currentPath.split("/").filter(Boolean);

    if (pathParts.length === 0) {
      return true;
    }

    // /help and action-only routes are always accessible
    if (pathParts[0] === 'help' || actionOnlyItems.has(pathParts[0])) {
      return true;
    }

    // Build the base route ID to check (e.g., "ecommerce/orders" or "tickets")
    // For nested parents, use first two segments; for others, use first segment
    const nestedParents = ["ecommerce", "bookings", "leave", "invoices", "social"];
    const baseRouteId = pathParts.length > 1 && nestedParents.includes(pathParts[0])
      ? `${pathParts[0]}/${pathParts[1]}`
      : pathParts[0];

    // Special case: /messages route should be accessible if user has social_integrations
    // This allows WhatsApp/Instagram message detail pages to work
    if (baseRouteId === 'messages' || currentPath.startsWith('/messages')) {
      const hasSocialAccess = visibleMenuItems.some(item =>
        item.id === 'social' || item.id === 'messages' || item.id === 'social/messages' ||
        item.children?.some(child => child.id === 'social/messages')
      );
      if (hasSocialAccess) {
        return true;
      }
    }

    // Check if base route is in visible menu items (including children)
    // This allows detail pages like /social/messages/123 to be accessible if /social/messages is accessible
    for (const item of visibleMenuItems) {
      // Check top-level match
      if (item.id === baseRouteId) {
        return true;
      }
      // Check if current path starts with a valid menu item (for detail pages)
      if (currentPath.startsWith(`/${item.id}`)) {
        return true;
      }

      if (item.children) {
        for (const child of item.children) {
          if (child.id === baseRouteId) {
            return true;
          }
          // Check if current path starts with a valid child route (for detail pages like /social/messages/123)
          if (currentPath.startsWith(`/${child.id}`)) {
            return true;
          }
        }
      }
    }

    return false;
  };

  // Track redirects using a ref to prevent loops (persists across renders)
  const redirectedToRef = useRef<string | null>(null);
  const lastPathnameRef = useRef<string>(pathname);

  // Route protection: redirect to first available route if current route is not accessible
  useEffect(() => {
    // /help is ALWAYS accessible - never redirect away from or to /help based on permissions
    if (pathname.startsWith('/help')) {
      return;
    }

    // Reset redirect tracking if user manually navigated to a new path
    if (lastPathnameRef.current !== pathname) {
      lastPathnameRef.current = pathname;
      // Only reset if this isn't the path we redirected to
      if (redirectedToRef.current !== pathname) {
        redirectedToRef.current = null;
      }
    }

    // Skip if we already redirected to this path (prevents loops)
    if (redirectedToRef.current === pathname) {
      return;
    }

    // Skip if still loading
    if (profileLoading || tenantLoading || appearanceLoading || facebookStatusLoading) {
      return;
    }

    // Skip if no user profile yet
    if (!userProfile) {
      return;
    }

    // Wait until we have menu items
    if (visibleMenuItems.length === 0) {
      return;
    }

    const firstAvailableRoute = getFirstAvailableRoute();

    if (!firstAvailableRoute) {
      return;
    }

    // Check if current path is accessible
    const accessible = isRouteAccessible(pathname);

    // Only redirect if not accessible AND not already on first available route
    if (!accessible) {
      // Prevent redirecting to the same path we're on
      if (pathname === firstAvailableRoute) {
        return;
      }

      redirectedToRef.current = firstAvailableRoute;
      router.replace(firstAvailableRoute);
    }
  }, [pathname, visibleMenuItems, profileLoading, tenantLoading, appearanceLoading, facebookStatusLoading, userProfile]);

  const handleMenuClick = (viewId: string) => {
    if (viewId === "report-bug") {
      openBugReport();
      return;
    }
    // Pure subdomain routing - just navigate to /viewId
    router.push(`/${viewId}`);
  };

  const handleLogout = async () => {
    try {
      // Use auth context logout to clear both local and NextAuth session
      await logout();

      // Force redirect to login page with a full page reload to clear all state
      window.location.replace("/");
    } catch (err) {
      console.error("Logout failed:", err);
      // Even if logout fails, redirect to login page
      window.location.replace("/");
    }
  };

  const handleEditBoardStatuses = (boardId: number) => {
    setEditingBoardId(boardId);
  };

  const handleManageBoardUsers = (boardId: number) => {
    setManagingBoardUsersId(boardId);
  };

  const handleCloseEditor = () => {
    setEditingBoardId(null);
  };

  const handleCloseUserManager = () => {
    setManagingBoardUsersId(null);
  };

  // Get current view from pathname
  const pathParts = pathname.split("/").filter(Boolean);
  // For nested routes like /ecommerce/orders or /calls/logs, use the full path
  // For top-level routes like /tickets, use just the first segment
  const nestedRouteParents = ["ecommerce", "bookings", "leave", "invoices", "social", "email"];
  const currentView = pathParts.length > 1 && nestedRouteParents.includes(pathParts[0])
    ? `${pathParts[0]}/${pathParts[1]}`  // ecommerce/orders, calls/logs, etc.
    : pathParts[0] || "tickets";         // tickets

  // Get page title (check both parent and children)
  let currentMenuItem = visibleMenuItems.find(
    (item) => item.id === currentView
  );

  // If not found in top-level, search in children
  if (!currentMenuItem) {
    for (const item of visibleMenuItems) {
      if (item.children) {
        const childItem = item.children.find(child => child.id === currentView);
        if (childItem) {
          currentMenuItem = childItem;
          break;
        }
      }
    }
  }

  const pageTitle = currentMenuItem?.label || t("dashboard");

  // Check if we should show board switcher (always show on tickets page, even with no boards)
  const showBoardSwitcher = currentView === "tickets";

  if (profileLoading || tenantLoading || !tenantInfo || appearanceLoading || facebookStatusLoading) {
    return <LayoutSkeleton />;
  }

  // Check if subscription is inactive (after loading completes)
  if (!subscriptionLoading && subscription?.subscription) {
    const isActive = subscription.subscription.is_active;
    const isAdmin = user?.is_staff || user?.is_superuser;

    // If subscription is inactive, show appropriate screen
    if (!isActive) {
      // Handle make payment action - reactivates subscription with full payment + saves card
      const handleMakePayment = async () => {
        try {
          const result = await reactivateSubscription();
          if (result?.payment_url) {
            window.location.href = result.payment_url;
          }
        } catch (error) {
          console.error('Failed to create reactivation payment:', error);
        }
      };

      if (isAdmin) {
        // Show admin screen with payment options
        return (
          <SubscriptionInactiveAdminScreen
            subscription={subscription}
            onMakePayment={handleMakePayment}
            isLoading={subscriptionLoading}
          />
        );
      } else {
        // Show user screen (contact admin message)
        return (
          <SubscriptionInactiveUserScreen
            subscription={subscription}
            tenantInfo={{
              name: tenantConfig?.tenant_name,
              admin_email: tenantConfig?.admin_email,
            }}
            isLoading={subscriptionLoading}
          />
        );
      }
    }
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar
          tenant={tenantInfo as any}
          userProfile={userProfile || null}
          visibleMenuItems={visibleMenuItems}
          currentView={currentView}
          onMenuClick={handleMenuClick}
          onPrefetch={(viewId) => router.prefetch(`/${viewId}`)}
          onLogout={handleLogout}
        />

        <SidebarInset className="flex flex-col h-screen overflow-hidden">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 bg-background sticky top-0 z-10 left-0 right-0">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold">{pageTitle}</h1>
            {showBoardSwitcher && (
              <>
                <div className="ml-4">
                  <BoardSwitcher
                    selectedBoardId={selectedBoardId}
                    boards={boards}
                    userProfile={userProfile}
                    onBoardChange={setSelectedBoardId}
                    onCreateBoard={() => setIsBoardCreateOpen(true)}
                    onEditBoardStatuses={handleEditBoardStatuses}
                    onManageBoardUsers={handleManageBoardUsers}
                  />
                </div>
                <div className="relative ml-2 hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t("searchTickets")}
                    value={ticketSearchQuery}
                    onChange={(e) => setTicketSearchQuery(e.target.value)}
                    className="h-8 w-48 rounded-md border border-input bg-background pl-8 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  {ticketSearchQuery && (
                    <button
                      onClick={() => setTicketSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
              </>
            )}
            <div className="ml-auto flex items-center gap-2">
              {/* Active Users Indicator - Only show on tickets page */}
              {isTicketsPage && (
                <BoardCollaborationIndicators
                  activeUsers={boardActiveUsers}
                />
              )}
              {/* Quick Create Task Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openTicketCreate()}
                title={t("createTask")}
              >
                <Plus className="h-5 w-5" />
              </Button>
              {/* Sound Mute Toggle Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const newEnabled = getNotificationSound().toggle();
                  setIsSoundMuted(!newEnabled);
                }}
                title={isSoundMuted ? t("unmute") : t("mute")}
              >
                {isSoundMuted ? (
                  <VolumeX className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              {/* Dark/Light Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMode(resolvedMode === 'dark' ? 'light' : 'dark')}
                title={resolvedMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {resolvedMode === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              <MessengerBell />
              <NotificationBell
                onNotificationClick={(notification) => {
                  // Navigate to ticket if ticket_id exists
                  if (notification.ticket_id) {
                    router.push(`/tickets/${notification.ticket_id}`);
                  }
                }}
              />
            </div>
          </div>

          <div className="flex-1 bg-background overflow-auto">
            <BoardCollaborationProvider
              isConnected={boardIsConnected}
              activeUsers={boardActiveUsers}
              boardId={selectedBoardId}
              ticketsBeingMoved={ticketsBeingMoved}
              ticketsBeingEdited={ticketsBeingEdited}
            >
              {children}
            </BoardCollaborationProvider>
          </div>
        </SidebarInset>
      </div>

      <TicketCreateSheet />
      <BugReportDialog />

      {/* Board Create Sheet */}
      <BoardCreateSheet
        isOpen={isBoardCreateOpen}
        onClose={() => setIsBoardCreateOpen(false)}
        onBoardCreated={(board) => {
          // Switch to the newly created board
          setSelectedBoardId(board.id);
        }}
      />

      {/* Board Status Editor Modal */}
      <BoardStatusEditor
        boardId={editingBoardId}
        open={editingBoardId !== null}
        onClose={handleCloseEditor}
      />

      {/* Board User Manager Modal */}
      <BoardUserManager
        boardId={managingBoardUsersId}
        open={managingBoardUsersId !== null}
        onClose={handleCloseUserManager}
      />

      {/* Floating Dialpad Widget (above Team Chat) */}
      {userProfile?.id && <DialpadWidget />}

      {/* Global Incoming Call Sidebar */}
      <IncomingCallSidebar />

      {/* Push notification permission prompt */}
      <PushNotificationPrompt />

      {/* Team Chat Widget */}
      {userProfile?.id && (
        <TeamChatWidget currentUserId={userProfile.id} />
      )}
    </SidebarProvider>
  );
}

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubscriptionProvider>
      <CallProvider>
        <IncomingCallSidebarProvider>
          <TicketCreateProvider>
            <BugReportProvider>
              <BoardProvider>
                <TenantLayoutContent>{children}</TenantLayoutContent>
              </BoardProvider>
            </BugReportProvider>
          </TicketCreateProvider>
        </IncomingCallSidebarProvider>
      </CallProvider>
    </SubscriptionProvider>
  );
}
