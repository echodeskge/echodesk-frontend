"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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
import { tenantService } from "@/services/tenantService";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
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

function TenantLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const t = useTranslations("nav");
  const { hasFeature, subscription } = useSubscription();

  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const { data: boards } = useBoards();
  const { selectedBoardId, setSelectedBoardId } = useBoard();
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
  const [managingBoardUsersId, setManagingBoardUsersId] = useState<
    number | null
  >(null);
  const [isBoardCreateOpen, setIsBoardCreateOpen] = useState(false);

  // Load tenant data from subdomain
  useEffect(() => {
    const loadTenant = async () => {
      try {
        if (typeof window === "undefined") return;

        const hostname = window.location.hostname;

        // On localhost, check localStorage for development tenant
        let subdomain: string | null;
        if (hostname.includes("localhost")) {
          const storedTenant = localStorage.getItem("dev_tenant");
          if (storedTenant) {
            subdomain = storedTenant;
          } else {
            // No tenant set, redirect to homepage
            console.log(
              "No development tenant set. Set one using: localStorage.setItem('dev_tenant', 'groot')"
            );
            router.push("/");
            return;
          }
        } else {
          subdomain = tenantService.getSubdomainFromHostname(hostname);
        }

        if (!subdomain) {
          console.error("No tenant subdomain found");
          router.push("/");
          return;
        }

        const tenantConfig =
          await tenantService.getTenantBySubdomain(subdomain);

        if (tenantConfig) {
          const info: TenantInfo = {
            id: tenantConfig.schema_name,
            name: tenantConfig.tenant_name,
            schema_name: tenantConfig.schema_name,
            domain: `${tenantConfig.schema_name}.echodesk.ge`,
            api_url: tenantConfig.api_url,
            theme: tenantConfig.theme,
          };
          setTenantInfo(info);
        } else {
          console.error("Tenant not found");
          router.push("/");
        }
      } catch (err) {
        console.error("Failed to load tenant:", err);
        router.push("/");
      }
    };

    loadTenant();
  }, [router]);

  // Check social connections
  useEffect(() => {
    const checkSocialConnections = async () => {
      try {
        // Check Facebook connection
        const axiosInstance = (await import("@/api/axios")).default;
        const response = await axiosInstance.get(
          "/api/social/facebook/status/"
        );
        setFacebookConnected(response.data.connected || false);
      } catch (err) {
        console.error("Failed to check social connections:", err);
        setFacebookConnected(false);
      }
    };

    checkSocialConnections();
  }, []);

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

  if (profileLoading || !tenantInfo) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
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

          <div className="flex-1 bg-white overflow-auto">{children}</div>
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
