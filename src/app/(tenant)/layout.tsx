"use client";

import { useEffect, useState } from "react";
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
import { TicketCreateProvider } from "@/contexts/TicketCreateContext";
import { TicketCreateSheet } from "@/components/TicketCreateSheet";
import { BoardProvider, useBoard } from "@/contexts/BoardContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { TenantInfo } from "@/types/auth";
import { useTenant } from "@/contexts/TenantContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { BoardCollaborationIndicators } from "@/components/BoardCollaborationIndicators";
import { BoardCollaborationProvider } from "@/contexts/BoardCollaborationContext";
import { useTicketBoardWebSocket } from "@/hooks/useTicketBoardWebSocket";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";
import BoardStatusEditor from "@/components/BoardStatusEditor";
import BoardUserManager from "@/components/BoardUserManager";
import { BoardCreateSheet } from "@/components/BoardCreateSheet";
import {
  SubscriptionProvider,
  useSubscription,
} from "@/contexts/SubscriptionContext";
import { navigationConfig } from "@/config/navigationConfig";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionInactiveAdminScreen } from "@/components/subscription/SubscriptionInactiveAdminScreen";
import { SubscriptionInactiveUserScreen } from "@/components/subscription/SubscriptionInactiveUserScreen";
import { useReactivateSubscription } from "@/hooks/api/usePayments";

function TenantLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const t = useTranslations("nav");
  const { hasFeature, subscription, loading: subscriptionLoading } = useSubscription();
  const { user } = useAuth();

  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const { mutateAsync: reactivateSubscription } = useReactivateSubscription();
  const { data: boards } = useBoards();
  const { selectedBoardId, setSelectedBoardId } = useBoard();

  // Initialize WebSocket for board collaboration only on tickets page
  const isTicketsPage = pathname.includes('/tickets');
  const queryClient = useQueryClient();
  const [ticketsBeingMoved, setTicketsBeingMoved] = useState<Map<number, string>>(new Map());
  const [ticketsBeingEdited, setTicketsBeingEdited] = useState<Map<number, string>>(new Map());

  const {
    isConnected: boardIsConnected,
    activeUsers: boardActiveUsers,
  } = useTicketBoardWebSocket({
    boardId: isTicketsPage && selectedBoardId ? selectedBoardId : 'none',

    // Real-time updates: Refetch board data when tickets are moved or updated
    onTicketMoved: (event) => {
      console.log('[Layout] Ticket moved, refetching board:', event);
      queryClient.invalidateQueries({ queryKey: ['kanbanBoard', selectedBoardId] });
    },

    onTicketUpdated: (event) => {
      console.log('[Layout] Ticket updated, refetching board:', event);
      queryClient.invalidateQueries({ queryKey: ['kanbanBoard', selectedBoardId] });
    },

    // Visual feedback: Someone is dragging a ticket
    onTicketBeingMoved: (event) => {
      console.log('[Layout] Ticket being moved by:', event.user_name);
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
      console.log('[Layout] Ticket being edited by:', event.user_name);
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

  // Debug logging for WebSocket state
  console.log('[Layout] WebSocket state:', {
    isTicketsPage,
    selectedBoardId,
    boardIsConnected,
    boardActiveUsersCount: boardActiveUsers.length,
    boardActiveUsers,
  });

  const [facebookConnected, setFacebookConnected] = useState(false);
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
    domain: `${tenantConfig.schema_name}.echodesk.ge`,
    api_url: tenantConfig.api_url,
    theme: tenantConfig.theme,
  } : null;

  // Redirect if no tenant found
  useEffect(() => {
    if (!tenantLoading && !tenantConfig) {
      console.log("No tenant configured, redirecting to homepage");
      router.push("/");
    }
  }, [tenantLoading, tenantConfig, router]);

  // Check social connections with React Query
  const { data: facebookStatus } = useQuery({
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

  // Update state when query data changes
  useEffect(() => {
    if (facebookStatus) {
      setFacebookConnected(facebookStatus.connected || false);
    }
  }, [facebookStatus]);

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
    "ecommerce/orders": "ecommerceOrders",
    "ecommerce/clients": "clients",
    "ecommerce/products": "products",
    "ecommerce/product-attributes": "productAttributes",
    "ecommerce/languages": "languages",
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
    users: "users",
    groups: "groups",
    social: "social",
    "social/connections": "socialConnections",
    "social/messages": "socialMessages",
    "social/templates": "socialTemplates",
    "social/settings": "socialSettings",
    settings: "settings",
  };

  // Parse user's feature keys
  // Handle both string (JSON) and array formats from API
  const userFeatureKeys = userProfile?.feature_keys
    ? typeof userProfile.feature_keys === "string"
      ? JSON.parse(userProfile.feature_keys)
      : userProfile.feature_keys
    : [];

  // Debug: Log feature keys for troubleshooting
  useEffect(() => {
    if (userProfile) {
      console.log('[Feature Keys Debug]', {
        email: userProfile.email,
        featureKeys: userFeatureKeys,
        hasEcommerce: userFeatureKeys.includes('ecommerce_crm'),
      });
    }
  }, [userProfile, userFeatureKeys]);

  // Helper function to check if user has a feature key
  const hasFeatureKey = (featureKey: string): boolean => {
    return userFeatureKeys.includes(featureKey);
  };

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

      // Check if user has required feature key (applies to all users including staff)
      if (item.requiredFeatureKey) {
        return hasFeatureKey(item.requiredFeatureKey);
      }

      // Items without required features are always visible
      return true;
    });
  };

  const menuItems = buildMenuItems();

  const visibleMenuItems = getSidebarMenuItems(userProfile, menuItems);

  const handleMenuClick = (viewId: string) => {
    // Pure subdomain routing - just navigate to /viewId
    router.push(`/${viewId}`);
  };

  const handleLogout = async () => {
    try {
      // Clear local auth data using authService
      const { authService } = await import("@/services/auth");
      authService.clearLocalAuth();

      // Redirect to home page
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed:", err);
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
  // For nested routes like /ecommerce/orders, use the full path
  // For top-level routes like /tickets, use just the first segment
  const currentView = pathParts.length > 1 && pathParts[0] === "ecommerce"
    ? `${pathParts[0]}/${pathParts[1]}`  // ecommerce/orders
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

  if (profileLoading || tenantLoading || !tenantInfo) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
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
      <div className="flex h-screen w-full bg-white overflow-hidden">
        <AppSidebar
          tenant={tenantInfo as any}
          userProfile={userProfile || null}
          visibleMenuItems={visibleMenuItems}
          currentView={currentView}
          onMenuClick={handleMenuClick}
          onLogout={handleLogout}
        />

        <SidebarInset className="flex flex-col h-screen overflow-hidden">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 px-4 bg-white sticky top-0 z-10 left-0 right-0">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold">{pageTitle}</h1>
            {showBoardSwitcher && (
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
            )}
            <div className="ml-auto flex items-center gap-2">
              {/* Active Users Indicator - Only show on tickets page */}
              {isTicketsPage && (
                <BoardCollaborationIndicators
                  activeUsers={boardActiveUsers}
                />
              )}
              <NotificationBell
                onNotificationClick={(notification) => {
                  // Navigate to ticket if ticket_id exists
                  if (notification.ticket_id) {
                    router.push(`/tickets/${notification.ticket_id}`);
                  }
                }}
              />
              <LanguageSwitcher currentLocale={locale} />
            </div>
          </div>

          <div className="flex-1 bg-white overflow-auto">
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
      <TicketCreateProvider>
        <BoardProvider>
          <TenantLayoutContent>{children}</TenantLayoutContent>
        </BoardProvider>
      </TicketCreateProvider>
    </SubscriptionProvider>
  );
}
