"use client";

import { useState, useEffect, useCallback } from "react";
import { FacebookPageConnection } from "@/api/generated/interfaces";
import { socialFacebookSendMessageCreate } from "@/api/generated/api";
import axios from "@/api/axios";

interface UnifiedMessagesManagementProps {
  onBackToDashboard: () => void;
}

interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// Define FacebookMessage interface based on actual usage
interface FacebookMessage {
  id: number;
  message_id: string;
  sender_id: string;
  sender_name?: string;
  profile_pic_url?: string;
  message_text: string;
  timestamp: string;
  is_from_page?: boolean;
  page_name: string;
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

interface InstagramAccountConnection {
  id: number;
  instagram_account_id: string;
  username: string;
  name: string;
  profile_picture_url?: string;
  is_active: boolean;
  created_at: string;
}

interface UnifiedMessage {
  id: string;
  platform: 'facebook' | 'instagram';
  sender_id: string;
  sender_name: string;
  profile_pic_url?: string;
  message_text: string;
  message_type?: string;
  attachment_url?: string;
  timestamp: string;
  is_from_business: boolean;
  page_name?: string;
  conversation_id: string;
  platform_message_id: string;
  account_id: string; // page_id for Facebook, instagram_account_id for Instagram
}

interface UnifiedConversation {
  platform: 'facebook' | 'instagram';
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  profile_pic_url?: string;
  last_message: UnifiedMessage;
  message_count: number;
  account_name: string; // page_name or Instagram username
  account_id: string;
}

export default function UnifiedMessagesManagement({ onBackToDashboard }: UnifiedMessagesManagementProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<UnifiedConversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<UnifiedMessage[]>([]);
  const [facebookPages, setFacebookPages] = useState<FacebookPageConnection[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccountConnection[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<'all' | 'facebook' | 'instagram'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadConnectedAccounts = useCallback(async () => {
    setLoading(true);
    try {
      // Load Facebook pages
      const facebookResponse = await axios.get('/api/social/facebook-pages/');
      const facebookData = facebookResponse.data as PaginatedResponse<FacebookPageConnection>;
      setFacebookPages(facebookData.results || []);

      // Load Instagram accounts
      const instagramResponse = await axios.get('/api/social/instagram-accounts/');
      const instagramData = instagramResponse.data as PaginatedResponse<InstagramAccountConnection>;
      setInstagramAccounts(instagramData.results || []);

    } catch (err: unknown) {
      console.error("Failed to load connected accounts:", err);
      const errorMessage = err && typeof err === 'object' && 'response' in err 
        ? (err as { response: { data: { error?: string } } })?.response?.data?.error || "Failed to load connected accounts"
        : "Failed to load connected accounts";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const allConversations: UnifiedConversation[] = [];

      // Load Facebook conversations
      for (const page of facebookPages) {
        try {
          const response = await axios.get(`/api/social/facebook-messages/?page_id=${page.page_id}`);
          const messagesData = response.data as PaginatedResponse<FacebookMessage>;
          
          // Group by sender to create conversations
          const conversationMap = new Map<string, UnifiedConversation>();
          
          messagesData.results.forEach(message => {
            if (!message.is_from_page) { // Only conversations from users
              const existing = conversationMap.get(message.sender_id);
              const unifiedMessage: UnifiedMessage = {
                id: `facebook_${message.id}`,
                platform: 'facebook',
                sender_id: message.sender_id,
                sender_name: message.sender_name || "Unknown User",
                profile_pic_url: message.profile_pic_url,
                message_text: message.message_text,
                message_type: 'text', // Facebook messages are typically text
                attachment_url: undefined, // Facebook messages don't have this field
                timestamp: message.timestamp,
                is_from_business: message.is_from_page || false,
                page_name: message.page_name,
                conversation_id: message.sender_id,
                platform_message_id: message.message_id,
                account_id: page.page_id
              };

              if (!existing || new Date(message.timestamp) > new Date(existing.last_message.timestamp)) {
                conversationMap.set(message.sender_id, {
                  platform: 'facebook',
                  conversation_id: message.sender_id,
                  sender_id: message.sender_id,
                  sender_name: message.sender_name || "Unknown User",
                  profile_pic_url: message.profile_pic_url,
                  last_message: unifiedMessage,
                  message_count: messagesData.results.filter(m => m.sender_id === message.sender_id).length,
                  account_name: message.page_name,
                  account_id: page.page_id
                });
              }
            }
          });
          
          allConversations.push(...Array.from(conversationMap.values()));
        } catch (err) {
          console.error(`Failed to load Facebook messages for page ${page.page_name}:`, err);
        }
      }

      // Load Instagram conversations
      for (const account of instagramAccounts) {
        try {
          const response = await axios.get(`/api/social/instagram-messages/?account_id=${account.instagram_account_id}`);
          const messagesData = response.data as PaginatedResponse<InstagramMessage>;
          
          // Group by conversation_id to create conversations
          const conversationMap = new Map<string, UnifiedConversation>();
          
          messagesData.results.forEach(message => {
            if (!message.is_from_business) { // Only conversations from users
              const existing = conversationMap.get(message.conversation_id);
              const unifiedMessage: UnifiedMessage = {
                id: `instagram_${message.id}`,
                platform: 'instagram',
                sender_id: message.sender_id,
                sender_name: message.sender_username || "Unknown User",
                profile_pic_url: undefined, // Instagram doesn't provide profile pics in messages
                message_text: message.message_text,
                message_type: message.message_type,
                attachment_url: message.attachment_url,
                timestamp: message.timestamp,
                is_from_business: message.is_from_business,
                conversation_id: message.conversation_id,
                platform_message_id: message.message_id,
                account_id: account.instagram_account_id
              };

              if (!existing || new Date(message.timestamp) > new Date(existing.last_message.timestamp)) {
                conversationMap.set(message.conversation_id, {
                  platform: 'instagram',
                  conversation_id: message.conversation_id,
                  sender_id: message.sender_id,
                  sender_name: message.sender_username || "Unknown User",
                  profile_pic_url: undefined,
                  last_message: unifiedMessage,
                  message_count: messagesData.results.filter(m => m.conversation_id === message.conversation_id).length,
                  account_name: `@${account.username}`,
                  account_id: account.instagram_account_id
                });
              }
            }
          });
          
          allConversations.push(...Array.from(conversationMap.values()));
        } catch (err) {
          console.error(`Failed to load Instagram messages for account @${account.username}:`, err);
        }
      }

      // Sort by last message timestamp
      allConversations.sort((a, b) => 
        new Date(b.last_message.timestamp).getTime() - new Date(a.last_message.timestamp).getTime()
      );

      setConversations(allConversations);
      setLastUpdated(new Date());

    } catch (err: unknown) {
      console.error("Failed to load conversations:", err);
      const errorMessage = err && typeof err === 'object' && 'response' in err 
        ? (err as { response: { data: { error?: string } } })?.response?.data?.error || "Failed to load conversations"
        : "Failed to load conversations";
      if (!silent) setError(errorMessage);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [facebookPages, instagramAccounts]);

  const loadConversationMessages = useCallback(async (silent = false) => {
    if (!selectedConversation) return;

    if (!silent) setLoading(true);
    try {
      let messages: UnifiedMessage[] = [];

      if (selectedConversation.platform === 'facebook') {
        // Load Facebook messages for this conversation
        const response = await axios.get(
          `/api/social/facebook-messages/?page_id=${selectedConversation.account_id}&sender_id=${selectedConversation.sender_id}`
        );
        const messagesData = response.data as PaginatedResponse<FacebookMessage>;
        
        messages = messagesData.results.map(message => ({
          id: `facebook_${message.id}`,
          platform: 'facebook' as const,
          sender_id: message.sender_id,
          sender_name: message.sender_name || "Unknown User",
          profile_pic_url: message.profile_pic_url,
          message_text: message.message_text,
          message_type: 'text', // Facebook messages are typically text
          attachment_url: undefined, // Facebook messages don't have this field
          timestamp: message.timestamp,
          is_from_business: message.is_from_page || false,
          page_name: message.page_name,
          conversation_id: message.sender_id,
          platform_message_id: message.message_id,
          account_id: selectedConversation.account_id
        }));

      } else if (selectedConversation.platform === 'instagram') {
        // Load Instagram messages for this conversation
        const response = await axios.get(
          `/api/social/instagram-messages/?account_id=${selectedConversation.account_id}&conversation_id=${selectedConversation.conversation_id}`
        );
        const messagesData = response.data as PaginatedResponse<InstagramMessage>;
        
        messages = messagesData.results.map(message => ({
          id: `instagram_${message.id}`,
          platform: 'instagram' as const,
          sender_id: message.sender_id,
          sender_name: message.sender_username || "Unknown User",
          profile_pic_url: undefined,
          message_text: message.message_text,
          message_type: message.message_type,
          attachment_url: message.attachment_url,
          timestamp: message.timestamp,
          is_from_business: message.is_from_business,
          conversation_id: message.conversation_id,
          platform_message_id: message.message_id,
          account_id: selectedConversation.account_id
        }));
      }

      // Sort by timestamp
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setConversationMessages(messages);

    } catch (err: unknown) {
      console.error("Failed to load conversation messages:", err);
      const errorMessage = err && typeof err === 'object' && 'response' in err 
        ? (err as { response: { data: { error?: string } } })?.response?.data?.error || "Failed to load conversation messages"
        : "Failed to load conversation messages";
      if (!silent) setError(errorMessage);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedConversation]);

  const sendMessage = async () => {
    if (!selectedConversation || !replyText.trim()) return;

    setSending(true);
    try {
      if (selectedConversation.platform === 'facebook') {
        // Send Facebook message
        await socialFacebookSendMessageCreate({
          recipient_id: selectedConversation.sender_id,
          message: replyText,
          page_id: selectedConversation.account_id
        });
      } else if (selectedConversation.platform === 'instagram') {
        // Send Instagram message
        await axios.post('/api/social/instagram/send-message/', {
          recipient_id: selectedConversation.sender_id,
          message: replyText,
          instagram_account_id: selectedConversation.account_id
        });
      }

      setReplyText("");
      // Reload messages to show the sent message
      await loadConversationMessages();
      
    } catch (err: unknown) {
      console.error("Failed to send message:", err);
      const errorMessage = err && typeof err === 'object' && 'response' in err 
        ? (err as { response: { data: { error?: string } } })?.response?.data?.error || "Failed to send message"
        : "Failed to send message";
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  // Effects
  useEffect(() => {
    loadConnectedAccounts();
  }, [loadConnectedAccounts]);

  useEffect(() => {
    loadAllConversations();
  }, [loadAllConversations]);

  useEffect(() => {
    if (selectedConversation) {
      loadConversationMessages();
    }
  }, [selectedConversation, loadConversationMessages]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const refreshInterval = setInterval(async () => {
      try {
        await loadAllConversations(true); // Silent loading
        if (selectedConversation) {
          await loadConversationMessages(true); // Silent loading
        }
      } catch (err) {
        console.error("Auto-refresh failed:", err);
      }
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, [selectedConversation, autoRefresh, loadAllConversations, loadConversationMessages]);

  const filteredConversations = conversations.filter(conv => {
    if (platformFilter !== 'all' && conv.platform !== platformFilter) return false;
    if (searchQuery && !conv.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !conv.last_message.message_text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={onBackToDashboard}
            style={{
              background: "#f8f9fa",
              border: "1px solid #dee2e6",
              padding: "8px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            ← Back to Dashboard
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "600", color: "#333" }}>
              Messages
            </h1>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666" }}>
              Unified inbox for Facebook and Instagram messages
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          {lastUpdated && (
            <span style={{ fontSize: "12px", color: "#666" }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          background: "#f8d7da",
          color: "#721c24",
          padding: "12px",
          borderRadius: "6px",
          marginBottom: "20px",
          border: "1px solid #f5c6cb"
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "24px", height: "calc(100vh - 200px)" }}>
        {/* Conversations Sidebar */}
        <div style={{ 
          width: "400px", 
          background: "white", 
          borderRadius: "8px", 
          border: "1px solid #e1e5e9",
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Filters */}
          <div style={{ padding: "16px", borderBottom: "1px solid #e1e5e9" }}>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                fontSize: "14px",
                marginBottom: "12px",
                boxSizing: "border-box"
              }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              {(['all', 'facebook', 'instagram'] as const).map(platform => (
                <button
                  key={platform}
                  onClick={() => setPlatformFilter(platform)}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #dee2e6",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                    background: platformFilter === platform ? "#007bff" : "white",
                    color: platformFilter === platform ? "white" : "#333",
                    textTransform: "capitalize"
                  }}
                >
                  {platform === 'all' ? `All (${conversations.length})` : 
                   `${platform} (${conversations.filter(c => c.platform === platform).length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {loading && conversations.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                No conversations found
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={`${conversation.platform}_${conversation.conversation_id}`}
                  onClick={() => setSelectedConversation(conversation)}
                  style={{
                    padding: "16px",
                    borderBottom: "1px solid #f0f0f0",
                    cursor: "pointer",
                    background: selectedConversation?.conversation_id === conversation.conversation_id && 
                               selectedConversation?.platform === conversation.platform ? "#f8f9ff" : "white"
                  }}
                  onMouseEnter={(e) => {
                    if (selectedConversation?.conversation_id !== conversation.conversation_id || 
                        selectedConversation?.platform !== conversation.platform) {
                      e.currentTarget.style.background = "#f8f9fa";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedConversation?.conversation_id !== conversation.conversation_id || 
                        selectedConversation?.platform !== conversation.platform) {
                      e.currentTarget.style.background = "white";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: conversation.platform === 'facebook' ? "#1877f2" : "#E4405F",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "18px",
                      flexShrink: 0
                    }}>
                      {conversation.platform === 'facebook' ? '📘' : '📸'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ 
                          fontWeight: "600", 
                          fontSize: "14px",
                          color: "#333",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1
                        }}>
                          {conversation.sender_name}
                        </span>
                        <span style={{ fontSize: "11px", color: "#666", flexShrink: 0 }}>
                          {formatTimestamp(conversation.last_message.timestamp)}
                        </span>
                      </div>
                      <div style={{ 
                        fontSize: "12px", 
                        color: "#666", 
                        marginBottom: "4px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {conversation.account_name}
                      </div>
                      <div style={{ 
                        fontSize: "13px", 
                        color: "#666",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {conversation.last_message.message_text || `[${conversation.last_message.message_type}]`}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message View */}
        <div style={{ 
          flex: 1, 
          background: "white", 
          borderRadius: "8px", 
          border: "1px solid #e1e5e9",
          display: "flex",
          flexDirection: "column"
        }}>
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div style={{ 
                padding: "16px", 
                borderBottom: "1px solid #e1e5e9",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: selectedConversation.platform === 'facebook' ? "#1877f2" : "#E4405F",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "18px"
                }}>
                  {selectedConversation.platform === 'facebook' ? '📘' : '📸'}
                </div>
                <div>
                  <div style={{ fontWeight: "600", fontSize: "16px", color: "#333" }}>
                    {selectedConversation.sender_name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {selectedConversation.account_name} • {selectedConversation.platform}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ 
                flex: 1, 
                padding: "16px", 
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                {conversationMessages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      display: "flex",
                      justifyContent: message.is_from_business ? "flex-end" : "flex-start"
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        padding: "12px 16px",
                        borderRadius: "18px",
                        background: message.is_from_business ? "#007bff" : "#f1f3f4",
                        color: message.is_from_business ? "white" : "#333",
                        fontSize: "14px",
                        lineHeight: "1.4"
                      }}
                    >
                      {message.message_text || `[${message.message_type}]`}
                      {message.attachment_url && (
                        <div style={{ marginTop: "8px" }}>
                          <a 
                            href={message.attachment_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              color: message.is_from_business ? "white" : "#007bff",
                              textDecoration: "underline"
                            }}
                          >
                            View attachment
                          </a>
                        </div>
                      )}
                      <div style={{ 
                        fontSize: "11px", 
                        opacity: 0.7, 
                        marginTop: "4px" 
                      }}>
                        {formatTimestamp(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div style={{ 
                padding: "16px", 
                borderTop: "1px solid #e1e5e9",
                display: "flex",
                gap: "12px"
              }}>
                <input
                  type="text"
                  placeholder={`Reply to ${selectedConversation.sender_name}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage()}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    border: "1px solid #dee2e6",
                    borderRadius: "24px",
                    fontSize: "14px",
                    outline: "none"
                  }}
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !replyText.trim()}
                  style={{
                    padding: "12px 24px",
                    background: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "24px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: sending || !replyText.trim() ? "not-allowed" : "pointer",
                    opacity: sending || !replyText.trim() ? 0.6 : 1
                  }}
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ 
              flex: 1, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "#666"
            }}>
              Select a conversation to view messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
