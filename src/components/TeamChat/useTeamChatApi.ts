import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/api/axios';
import { teamChatConversationsHideForMeCreate } from '@/api/generated';
import type { TeamChatUser, TeamChatConversation, TeamChatMessage } from './types';

// Query keys
export const teamChatKeys = {
  all: ['teamChat'] as const,
  users: () => [...teamChatKeys.all, 'users'] as const,
  conversations: () => [...teamChatKeys.all, 'conversations'] as const,
  conversation: (id: number) => [...teamChatKeys.conversations(), id] as const,
  conversationWithUser: (userId: number) => [...teamChatKeys.conversations(), 'with', userId] as const,
  unreadCount: () => [...teamChatKeys.all, 'unreadCount'] as const,
};

// Fetch team users
export function useTeamChatUsers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: teamChatKeys.users(),
    queryFn: async (): Promise<TeamChatUser[]> => {
      const response = await axios.get('/api/team-chat/users/');
      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
  });
}

// Fetch conversations
export function useTeamChatConversations(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: teamChatKeys.conversations(),
    queryFn: async (): Promise<TeamChatConversation[]> => {
      const response = await axios.get('/api/team-chat/conversations/');
      return response.data.results || response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  });
}

// Fetch single conversation with messages
export function useTeamChatConversation(id: number | null) {
  return useQuery({
    queryKey: teamChatKeys.conversation(id!),
    queryFn: async (): Promise<TeamChatConversation> => {
      const response = await axios.get(`/api/team-chat/conversations/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Get or create conversation with specific user
export function useTeamChatConversationWithUser(userId: number | null) {
  return useQuery({
    queryKey: teamChatKeys.conversationWithUser(userId!),
    queryFn: async (): Promise<TeamChatConversation> => {
      const response = await axios.get(`/api/team-chat/conversations/with/${userId}/`);
      return response.data;
    },
    enabled: !!userId,
  });
}

// Fetch unread count
export function useTeamChatUnreadCount() {
  return useQuery({
    queryKey: teamChatKeys.unreadCount(),
    queryFn: async (): Promise<number> => {
      const response = await axios.get('/api/team-chat/unread-count/');
      return response.data.count;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Send message mutation
export function useSendTeamChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      recipient_id?: number;
      conversation_id?: number;
      text: string;
      message_type?: string;
      file?: File;
      voice_duration?: number;
    }) => {
      const formData = new FormData();

      if (data.recipient_id) {
        formData.append('recipient_id', data.recipient_id.toString());
      }
      if (data.conversation_id) {
        formData.append('conversation_id', data.conversation_id.toString());
      }
      formData.append('text', data.text);
      formData.append('message_type', data.message_type || 'text');

      if (data.file) {
        formData.append('file', data.file);
      }
      if (data.voice_duration) {
        formData.append('voice_duration', data.voice_duration.toString());
      }

      const response = await axios.post('/api/team-chat/messages/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamChatKeys.conversations() });
    },
  });
}

// Mark conversation as read
export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: number) => {
      const response = await axios.post(`/api/team-chat/conversations/${conversationId}/mark_read/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamChatKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: teamChatKeys.conversations() });
    },
  });
}

// Upload file
export function useUploadTeamChatFile() {
  return useMutation({
    mutationFn: async (data: { file: File; message_type: string; voice_duration?: number }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('message_type', data.message_type);
      if (data.voice_duration) {
        formData.append('voice_duration', data.voice_duration.toString());
      }

      const response = await axios.post('/api/team-chat/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
  });
}

// Clear chat history (deletes messages for everyone)
export function useClearChatHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: number) => {
      const response = await axios.delete(`/api/team-chat/conversations/${conversationId}/clear_history/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamChatKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: teamChatKeys.unreadCount() });
    },
  });
}

// Hide chat for current user only (doesn't affect the other participant)
export function useHideChatForMe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: number) => {
      return teamChatConversationsHideForMeCreate(String(conversationId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamChatKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: teamChatKeys.unreadCount() });
    },
  });
}
