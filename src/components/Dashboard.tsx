"use client";

import { useState, useEffect } from "react";
import { AuthUser, TenantInfo } from "@/types/auth";
import { authService } from "@/services/auth";
import { User } from "@/api/generated/interfaces";
import {
  getSidebarMenuItems,
  hasPermission,
  MenuItem,
} from "@/services/permissionService";
import TicketManagement from "./TicketManagement";
import CallManager from "./CallManager";
import UserManagement from "./UserManagement";
import TenantGroupManagement from "./TenantGroupManagement";
import SocialIntegrations from "./SocialIntegrations";
import UnifiedMessagesManagement from "./UnifiedMessagesManagement";
import UserTimeTracking from "./UserTimeTracking";
import UserStatistics from "./UserStatistics";
import OrderManagement from "./OrderManagement";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface DashboardProps {
  user: AuthUser;
  tenant: TenantInfo;
  onLogout: () => void;
}

export default function Dashboard({ tenant, onLogout }: DashboardProps) {
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentView, setCurrentView] = useState<
    | "tickets"
    | "calls"
    | "orders"
    | "users"
    | "groups"
    | "messages"
    | "social"
    | "settings"
    | "time-tracking"
    | "user-statistics"
    | "empty"
  >("tickets");
  const [initialViewSet, setInitialViewSet] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [connectionsChanged, setConnectionsChanged] = useState(false);
  const [messagesRefreshKey, setMessagesRefreshKey] = useState(0);

  useEffect(() => {
    fetchUserProfile();
    checkSocialConnections();

  }, []);


  const fetchUserProfile = async () => {
    try {
      const profile = await authService.getProfile();
      setUserProfile(profile);
    } catch (err: unknown) {
      console.error("Failed to fetch user profile:", err);
      setError("Failed to load user profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      onLogout();
    } catch (err) {
      console.error("Logout error:", err);
      // Force local logout even if API call fails
      if (typeof window !== "undefined") {
        localStorage.removeItem("echodesk_auth_token");
        localStorage.removeItem("echodesk_user_data");
        localStorage.removeItem("echodesk_tenant_data");
      }
      onLogout();
    }
  };

  const checkSocialConnections = async () => {
    try {
      const axiosInstance = (await import("@/api/axios")).default;

      // Check Facebook connection
      try {
        const facebookResponse = await axiosInstance.get(
          "/api/social/facebook/status/"
        );
        setFacebookConnected(facebookResponse.data.connected || false);
      } catch (err) {
        console.error("Failed to check Facebook connection:", err);
        setFacebookConnected(false);
      }
    } catch (err) {
      console.error("Failed to check social connections:", err);
    }
  };

  const menuItems = [
    {
      id: "tickets",
      label: "Tickets",
      icon: "🎫",
      permission: "can_access_tickets",
      description: "View and manage tickets",
    },
    {
      id: "time-tracking",
      label: "My Time",
      icon: "⏱️",
      permission: "can_access_tickets", // Same permission as tickets since it's related
      description: "View your time tracking data",
    },
    {
      id: "user-statistics",
      label: "Time Statistics",
      icon: "📊",
      permission: "can_access_user_management", // Requires user management permission
      description: "View time tracking statistics for all users",
    },
    {
      id: "calls",
      label: "Calls",
      icon: "📞",
      permission: "can_access_calls",
      description: "Handle phone calls",
    },
    {
      id: "orders",
      label: "Orders",
      icon: "📝",
      permission: "can_access_orders",
      description: "Create and manage orders",
    },
    // Add Messages menu item only when Facebook is connected
    ...(facebookConnected
      ? [
          {
            id: "messages",
            label: "Messages",
            icon: "💬",
            permission: "can_manage_settings", // Use same permission as social for now
            description: "View and respond to Facebook messages",
          },
        ]
      : []),
    {
      id: "users",
      label: "Users",
      icon: "👥",
      permission: "can_access_user_management",
      description: "Manage user accounts",
    },
    {
      id: "groups",
      label: "Groups",
      icon: "👨‍👩‍👧‍👦",
      permission: "can_access_user_management",
      description: "Manage user groups and permissions",
    },
    {
      id: "social",
      label: "Social Media",
      icon: "📱",
      permission: "can_manage_settings",
      description: "Connect social media accounts",
    },
    {
      id: "settings",
      label: "Settings",
      icon: "⚙️",
      permission: "can_manage_settings",
      description: "Configure system settings",
    },
  ];

  // Filter menu items based on user permissions using the new permission service
  const visibleMenuItems = getSidebarMenuItems(userProfile, menuItems);

  // Set initial view based on user permissions (only once)
  useEffect(() => {
    if (userProfile && !initialViewSet) {
      if (visibleMenuItems.length > 0) {
        // Find the first menu item the user has access to
        const firstAccessibleItem = visibleMenuItems[0];
        if (firstAccessibleItem) {
          setCurrentView(firstAccessibleItem.id as typeof currentView);
        } else {
          setCurrentView("empty");
        }
      } else {
        // User has no access to any menu items
        setCurrentView("empty");
      }
      setInitialViewSet(true);
    }
  }, [userProfile, visibleMenuItems, initialViewSet]);

  const handleMenuClick = (viewId: string) => {
    // If navigating to messages after connections changed, refresh the component
    if (viewId === "messages" && connectionsChanged) {
      setMessagesRefreshKey((prev) => prev + 1);
      setConnectionsChanged(false);
    }

    setCurrentView(viewId as typeof currentView);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${tenant.theme.primary_color}22, ${tenant.theme.secondary_color}22)`,
        }}
      >
        <div
          style={{
            background: "white",
            padding: "40px",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: `4px solid ${tenant.theme.primary_color}`,
              borderTop: "4px solid transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px",
            }}
          ></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50"
        style={{ background: "#f8f9fa" }}
      >

        <AppSidebar
          tenant={tenant}
          userProfile={userProfile}
          visibleMenuItems={visibleMenuItems}
          currentView={currentView}
          onMenuClick={handleMenuClick}
          onLogout={handleLogout}
        />

        <SidebarInset>
          <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold">
              {visibleMenuItems.find((item) => item.id === currentView)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex-1 p-6"
            style={{
              background: "#f8f9fa",
            }}
          >
            {/* View Content */}
            {currentView === "tickets" && (
              <TicketManagement />
            )}

            {currentView === "calls" && (
              <CallManager
                onCallStatusChange={(isActive) =>
                  console.log("Call status:", isActive)
                }
              />
            )}

            {currentView === "orders" && <OrderManagement />}

            {currentView === "users" && <UserManagement />}

            {currentView === "groups" && <TenantGroupManagement />}

            {currentView === "time-tracking" && (
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              >
                <UserTimeTracking />
              </div>
            )}

            {currentView === "user-statistics" && (
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              >
                <UserStatistics />
              </div>
            )}

            {currentView === "messages" && (
              <UnifiedMessagesManagement
                key={messagesRefreshKey}
                onBackToDashboard={() => {
                  const firstAccessibleItem = visibleMenuItems[0];
                  if (firstAccessibleItem) {
                    setCurrentView(firstAccessibleItem.id as typeof currentView);
                  } else {
                    setCurrentView("empty");
                  }
                }}
              />
            )}

            {currentView === "social" && (
              <SocialIntegrations
                onBackToDashboard={() => {
                  if (connectionsChanged) {
                    setMessagesRefreshKey((prev) => prev + 1);
                    setConnectionsChanged(false);
                  }
                  const firstAccessibleItem = visibleMenuItems[0];
                  if (firstAccessibleItem) {
                    setCurrentView(firstAccessibleItem.id as typeof currentView);
                  } else {
                    setCurrentView("empty");
                  }
                }}
                onConnectionChange={(type, connected) => {
                  setConnectionsChanged(true);
                  if (type === "facebook") {
                    setFacebookConnected(connected);
                  }
                }}
              />
            )}

            {currentView === "settings" && (
              <div
                style={{
                  background: "white",
                  padding: "30px",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              >
                <h2 style={{ margin: "0 0 20px 0", color: "#333" }}>
                  System Settings
                </h2>
                <p style={{ color: "#666" }}>
                  System settings will be available here. This section will
                  include:
                </p>
                <ul style={{ color: "#666", marginLeft: "20px" }}>
                  <li>Tenant configuration</li>
                  <li>Security settings</li>
                  <li>Notification preferences</li>
                  <li>User permissions and roles</li>
                </ul>
                <div
                  style={{
                    marginTop: "20px",
                    padding: "15px",
                    background: "#f8f9fa",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "#666",
                  }}
                >
                  <strong>Note:</strong> Social media integrations are now
                  available in the dedicated "Social Media" section in
                  the sidebar.
                </div>
              </div>
            )}

            {currentView === "empty" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "60vh",
                  textAlign: "center",
                  background: "white",
                  borderRadius: "12px",
                  padding: "40px 20px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: `${tenant.theme.primary_color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "32px",
                    marginBottom: "24px",
                  }}
                >
                  🔐
                </div>
                <h2
                  style={{
                    fontSize: "24px",
                    fontWeight: "600",
                    color: "#333",
                    margin: "0 0 16px 0",
                  }}
                >
                  Access Restricted
                </h2>
                <p
                  style={{
                    fontSize: "16px",
                    color: "#6c757d",
                    margin: "0 0 24px 0",
                    maxWidth: "400px",
                    lineHeight: "1.5",
                  }}
                >
                  You don&apos;t have permission to access any sections of the application.
                  Please contact your administrator to request appropriate access.
                </p>
                <Button
                  onClick={handleLogout}
                  style={{
                    background: tenant.theme.primary_color,
                  }}
                >
                  🚪 Logout
                </Button>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
