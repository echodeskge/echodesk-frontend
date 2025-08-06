"use client";

import { useState, useEffect } from "react";
import { FacebookPageConnection, FacebookMessage } from "@/api/generated/interfaces";
import axios from "@/api/axios";

interface SocialIntegrationsProps {
  onBackToDashboard: () => void;
  onConnectionChange?: (type: 'facebook' | 'instagram' | 'whatsapp', connected: boolean) => void;
}

interface FacebookStatus {
  connected: boolean;
  pages_count: number;
  pages: Array<{
    id: number;
    page_id: string;
    page_name: string;
    is_active: boolean;
    connected_at: string;
  }>;
}

interface InstagramAccountConnection {
  id: number;
  instagram_account_id: string;
  username: string;
  name: string;
  profile_picture_url?: string;
  is_active: boolean;
  created_at: string;
}

interface InstagramMessage {
  id: number;
  message_id: string;
  conversation_id: string;
  sender_id: string;
  sender_username: string;
  message_text: string;
  message_type: string;
  attachment_url?: string;
  timestamp: string;
  is_from_business: boolean;
  account_connection: number;
}

interface InstagramStatus {
  connected: boolean;
  accounts_count: number;
  accounts: Array<{
    id: number;
    instagram_account_id: string;
    username: string;
    name: string;
    is_active: boolean;
    connected_at: string;
  }>;
}

interface ConnectionStats {
  totalMessages: number;
  recentMessages: FacebookMessage[];
}

interface InstagramConnectionStats {
  totalMessages: number;
  recentMessages: InstagramMessage[];
}

interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

export default function SocialIntegrations({ onBackToDashboard, onConnectionChange }: SocialIntegrationsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [facebookStatus, setFacebookStatus] = useState<FacebookStatus | null>(null);
  const [facebookPages, setFacebookPages] = useState<FacebookPageConnection[]>([]);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);
  const [instagramStatus, setInstagramStatus] = useState<InstagramStatus | null>(null);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccountConnection[]>([]);
  const [instagramStats, setInstagramStats] = useState<InstagramConnectionStats | null>(null);
  const [activeTab, setActiveTab] = useState<"facebook" | "instagram" | "whatsapp">("facebook");

  useEffect(() => {
    loadSocialConnections();
  }, [activeTab]);

  const loadSocialConnections = async () => {
    setLoading(true);
    try {
      if (activeTab === "facebook") {
        await loadFacebookStatus();
      } else if (activeTab === "instagram") {
        await loadInstagramStatus();
      }
      // Add other platforms later
    } catch (err: any) {
      console.error("Failed to load social connections:", err);
      setError(err.message || "Failed to load social connections");
    } finally {
      setLoading(false);
    }
  };

  const loadFacebookStatus = async () => {
    try {
      // Get connection status
      const statusResponse = await axios.get('/api/social/facebook/status/');
      const status = statusResponse.data;
      setFacebookStatus(status);

      // Notify parent component of connection status change
      if (onConnectionChange) {
        onConnectionChange('facebook', status.connected || false);
      }

      // Get connected pages
      const pagesResponse = await axios.get('/api/social/facebook-pages/');
      const pagesData = pagesResponse.data as PaginatedResponse<FacebookPageConnection>;
      setFacebookPages(pagesData.results || []);

      // Get recent messages for stats
      if (status.connected) {
        const messagesResponse = await axios.get('/api/social/facebook-messages/?page=1');
        const messagesData = messagesResponse.data as PaginatedResponse<FacebookMessage>;
        setConnectionStats({
          totalMessages: messagesData.count,
          recentMessages: messagesData.results.slice(0, 5)
        });
      }
    } catch (err: any) {
      console.error("Failed to load Facebook status:", err);
      throw err;
    }
  };

  const handleConnectFacebook = async () => {
    setLoading(true);
    setError("");
    try {
      const oauthResponse = await axios.get('/api/social/facebook/oauth/start/');
      if (oauthResponse.data.oauth_url) {
        // Redirect to Facebook OAuth
        window.location.href = oauthResponse.data.oauth_url;
      } else {
        throw new Error("No OAuth URL received");
      }
    } catch (err: any) {
      console.error("Failed to start Facebook OAuth:", err);
      setError(err.response?.data?.error || err.message || "Failed to connect to Facebook");
      setLoading(false);
    }
  };

  const handleDisconnectFacebook = async () => {
    if (!confirm("Are you sure you want to disconnect all Facebook pages? This will stop receiving messages.")) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await axios.post('/api/social/facebook/disconnect/');
      await loadFacebookStatus(); // Reload status
    } catch (err: any) {
      console.error("Failed to disconnect Facebook:", err);
      setError(err.response?.data?.error || err.message || "Failed to disconnect Facebook");
    } finally {
      setLoading(false);
    }
  };

  const loadInstagramStatus = async () => {
    try {
      // Get connection status
      const statusResponse = await axios.get('/api/social/instagram/status/');
      const status = statusResponse.data;
      setInstagramStatus(status);

      // Notify parent component of connection status change
      if (onConnectionChange) {
        onConnectionChange('instagram', status.connected || false);
      }

      // Get connected accounts
      const accountsResponse = await axios.get('/api/social/instagram-accounts/');
      const accountsData = accountsResponse.data as PaginatedResponse<InstagramAccountConnection>;
      setInstagramAccounts(accountsData.results || []);

      // Get recent messages for stats
      if (status.connected) {
        const messagesResponse = await axios.get('/api/social/instagram-messages/?page=1');
        const messagesData = messagesResponse.data as PaginatedResponse<InstagramMessage>;
        setInstagramStats({
          totalMessages: messagesData.count,
          recentMessages: messagesData.results.slice(0, 5)
        });
      }
    } catch (err: any) {
      console.error("Failed to load Instagram status:", err);
      throw err;
    }
  };

  const handleConnectInstagram = async () => {
    setLoading(true);
    setError("");
    try {
      const oauthResponse = await axios.get('/api/social/instagram/oauth/start/');
      if (oauthResponse.data.oauth_url) {
        // Redirect to Instagram OAuth
        window.location.href = oauthResponse.data.oauth_url;
      } else {
        throw new Error("No OAuth URL received");
      }
    } catch (err: any) {
      console.error("Failed to start Instagram OAuth:", err);
      setError(err.response?.data?.error || err.message || "Failed to connect to Instagram");
      setLoading(false);
    }
  };

  const handleDisconnectInstagram = async () => {
    if (!confirm("Are you sure you want to disconnect all Instagram accounts? This will stop receiving messages.")) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await axios.post('/api/social/instagram/disconnect/');
      await loadInstagramStatus(); // Reload status
    } catch (err: any) {
      console.error("Failed to disconnect Instagram:", err);
      setError(err.response?.data?.error || err.message || "Failed to disconnect Instagram");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderFacebookSection = () => (
    <div style={{ marginTop: "20px" }}>
      {/* Connection Status */}
      <div
        style={{
          background: facebookStatus?.connected ? "#d4f4dd" : "#f8f9fa",
          border: `1px solid ${facebookStatus?.connected ? "#28a745" : "#dee2e6"}`,
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "12px",
              background: "#1877f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "24px",
            }}
          >
            📘
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#333" }}>
              Facebook Pages
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666" }}>
              {facebookStatus?.connected
                ? `${facebookStatus.pages_count} page(s) connected`
                : "Not connected"}
            </p>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: facebookStatus?.connected ? "#28a745" : "#dc3545",
              }}
            />
          </div>
        </div>

        {facebookStatus?.connected && connectionStats && (
          <div style={{ marginBottom: "15px", fontSize: "14px", color: "#666" }}>
            <span>📊 {connectionStats.totalMessages} total messages received</span>
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          {!facebookStatus?.connected ? (
            <button
              onClick={handleConnectFacebook}
              disabled={loading}
              style={{
                background: "#1877f2",
                color: "white",
                border: "none",
                padding: "12px 20px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Connecting..." : "Connect Facebook Pages"}
            </button>
          ) : (
            <button
              onClick={handleDisconnectFacebook}
              disabled={loading}
              style={{
                background: "#dc3545",
                color: "white",
                border: "none",
                padding: "12px 20px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Disconnecting..." : "Disconnect All Pages"}
            </button>
          )}
          <button
            onClick={loadFacebookStatus}
            disabled={loading}
            style={{
              background: "#6c757d",
              color: "white",
              border: "none",
              padding: "12px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            Refresh Status
          </button>
        </div>
      </div>

      {/* Connected Pages List */}
      {facebookPages.length > 0 && (
        <div
          style={{
            background: "white",
            border: "1px solid #dee2e6",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <div style={{ background: "#f8f9fa", padding: "15px", borderBottom: "1px solid #dee2e6" }}>
            <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#333" }}>
              Connected Facebook Pages
            </h4>
          </div>
          <div style={{ padding: "0" }}>
            {facebookPages.map((page, index) => (
              <div
                key={page.id}
                style={{
                  padding: "15px 20px",
                  borderBottom: index < facebookPages.length - 1 ? "1px solid #f1f3f4" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: "#333", marginBottom: "4px" }}>
                    {page.page_name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    Page ID: {page.page_id} • Connected: {formatDate(page.created_at)}
                  </div>
                </div>
                <div
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "500",
                    background: page.is_active ? "#d4f4dd" : "#f8d7da",
                    color: page.is_active ? "#28a745" : "#dc3545",
                  }}
                >
                  {page.is_active ? "ACTIVE" : "INACTIVE"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Messages */}
      {connectionStats?.recentMessages && connectionStats.recentMessages.length > 0 && (
        <div
          style={{
            background: "white",
            border: "1px solid #dee2e6",
            borderRadius: "8px",
            overflow: "hidden",
            marginTop: "20px",
          }}
        >
          <div style={{ background: "#f8f9fa", padding: "15px", borderBottom: "1px solid #dee2e6" }}>
            <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#333" }}>
              Recent Messages
            </h4>
          </div>
          <div style={{ padding: "0" }}>
            {connectionStats.recentMessages.map((message, index) => (
              <div
                key={message.id}
                style={{
                  padding: "15px 20px",
                  borderBottom: index < connectionStats.recentMessages.length - 1 ? "1px solid #f1f3f4" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  {message.profile_pic_url && (
                    <img
                      src={message.profile_pic_url}
                      alt={message.sender_name || "User"}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "14px", fontWeight: "500", color: "#333" }}>
                        {message.sender_name || "Unknown User"}
                      </span>
                      <span style={{ fontSize: "12px", color: "#666" }}>
                        {formatDate(message.timestamp)}
                      </span>
                      <span style={{ fontSize: "11px", color: "#1877f2", fontWeight: "500" }}>
                        {message.page_name}
                      </span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#666", lineHeight: "1.4" }}>
                      {message.message_text}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      {!facebookStatus?.connected && (
        <div
          style={{
            background: "#f8f9fa",
            border: "1px solid #dee2e6",
            borderRadius: "8px",
            padding: "20px",
            marginTop: "20px",
          }}
        >
          <h4 style={{ margin: "0 0 15px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
            How to Connect Facebook Pages
          </h4>
          <ol style={{ margin: "0", paddingLeft: "20px", color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
            <li>Click &quot;Connect Facebook Pages&quot; above</li>
            <li>You&apos;ll be redirected to Facebook to authorize the connection</li>
            <li>Select the Facebook pages you want to connect</li>
            <li>Grant permissions to manage messages and page content</li>
            <li>You&apos;ll be redirected back here with your pages connected</li>
          </ol>
          <div style={{ marginTop: "15px", padding: "12px", background: "#fff3cd", borderRadius: "6px", fontSize: "13px", color: "#856404" }}>
            <strong>Note:</strong> You need to be an admin of the Facebook pages to connect them.
          </div>
        </div>
      )}
    </div>
  );

  const renderInstagramSection = () => (
    <div style={{ marginTop: "20px" }}>
      {/* Connection Status */}
      <div
        style={{
          background: instagramStatus?.connected ? "#d4f4dd" : "#f8f9fa",
          border: `1px solid ${instagramStatus?.connected ? "#28a745" : "#dee2e6"}`,
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "12px",
              background: "linear-gradient(45deg, #833ab4, #fd1d1d, #fcb045)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "24px",
            }}
          >
            📷
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#333" }}>
              Instagram Business
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666" }}>
              {instagramStatus?.connected
                ? `${instagramStatus.accounts_count} account(s) connected`
                : "Not connected"}
            </p>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: instagramStatus?.connected ? "#28a745" : "#dc3545",
              }}
            />
          </div>
        </div>

        {instagramStatus?.connected && instagramStats && (
          <div style={{ marginBottom: "15px", fontSize: "14px", color: "#666" }}>
            <span>📊 {instagramStats.totalMessages} total messages received</span>
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          {!instagramStatus?.connected ? (
            <button
              onClick={handleConnectInstagram}
              disabled={loading}
              style={{
                background: "linear-gradient(45deg, #833ab4, #fd1d1d, #fcb045)",
                color: "white",
                border: "none",
                padding: "12px 20px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Connecting..." : "Connect Instagram Business"}
            </button>
          ) : (
            <button
              onClick={handleDisconnectInstagram}
              disabled={loading}
              style={{
                background: "#dc3545",
                color: "white",
                border: "none",
                padding: "12px 20px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Disconnecting..." : "Disconnect All Accounts"}
            </button>
          )}
          <button
            onClick={loadInstagramStatus}
            disabled={loading}
            style={{
              background: "#6c757d",
              color: "white",
              border: "none",
              padding: "12px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            Refresh Status
          </button>
        </div>
      </div>

      {/* Connected Accounts List */}
      {instagramAccounts.length > 0 && (
        <div
          style={{
            background: "white",
            border: "1px solid #dee2e6",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <div style={{ background: "#f8f9fa", padding: "15px", borderBottom: "1px solid #dee2e6" }}>
            <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#333" }}>
              Connected Instagram Accounts
            </h4>
          </div>
          <div style={{ padding: "0" }}>
            {instagramAccounts.map((account, index) => (
              <div
                key={account.id}
                style={{
                  padding: "15px 20px",
                  borderBottom: index < instagramAccounts.length - 1 ? "1px solid #f1f3f4" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {account.profile_picture_url && (
                    <img
                      src={account.profile_picture_url}
                      alt={account.username}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "500", color: "#333", marginBottom: "4px" }}>
                      @{account.username}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      {account.name} • Connected: {formatDate(account.created_at)}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "500",
                    background: account.is_active ? "#d4f4dd" : "#f8d7da",
                    color: account.is_active ? "#28a745" : "#dc3545",
                  }}
                >
                  {account.is_active ? "ACTIVE" : "INACTIVE"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Messages */}
      {instagramStats?.recentMessages && instagramStats.recentMessages.length > 0 && (
        <div
          style={{
            background: "white",
            border: "1px solid #dee2e6",
            borderRadius: "8px",
            overflow: "hidden",
            marginTop: "20px",
          }}
        >
          <div style={{ background: "#f8f9fa", padding: "15px", borderBottom: "1px solid #dee2e6" }}>
            <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#333" }}>
              Recent Instagram Messages
            </h4>
          </div>
          <div style={{ padding: "0" }}>
            {instagramStats.recentMessages.map((message, index) => (
              <div
                key={message.id}
                style={{
                  padding: "15px 20px",
                  borderBottom: index < instagramStats.recentMessages.length - 1 ? "1px solid #f1f3f4" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "linear-gradient(45deg, #833ab4, #fd1d1d, #fcb045)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    {message.sender_username?.[1] || "U"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "14px", fontWeight: "500", color: "#333" }}>
                        @{message.sender_username || "Unknown User"}
                      </span>
                      <span style={{ fontSize: "12px", color: "#666" }}>
                        {formatDate(message.timestamp)}
                      </span>
                      <span style={{ fontSize: "11px", color: "#833ab4", fontWeight: "500" }}>
                        Instagram DM
                      </span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#666", lineHeight: "1.4" }}>
                      {message.message_text}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      {!instagramStatus?.connected && (
        <div
          style={{
            background: "#f8f9fa",
            border: "1px solid #dee2e6",
            borderRadius: "8px",
            padding: "20px",
            marginTop: "20px",
          }}
        >
          <h4 style={{ margin: "0 0 15px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
            How to Connect Instagram Business Account
          </h4>
          <ol style={{ margin: "0", paddingLeft: "20px", color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
            <li>Click &quot;Connect Instagram Business&quot; above</li>
            <li>You&apos;ll be redirected to Facebook to authorize the connection</li>
            <li>Select the Facebook page connected to your Instagram Business account</li>
            <li>Grant permissions to manage Instagram messages</li>
            <li>You&apos;ll be redirected back here with your Instagram account connected</li>
          </ol>
          <div style={{ marginTop: "15px", padding: "12px", background: "#fff3cd", borderRadius: "6px", fontSize: "13px", color: "#856404" }}>
            <strong>Requirements:</strong> You need a Facebook page connected to an Instagram Business account.
          </div>
        </div>
      )}
    </div>
  );

  const renderPlaceholderSection = (platform: string, icon: string, description: string) => (
    <div style={{ marginTop: "20px" }}>
      <div
        style={{
          background: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: "8px",
          padding: "40px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>{icon}</div>
        <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600", color: "#333" }}>
          {platform} Integration
        </h3>
        <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
          {description}
        </p>
        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            background: "#e9ecef",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#495057",
          }}
        >
          Coming Soon - {platform} integration will be available in a future update
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: "white",
          padding: "20px 30px",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button
            onClick={onBackToDashboard}
            style={{
              background: "transparent",
              border: "1px solid #dee2e6",
              borderRadius: "8px",
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: "14px",
              color: "#666",
            }}
          >
            ← Back to Dashboard
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#333" }}>
              Social Media Integrations
            </h1>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666" }}>
              Connect and manage your social media accounts for unified customer communication
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
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

      {/* Platform Tabs */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #dee2e6",
          }}
        >
          {[
            { key: "facebook", label: "Facebook", icon: "📘" },
            { key: "instagram", label: "Instagram", icon: "📷" },
            { key: "whatsapp", label: "WhatsApp", icon: "📱" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                flex: 1,
                padding: "15px 20px",
                border: "none",
                background: activeTab === tab.key ? "#f8f9fa" : "white",
                borderBottom: activeTab === tab.key ? "2px solid #007bff" : "2px solid transparent",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                color: activeTab === tab.key ? "#007bff" : "#666",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "30px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
              <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>
              Loading {activeTab} integration...
            </div>
          )}

          {!loading && activeTab === "facebook" && renderFacebookSection()}
          {!loading && activeTab === "instagram" && renderInstagramSection()}
          {!loading && activeTab === "whatsapp" && renderPlaceholderSection(
            "WhatsApp Business",
            "📱",
            "Integrate WhatsApp Business API to handle customer messages through WhatsApp"
          )}
        </div>
      </div>
    </div>
  );
}
