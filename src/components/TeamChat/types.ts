/**
 * Team Chat Types
 */

export interface TeamChatUser {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  is_online: boolean;
  last_seen?: string;
}

export interface TeamChatMessage {
  id: number;
  conversation_id: number;
  sender: TeamChatUser;
  message_type: 'text' | 'image' | 'file' | 'voice';
  text?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_mime_type?: string;
  voice_duration?: number;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface TeamChatConversation {
  id: number;
  participants: TeamChatUser[];
  other_participant: TeamChatUser | null;
  last_message: TeamChatMessage | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
  messages?: TeamChatMessage[];
}

export interface TeamChatPosition {
  x: number;
  y: number;
}

// WebSocket message types
export interface WSNewMessage {
  type: 'new_message';
  message: TeamChatMessage;
  conversation_id: number;
}

export interface WSTypingIndicator {
  type: 'typing_indicator';
  user_id: number;
  user_name: string;
  is_typing: boolean;
}

export interface WSReadReceipt {
  type: 'read_receipt';
  message_ids: number[];
  read_by: number;
  conversation_id: number;
}

export interface WSUserOnline {
  type: 'user_online';
  user_id: number;
  is_online: boolean;
  user_name: string;
}

export interface WSConnection {
  type: 'connection';
  status: 'connected';
  tenant: string;
  user_id: number;
  online_users: { user_id: number; user_name: string; email: string }[];
}

export type WSMessage = WSNewMessage | WSTypingIndicator | WSReadReceipt | WSUserOnline | WSConnection;
