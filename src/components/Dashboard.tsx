"use client";

import { useState, useEffect } from "react";
import { AuthUser, TenantInfo } from "@/types/auth";
import { authService } from "@/services/auth";
import { User } from "@/api/generated/interfaces";
import { getSidebarMenuItems, hasPermission } from "@/services/permissionService";
import TicketManagement from "./TicketManagement";
import CallManager from "./CallManager";
import UserManagement from "./UserManagement";
import GroupManagement from "./GroupManagement";
import SocialIntegrations from "./SocialIntegrations";
import UnifiedMessagesManagement from "./UnifiedMessagesManagement";

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
    "dashboard" | "tickets" | "calls" | "users" | "groups" | "messages" | "social" | "settings"
  >("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [instagramConnected, setInstagramConnected] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    checkSocialConnections();

    // Check if mobile on mount and resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false); // Close mobile sidebar when switching to desktop
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
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
        const facebookResponse = await axiosInstance.get('/api/social/facebook/status/');
        setFacebookConnected(facebookResponse.data.connected || false);
      } catch (err) {
        console.error("Failed to check Facebook connection:", err);
        setFacebookConnected(false);
      }

      // Check Instagram connection
      try {
        const instagramResponse = await axiosInstance.get('/api/social/instagram/status/');
        setInstagramConnected(instagramResponse.data.connected || false);
      } catch (err) {
        console.error("Failed to check Instagram connection:", err);
        setInstagramConnected(false);
      }
    } catch (err) {
      console.error("Failed to check social connections:", err);
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "🏠", permission: null },
    {
      id: "tickets",
      label: "Tickets",
      icon: "🎫",
      permission: "can_access_tickets",
      description: "View and manage tickets",
    },
    {
      id: "calls",
      label: "Calls",
      icon: "📞",
      permission: "can_access_calls",
      description: "Handle phone calls",
    },
    // Add Messages menu item only when Facebook or Instagram is connected
    ...((facebookConnected || instagramConnected) ? [{
      id: "messages",
      label: "Messages",
      icon: "💬",
      permission: "can_manage_settings", // Use same permission as social for now
      description: `View and respond to ${facebookConnected && instagramConnected ? 'Facebook and Instagram' : facebookConnected ? 'Facebook' : 'Instagram'} messages`,
    }] : []),
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

  const handleMenuClick = (
    viewId: "dashboard" | "tickets" | "calls" | "users" | "groups" | "messages" | "social" | "settings"
  ) => {
    setCurrentView(viewId);
    if (isMobile) {
      setSidebarOpen(false); // Close sidebar on mobile after selection
    }
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#f8f9fa",
      }}
    >
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 999,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: isMobile ? "280px" : "260px",
          background: "white",
          borderRight: "1px solid #e1e5e9",
          position: isMobile ? "fixed" : "relative",
          top: 0,
          left: 0,
          height: "100vh",
          transform: isMobile
            ? sidebarOpen
              ? "translateX(0)"
              : "translateX(-100%)"
            : "translateX(0)",
          transition: "transform 0.3s ease-in-out",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          boxShadow: isMobile ? "2px 0 10px rgba(0,0,0,0.1)" : "none",
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #e1e5e9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {tenant.theme.logo_url && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tenant.theme.logo_url}
                  alt={tenant.name}
                  style={{ height: "32px", marginRight: "12px" }}
                />
              </>
            )}
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "600",
                  color: tenant.theme.primary_color,
                }}
              >
                {tenant.name}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "#6c757d",
                }}
              >
                {tenant.domain}
              </p>
            </div>
          </div>

          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#6c757d",
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, padding: "20px 0" }}>
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() =>
                handleMenuClick(
                  item.id as
                    | "dashboard"
                    | "tickets"
                    | "calls"
                    | "users"
                    | "groups"
                    | "messages"
                    | "social"
                    | "settings"
                )
              }
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 20px",
                border: "none",
                background:
                  currentView === item.id
                    ? `${tenant.theme.primary_color}15`
                    : "transparent",
                color:
                  currentView === item.id
                    ? tenant.theme.primary_color
                    : "#495057",
                fontSize: "16px",
                fontWeight: currentView === item.id ? "600" : "400",
                cursor: "pointer",
                textAlign: "left",
                borderRight:
                  currentView === item.id
                    ? `3px solid ${tenant.theme.primary_color}`
                    : "3px solid transparent",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                if (currentView !== item.id) {
                  e.currentTarget.style.background = "#f8f9fa";
                }
              }}
              onMouseOut={(e) => {
                if (currentView !== item.id) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <span style={{ fontSize: "20px" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div
          style={{
            padding: "20px",
            borderTop: "1px solid #e1e5e9",
          }}
        >
          {userProfile && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: tenant.theme.primary_color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: "600",
                  }}
                >
                  {userProfile.first_name?.[0] ||
                    userProfile.email[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#333",
                      marginBottom: "2px",
                    }}
                  >
                    {userProfile.full_name ||
                      `${userProfile.first_name} ${userProfile.last_name}`.trim() ||
                      userProfile.email}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6c757d",
                    }}
                  >
                    {typeof userProfile.role === "string"
                      ? userProfile.role
                      : String(userProfile.role || "agent")}
                  </div>
                </div>
              </div>

              {/* Development: Show permissions */}
              {process.env.NODE_ENV === "development" && (
                <div
                  style={{
                    fontSize: "10px",
                    color: "#6c757d",
                    backgroundColor: "#f8f9fa",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    marginBottom: "8px",
                    border: "1px solid #e9ecef",
                  }}
                >
                  <div>
                    🎫 Tickets: {hasPermission(userProfile, 'can_access_tickets') ? "✅" : "❌"}
                  </div>
                  <div>
                    📞 Calls: {hasPermission(userProfile, 'can_access_calls') ? "✅" : "❌"}
                  </div>
                  <div>
                    👥 User Mgmt: {hasPermission(userProfile, 'can_access_user_management') ? "✅" : "❌"}
                  </div>
                  <div>
                    ⚙️ Settings: {hasPermission(userProfile, 'can_manage_settings') ? "✅" : "❌"}
                  </div>
                  <div style={{ fontSize: "9px", marginTop: "4px", fontStyle: "italic" }}>
                    Groups: {userProfile?.groups?.map(g => g.name).join(', ') || 'None'}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              background: "#dc3545",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {/* Mobile Header */}
        {isMobile && (
          <header
            style={{
              background: "white",
              borderBottom: "1px solid #e1e5e9",
              padding: "15px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#495057",
              }}
            >
              ☰
            </button>
            <h1
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: "600",
                color: "#333",
              }}
            >
              {visibleMenuItems.find((item) => item.id === currentView)?.label}
            </h1>
            <div style={{ width: "32px" }} /> {/* Spacer for centering */}
          </header>
        )}

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            padding: isMobile ? "20px" : "30px",
            background: "#f8f9fa",
          }}
        >
          {error && (
            <div
              style={{
                background: "#f8d7da",
                color: "#721c24",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid #f5c6cb",
              }}
            >
              {error}
              <button
                onClick={() => setError("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#721c24",
                  cursor: "pointer",
                  float: "right",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* View Content */}
          {currentView === "tickets" && (
            <TicketManagement
              onBackToDashboard={() => setCurrentView("dashboard")}
            />
          )}

          {currentView === "calls" && (
            <CallManager
              onCallStatusChange={(isActive) =>
                console.log("Call status:", isActive)
              }
            />
          )}

          {currentView === "users" && <UserManagement />}

          {currentView === "groups" && <GroupManagement />}

          {currentView === "messages" && (
            <UnifiedMessagesManagement
              onBackToDashboard={() => setCurrentView("dashboard")}
            />
          )}

          {currentView === "social" && (
            <SocialIntegrations
              onBackToDashboard={() => setCurrentView("dashboard")}
              onConnectionChange={(type, connected) => {
                if (type === 'facebook') {
                  setFacebookConnected(connected);
                } else if (type === 'instagram') {
                  setInstagramConnected(connected);
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
              <div style={{ marginTop: "20px", padding: "15px", background: "#f8f9fa", borderRadius: "8px", fontSize: "14px", color: "#666" }}>
                <strong>Note:</strong> Social media integrations are now available in the dedicated &quot;Social Media&quot; section in the sidebar.
              </div>
            </div>
          )}

          {currentView === "dashboard" && (
            <div>
              {/* Desktop Header (only visible on desktop) */}
              {!isMobile && (
                <div
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "30px",
                    marginBottom: "30px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <h1
                    style={{
                      fontSize: "32px",
                      fontWeight: "700",
                      margin: "0 0 8px 0",
                      color: "#333",
                    }}
                  >
                    Welcome back!
                  </h1>
                  <p
                    style={{
                      fontSize: "16px",
                      color: "#6c757d",
                      margin: 0,
                    }}
                  >
                    Here&apos;s what&apos;s happening with your {tenant.name}{" "}
                    account
                  </p>
                </div>
              )}

              {/* Dashboard Content */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "20px",
                }}
              >
                {/* Stats Cards */}
                <div
                  style={{
                    background: "white",
                    padding: "25px",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    border: `2px solid ${tenant.theme.primary_color}15`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                      marginBottom: "15px",
                    }}
                  >
                    <div
                      style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "12px",
                        background: `${tenant.theme.primary_color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                      }}
                    >
                      🎫
                    </div>
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: "600",
                          color: "#333",
                        }}
                      >
                        Ticket Management
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          color: "#6c757d",
                        }}
                      >
                        Manage and track support tickets
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView("tickets")}
                    style={{
                      width: "100%",
                      background: tenant.theme.primary_color,
                      color: "white",
                      border: "none",
                      padding: "12px 20px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                  >
                    View Tickets
                  </button>
                </div>

                <div
                  style={{
                    background: "white",
                    padding: "25px",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    border: `2px solid ${tenant.theme.primary_color}15`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                      marginBottom: "15px",
                    }}
                  >
                    <div
                      style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "12px",
                        background: `${tenant.theme.primary_color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                      }}
                    >
                      📞
                    </div>
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: "600",
                          color: "#333",
                        }}
                      >
                        Call Management
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          color: "#6c757d",
                        }}
                      >
                        Handle calls and SIP configuration
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView("calls")}
                    style={{
                      width: "100%",
                      background: tenant.theme.primary_color,
                      color: "white",
                      border: "none",
                      padding: "12px 20px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                  >
                    Manage Calls
                  </button>
                </div>
              </div>

              {/* Additional Dashboard Info */}
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "30px",
                  marginTop: "30px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              >
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#333",
                    margin: "0 0 20px 0",
                  }}
                >
                  Account Information
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                    gap: "20px",
                  }}
                >
                  <div>
                    <h4
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#6c757d",
                        margin: "0 0 8px 0",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Tenant Information
                    </h4>
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "16px",
                        color: "#333",
                      }}
                    >
                      <strong>Name:</strong> {tenant.name}
                    </p>
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "16px",
                        color: "#333",
                      }}
                    >
                      <strong>Domain:</strong> {tenant.domain}
                    </p>
                    <p style={{ margin: "0", fontSize: "16px", color: "#333" }}>
                      <strong>Schema:</strong> {tenant.schema_name}
                    </p>
                  </div>

                  <div>
                    <h4
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#6c757d",
                        margin: "0 0 8px 0",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      User Profile
                    </h4>
                    {userProfile && (
                      <>
                        <p
                          style={{
                            margin: "0 0 8px 0",
                            fontSize: "16px",
                            color: "#333",
                          }}
                        >
                          <strong>Name:</strong> {userProfile.first_name}{" "}
                          {userProfile.last_name}
                        </p>
                        <p
                          style={{
                            margin: "0 0 8px 0",
                            fontSize: "16px",
                            color: "#333",
                          }}
                        >
                          <strong>Email:</strong> {userProfile.email}
                        </p>
                        <p
                          style={{
                            margin: "0",
                            fontSize: "16px",
                            color: "#333",
                          }}
                        >
                          <strong>Status:</strong>
                          <span
                            style={{
                              color: userProfile.is_active
                                ? "#28a745"
                                : "#dc3545",
                              fontWeight: "600",
                              marginLeft: "8px",
                            }}
                          >
                            {userProfile.is_active ? "Active" : "Inactive"}
                          </span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
