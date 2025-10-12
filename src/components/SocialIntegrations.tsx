"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { FacebookPageConnection, FacebookMessage } from "@/api/generated/interfaces";
import axios from "@/api/axios";

interface SocialIntegrationsProps {
  onBackToDashboard?: () => void;
  onConnectionChange?: (type: 'facebook', connected: boolean) => void;
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


interface ConnectionStats {
  totalMessages: number;
  recentMessages: FacebookMessage[];
}


interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

export default function SocialIntegrations({ onBackToDashboard, onConnectionChange }: SocialIntegrationsProps) {
  const t = useTranslations("social");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [facebookStatus, setFacebookStatus] = useState<FacebookStatus | null>(null);
  const [facebookPages, setFacebookPages] = useState<FacebookPageConnection[]>([]);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);
  const [activeTab, setActiveTab] = useState<"facebook">("facebook");

  const loadFacebookStatus = useCallback(async () => {
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
  }, [onConnectionChange]);


  const loadSocialConnections = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "facebook") {
        await loadFacebookStatus();
      }
      // Add other platforms later
    } catch (err: any) {
      console.error("Failed to load social connections:", err);
      setError(err.message || t("error"));
    } finally {
      setLoading(false);
    }
  }, [activeTab, loadFacebookStatus, t]);

  useEffect(() => {
    loadSocialConnections();
  }, [loadSocialConnections]);

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
      setError(err.response?.data?.error || err.message || t("error"));
      setLoading(false);
    }
  };

  const handleDisconnectFacebook = async () => {
    if (!confirm(t("areYouSureDisconnect"))) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await axios.post('/api/social/facebook/disconnect/');

      // Reload Facebook status
      await loadFacebookStatus();

      // Notify parent component that Facebook connection changed
      if (onConnectionChange) {
        onConnectionChange('facebook', false);
      }

      // Show success message if provided
      if (response.data.message) {
        console.log("Facebook disconnect successful:", response.data.message);
      }
    } catch (err: any) {
      console.error("Failed to disconnect Facebook:", err);
      setError(err.response?.data?.error || err.message || t("error"));
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
              {t("facebookPages")}
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666" }}>
              {facebookStatus?.connected
                ? t("pagesConnected", { count: facebookStatus.pages_count })
                : t("notConnected")}
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
            <span>📊 {t("totalMessages", { count: connectionStats.totalMessages })}</span>
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
              {loading ? t("connecting") : t("connectFacebookPages")}
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
              {loading ? t("disconnecting") : t("disconnectAllPages")}
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
            {t("refreshStatus")}
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
              {t("connectedFacebookPages")}
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
                    {t("pageId")}: {page.page_id} • {t("connected")}: {formatDate(page.created_at)}
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
                  {page.is_active ? t("active") : t("inactive")}
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
              {t("recentMessages")}
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
            {t("howToConnect")}
          </h4>
          <ol style={{ margin: "0", paddingLeft: "20px", color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
            <li>{t("step4")}</li>
            <li>{t("step5")}</li>
          </ol>
          <div style={{ marginTop: "15px", padding: "12px", background: "#fff3cd", borderRadius: "6px", fontSize: "13px", color: "#856404" }}>
            <strong>{tCommon("note")}:</strong> {t("noteAdmin")}
          </div>
        </div>
      )}
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
          {onBackToDashboard && (
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
              ← {t("backToDashboard")}
            </button>
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#333" }}>
              {t("socialMediaIntegrations")}
            </h1>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666" }}>
              {t("connectAndManage")}
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
            background: "#f8f9fa",
            borderBottom: "1px solid #dee2e6",
            padding: "15px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "24px" }}>📘</span>
          <span style={{ fontSize: "18px", fontWeight: "600", color: "#333" }}>
            {t("facebookIntegration")}
          </span>
        </div>

        <div style={{ padding: "30px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
              <div style={{ fontSize: "24px", marginBottom: "12px" }}>⏳</div>
              {t("loadingFacebookIntegration")}
            </div>
          )}

          {!loading && renderFacebookSection()}
        </div>
      </div>
    </div>
  );
}
