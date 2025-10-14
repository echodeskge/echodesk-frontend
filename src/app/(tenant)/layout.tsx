"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useBoards } from "@/hooks/useBoards";
import { getSidebarMenuItems, MenuItem } from "@/services/permissionService";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import BoardSwitcher from "@/components/BoardSwitcher";
import { TicketCreateProvider } from "@/contexts/TicketCreateContext";
import { TicketCreateSheet } from "@/components/TicketCreateSheet";
import { BoardProvider, useBoard } from "@/contexts/BoardContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { TenantInfo } from "@/types/auth";
import { tenantService } from "@/services/tenantService";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";

function TenantLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const t = useTranslations('nav');

  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const { data: boards } = useBoards();
  const { selectedBoardId, setSelectedBoardId } = useBoard();
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);

  // Load tenant data from subdomain
  useEffect(() => {
    const loadTenant = async () => {
      try {
        if (typeof window === 'undefined') return;

        const hostname = window.location.hostname;

        // On localhost, always use "groot" tenant
        let subdomain: string | null;
        if (hostname.includes('localhost')) {
          subdomain = 'groot';
        } else {
          subdomain = tenantService.getSubdomainFromHostname(hostname);
        }

        if (!subdomain) {
          console.error("No tenant subdomain found");
          router.push('/');
          return;
        }

        const tenantConfig = await tenantService.getTenantBySubdomain(subdomain);

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
          router.push('/');
        }
      } catch (err) {
        console.error("Failed to load tenant:", err);
        router.push('/');
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
        const response = await axiosInstance.get("/api/social/facebook/status/");
        setFacebookConnected(response.data.connected || false);
      } catch (err) {
        console.error("Failed to check social connections:", err);
        setFacebookConnected(false);
      }
    };

    checkSocialConnections();
  }, []);

  const menuItems: MenuItem[] = [
    {
      id: "tickets",
      label: t('tickets'),
      icon: "🎫",
      permission: "can_access_tickets",
      description: t('description.tickets'),
    },
    {
      id: "time-tracking",
      label: t('timeTracking'),
      icon: "⏱️",
      permission: "can_access_tickets",
      description: t('description.timeTracking'),
    },
    {
      id: "user-statistics",
      label: t('userStatistics'),
      icon: "📊",
      permission: "can_access_user_management",
      description: t('description.userStatistics'),
    },
    {
      id: "calls",
      label: t('calls'),
      icon: "📞",
      permission: "can_access_calls",
      description: t('description.calls'),
    },
    {
      id: "orders",
      label: t('orders'),
      icon: "📝",
      permission: "can_access_orders",
      description: t('description.orders'),
    },
    ...(facebookConnected
      ? [
          {
            id: "messages",
            label: t('messages'),
            icon: "💬",
            permission: "can_manage_settings",
            description: t('description.messages'),
          },
        ]
      : []),
    {
      id: "users",
      label: t('users'),
      icon: "👥",
      permission: "can_access_user_management",
      description: t('description.users'),
    },
    {
      id: "groups",
      label: t('groups'),
      icon: "👨‍👩‍👧‍👦",
      permission: "can_access_user_management",
      description: t('description.groups'),
    },
    {
      id: "social",
      label: t('social'),
      icon: "📱",
      permission: "can_manage_settings",
      description: t('description.social'),
    },
    {
      id: "settings",
      label: t('settings'),
      icon: "⚙️",
      permission: "can_manage_settings",
      description: t('description.settings'),
    },
  ];

  const visibleMenuItems = getSidebarMenuItems(userProfile, menuItems);

  const handleMenuClick = (viewId: string) => {
    // Pure subdomain routing - just navigate to /viewId
    router.push(`/${viewId}`);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout/", { method: "POST" });
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Get current view from pathname (first segment)
  const pathParts = pathname.split("/").filter(Boolean);
  const currentView = pathParts[0] || "tickets"; // /tickets -> tickets

  // Get page title
  const currentMenuItem = visibleMenuItems.find((item) => item.id === currentView);
  const pageTitle = currentMenuItem?.label || t('dashboard');

  // Check if we should show board switcher
  const showBoardSwitcher = currentView === "tickets" && boards && boards.length > 0;

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

        <SidebarInset className="flex flex-col h-screen">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 px-4 bg-white w-full">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold">{pageTitle}</h1>
            {showBoardSwitcher && (
              <div className="ml-4">
                <BoardSwitcher
                  selectedBoardId={selectedBoardId}
                  boards={boards}
                  onBoardChange={setSelectedBoardId}
                />
              </div>
            )}
            <div className="ml-auto">
              <LanguageSwitcher currentLocale={locale} />
            </div>
          </div>

          <div className="flex-1 bg-white w-full overflow-auto">
            {children}
          </div>
        </SidebarInset>
      </div>

      <TicketCreateSheet />
    </SidebarProvider>
  );
}

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <TicketCreateProvider>
      <BoardProvider>
        <TenantLayoutContent>{children}</TenantLayoutContent>
      </BoardProvider>
    </TicketCreateProvider>
  );
}
