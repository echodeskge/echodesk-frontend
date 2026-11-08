import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import axios from "@/api/axios";
import {
  isStaffOrSuperuser,
  profileHasPermission,
  type ProfilePermissionFields,
} from "@/lib/backendPermissions";

/** platform + platform conversation id + account id: how the backend keys a social conversation. */
export interface ConversationKey {
  platform: string;
  conversation_id: string;
  account_id: string;
}

export interface ConversationTicket {
  id: number;
  /** null when the viewer can't see the ticket's board */
  title: string | null;
  /** column (status) name; null when the board is hidden from the viewer */
  column?: string | null;
  platform?: string | null;
  created_at?: string | null;
}

export const conversationTicketKeys = {
  all: ["social", "conversationTickets"] as const,
  list: (key: ConversationKey) =>
    [...conversationTicketKeys.all, key.platform, key.account_id, key.conversation_id] as const,
};

/** Tickets linked to one social conversation. */
export function useConversationTickets(key: ConversationKey | null, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: key ? conversationTicketKeys.list(key) : conversationTicketKeys.all,
    queryFn: async () => {
      const response = await axios.get("/api/social/conversations/tickets/", { params: key });
      const data = response.data as ConversationTicket[] | { results?: ConversationTicket[] };
      return Array.isArray(data) ? data : data?.results ?? [];
    },
    enabled: !!key && (options.enabled ?? true),
    staleTime: 30_000,
    retry: 1,
  });
}

/** Create (or return the already linked) ticket for a social conversation. */
export function useCreateConversationTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (key: ConversationKey) => {
      const response = await axios.post("/api/social/conversations/create-ticket/", key);
      return response.data as { ticket: ConversationTicket; created?: boolean };
    },
    onSuccess: (_data, key) => {
      queryClient.invalidateQueries({ queryKey: conversationTicketKeys.list(key) });
    },
  });
}

type ProfileWithFeatures = ProfilePermissionFields & { feature_keys?: unknown };

function featureKeyList(featureKeys: unknown): string[] {
  let keys: unknown = featureKeys;
  if (typeof keys === "string") {
    try {
      keys = JSON.parse(keys);
    } catch {
      return [];
    }
  }
  return Array.isArray(keys) ? keys.filter((k): k is string => typeof k === "string") : [];
}

/** "Create ticket" needs the ticket_management feature and the create-tickets permission (staff bypass). */
export function canCreateTickets(profile: ProfileWithFeatures | null | undefined): boolean {
  if (!profile) return false;
  if (!featureKeyList(profile.feature_keys).includes("ticket_management")) return false;
  return isStaffOrSuperuser(profile) || profileHasPermission(profile, "create_tickets");
}
