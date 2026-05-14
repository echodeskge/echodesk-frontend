import type { MessageType } from "@/components/chat/types";

export type BetaPlatform = "facebook" | "instagram" | "whatsapp" | "email" | "widget";

export interface ConversationRow {
  id: string; // platform-prefixed id (e.g. `fb_<page>_<sender>`)
  platform: BetaPlatform;
  accountId: string;
  conversationKey: string;
  name: string;
  avatar?: string;
  lastMessage: { content: string; createdAt: string } | null;
  unreadCount: number;
  // Widget-only session metadata; carried here (vs in a separate slice) so
  // the sidebar can dim closed sessions without an extra lookup.
  sessionEndedAt?: string | null;
  sessionEndedBy?: "visitor" | "agent" | "timeout" | null;
}

export interface ChatAssignmentSlice {
  assignedUserId: number | null;
  assignedUserName: string | null;
  status: "active" | "in_session" | "completed" | null;
  sessionStartedAt: string | null;
  sessionEndedAt: string | null;
}

export interface ArchiveMeta {
  archivedAt: string;
  byUserId: number | null;
}

export type WsState = "idle" | "connecting" | "open" | "reconnecting" | "down";
export type BootstrapState = "pending" | "loading" | "ready" | "error";

export interface MessagesBetaState {
  conversations: ConversationRow[];
  messagesByChatId: Record<string, MessageType[]>;
  selectedChatId: string | null;
  unreadByChatId: Record<string, number>;
  /** chatId → who currently owns the conversation. `null` = unassigned. */
  assignmentByChatId: Record<string, ChatAssignmentSlice | null>;
  /** chatId → archive meta. Absent or null = active inbox. */
  archivedByChatId: Record<string, ArchiveMeta | null>;
  /** chatId → ISO timestamp of last server-acked read (for our outbound msgs) */
  readWatermarkByChatId: Record<string, string | null>;
  /** chatId set — true if we've already fetched this thread's messages */
  messagesLoaded: Record<string, boolean>;
  wsState: WsState;
  lastWsActivityAt: number;
  bootstrapState: BootstrapState;
}
