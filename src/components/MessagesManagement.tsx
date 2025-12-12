"use client";

import { useState, useEffect } from "react";
import { FacebookMessage, FacebookPageConnection } from "@/api/generated/interfaces";
import { socialFacebookSendMessageCreate } from "@/api/generated/api";
import axios from "@/api/axios";

interface MessagesManagementProps {
  onBackToDashboard: () => void;
}

interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

interface MessageConversation {
  sender_id: string;
  sender_name: string;
  profile_pic_url?: string;
  last_message: FacebookMessage;
  message_count: number;
  page_name: string;
}

export default function MessagesManagement({ onBackToDashboard }: MessagesManagementProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<FacebookMessage[]>([]);
  const [conversations, setConversations] = useState<MessageConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [connectedPages, setConnectedPages] = useState<FacebookPageConnection[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [backgroundLoading, setBackgroundLoading] = useState(false);

  // Add CSS animation for spinning
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    loadConnectedPages();
  }, []);

  useEffect(() => {
    if (selectedPage) {
      loadConversations();
    }
  }, [selectedPage]);

  useEffect(() => {
    if (selectedConversation) {
      loadConversationMessages();
    }
  }, [selectedConversation]);

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const refreshInterval = setInterval(async () => {
      setBackgroundLoading(true);
      try {
        if (selectedPage) {
          await loadConversations(true); // Silent loading
        }
        if (selectedConversation) {
          await loadConversationMessages(true); // Silent loading
        }
      } finally {
        setBackgroundLoading(false);
      }
    }, 5000); // 5 seconds

    return () => clearInterval(refreshInterval);
  }, [selectedPage, selectedConversation, autoRefresh]);

  const loadConnectedPages = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/social/facebook-pages/');
      const pagesData = response.data as PaginatedResponse<FacebookPageConnection>;
      setConnectedPages(pagesData.results || []);
      
      if (pagesData.results && pagesData.results.length > 0 && !selectedPage) {
        setSelectedPage(pagesData.results[0].page_id);
      }
    } catch (err: any) {
      console.error("Failed to load connected pages:", err);
      setError(err.response?.data?.error || "Failed to load connected pages");
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async (silent = false) => {
    if (!selectedPage) return;
    
    if (!silent) setLoading(true);
    try {
      const response = await axios.get(`/api/social/facebook-messages/?page_id=${selectedPage}`);
      const messagesData = response.data as PaginatedResponse<FacebookMessage>;
      
      // Group messages by sender to create conversations
      const conversationMap = new Map<string, MessageConversation>();
      
      messagesData.results.forEach(message => {
        if (!message.is_from_page) { // Only show conversations from users, not from the page
          const existing = conversationMap.get(message.sender_id);
          if (!existing || new Date(message.timestamp) > new Date(existing.last_message.timestamp)) {
            conversationMap.set(message.sender_id, {
              sender_id: message.sender_id,
              sender_name: message.sender_name || "Unknown User",
              profile_pic_url: message.profile_pic_url,
              last_message: message,
              message_count: messagesData.results.filter(m => m.sender_id === message.sender_id).length,
              page_name: message.page_name
            });
          }
        }
      });
      
      const sortedConversations = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.last_message.timestamp).getTime() - new Date(a.last_message.timestamp).getTime());
      
      setConversations(sortedConversations);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("Failed to load conversations:", err);
      setError(err.response?.data?.error || "Failed to load conversations");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadConversationMessages = async (silent = false) => {
    if (!selectedConversation) return;
    
    try {
      const response = await axios.get(`/api/social/facebook-messages/?sender_id=${selectedConversation}`);
      const messagesData = response.data as PaginatedResponse<FacebookMessage>;
      
      // Sort messages by timestamp (oldest first for conversation view)
      const sortedMessages = messagesData.results.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setMessages(sortedMessages);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("Failed to load conversation messages:", err);
      setError(err.response?.data?.error || "Failed to load conversation messages");
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConversation || !selectedPage || sending) return;
    
    setSending(true);
    try {
      // Send message via Facebook API using generated function
      await socialFacebookSendMessageCreate({
        recipient_id: selectedConversation,
        message: replyText,
        page_id: selectedPage
      });
      
      setReplyText("");
      // Reload messages to show the sent message
      await loadConversationMessages();
    } catch (err: any) {
      console.error("Failed to send reply:", err);
      setError(err.response?.data?.error || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.last_message.message_text || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (connectedPages.length === 0) {
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
                Messages
              </h1>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666" }}>
                No Facebook pages connected
              </p>
            </div>
          </div>
        </div>

        {/* No Pages Connected */}
        <div
          style={{
            background: "white",
            padding: "60px 40px",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>📭</div>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "20px", fontWeight: "600", color: "#333" }}>
            No Facebook Pages Connected
          </h3>
          <p style={{ margin: "0 0 20px 0", fontSize: "16px", color: "#666", lineHeight: "1.5" }}>
            To view and respond to Facebook messages, you need to connect your Facebook pages first.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{
              background: "#1877f2",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Go to Social Media Settings
          </button>
        </div>
      </div>
    );
  }

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
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#333" }}>
              Facebook Messages
            </h1>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666" }}>
              View and respond to messages from your Facebook pages
              {autoRefresh && (
                <span style={{ color: backgroundLoading ? "#ffc107" : "#28a745", marginLeft: "8px" }}>
                  • {backgroundLoading ? "Refreshing..." : "Auto-refreshing every 5s"}
                </span>
              )}
            </p>
          </div>
          
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              padding: "8px 12px",
              border: "1px solid #dee2e6",
              borderRadius: "6px",
              fontSize: "12px",
              background: autoRefresh ? "#e7f3e7" : "white",
              color: autoRefresh ? "#28a745" : "#666",
              cursor: "pointer",
              marginRight: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
          >
            <span 
              style={{ 
                fontSize: "14px",
                animation: backgroundLoading ? "spin 1s linear infinite" : "none"
              }}
            >
              {autoRefresh ? "🔄" : "⏸️"}
            </span>
            {autoRefresh ? "Auto" : "Manual"}
          </button>
          
          {/* Manual refresh button */}
          <button
            onClick={() => {
              if (selectedPage) loadConversations();
              if (selectedConversation) loadConversationMessages();
            }}
            disabled={loading}
            style={{
              padding: "8px 12px",
              border: "1px solid #dee2e6",
              borderRadius: "6px",
              fontSize: "12px",
              background: "white",
              color: "#666",
              cursor: loading ? "not-allowed" : "pointer",
              marginRight: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            title="Refresh messages now"
          >
            <span style={{ fontSize: "14px", transform: loading ? "rotate(360deg)" : "none", transition: "transform 0.5s" }}>
              🔄
            </span>
            {loading ? "..." : "Refresh"}
          </button>
          
          {/* Page Selector */}
          {connectedPages.length > 1 && (
            <select
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                fontSize: "14px",
                background: "white",
              }}
            >
              {connectedPages.map(page => (
                <option key={page.page_id} value={page.page_id}>
                  {page.page_name}
                </option>
              ))}
            </select>
          )}
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

      {/* Main Content */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          overflow: "hidden",
          height: "600px",
          display: "flex",
        }}
      >
        {/* Conversations Sidebar */}
        <div
          style={{
            width: "350px",
            borderRight: "1px solid #dee2e6",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search */}
          <div style={{ padding: "20px", borderBottom: "1px solid #f1f3f4" }}>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                fontSize: "14px",
                boxSizing: "border-box",
                marginBottom: "8px",
              }}
            />
            {lastUpdated && (
              <div style={{ fontSize: "11px", color: "#666", textAlign: "center" }}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Conversations List */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {loading && (
              <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                <div style={{ fontSize: "20px", marginBottom: "8px" }}>⏳</div>
                Loading conversations...
              </div>
            )}

            {!loading && filteredConversations.length === 0 && (
              <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>💬</div>
                <p>No conversations found</p>
              </div>
            )}

            {!loading && filteredConversations.map((conversation) => (
              <button
                key={conversation.sender_id}
                onClick={() => setSelectedConversation(conversation.sender_id)}
                style={{
                  width: "100%",
                  padding: "15px 20px",
                  border: "none",
                  borderBottom: "1px solid #f1f3f4",
                  background: selectedConversation === conversation.sender_id ? "#f8f9fa" : "white",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                {conversation.profile_pic_url ? (
                  <img
                    src={conversation.profile_pic_url}
                    alt={conversation.sender_name}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: "#1877f2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "16px",
                      fontWeight: "600",
                    }}
                  >
                    {conversation.sender_name[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {conversation.sender_name}
                    </span>
                    <span style={{ fontSize: "12px", color: "#666" }}>
                      {formatDate(conversation.last_message.timestamp)}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "#666",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {conversation.last_message.message_text}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Message View */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {!selectedConversation ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#666",
                flexDirection: "column",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>💬</div>
              <p>Select a conversation to view messages</p>
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <div
                style={{
                  padding: "20px",
                  borderBottom: "1px solid #dee2e6",
                  background: "#f8f9fa",
                }}
              >
                {(() => {
                  const conversation = conversations.find(c => c.sender_id === selectedConversation);
                  return conversation ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {conversation.profile_pic_url ? (
                        <img
                          src={conversation.profile_pic_url}
                          alt={conversation.sender_name}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: "#1877f2",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "14px",
                            fontWeight: "600",
                          }}
                        >
                          {conversation.sender_name[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#333" }}>
                          {conversation.sender_name}
                        </h3>
                        <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
                          {conversation.page_name}
                        </p>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      display: "flex",
                      marginBottom: "16px",
                      justifyContent: message.is_from_page ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        padding: "12px 16px",
                        borderRadius: "18px",
                        background: message.is_from_page ? "#1877f2" : "#f1f3f4",
                        color: message.is_from_page ? "white" : "#333",
                      }}
                    >
                      <p style={{ margin: "0 0 4px 0", fontSize: "14px", lineHeight: "1.4" }}>
                        {message.message_text}
                      </p>
                      <div
                        style={{
                          fontSize: "11px",
                          opacity: 0.7,
                          textAlign: "right",
                        }}
                      >
                        {formatDate(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Input */}
              <div
                style={{
                  padding: "20px",
                  borderTop: "1px solid #dee2e6",
                  background: "#f8f9fa",
                }}
              >
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    disabled={sending}
                    style={{
                      flex: 1,
                      padding: "12px",
                      border: "1px solid #dee2e6",
                      borderRadius: "8px",
                      fontSize: "14px",
                      resize: "none",
                      minHeight: "40px",
                      maxHeight: "100px",
                      fontFamily: "inherit",
                    }}
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || sending}
                    style={{
                      padding: "12px 20px",
                      background: replyText.trim() && !sending ? "#1877f2" : "#dee2e6",
                      color: replyText.trim() && !sending ? "white" : "#6c757d",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: replyText.trim() && !sending ? "pointer" : "not-allowed",
                    }}
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
                  <strong>Note:</strong> Message sending is currently in development. Replies will be available soon.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
