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
export type AssignmentTab = "all" | "assigned";

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

  // --- PR A: sidebar filter slices ---
  /** Free-text filter applied to the sidebar list (name / lastMessage / platform). Already-debounced upstream. */
  searchQuery: string;
  /** When set, the All/Assigned/Archive selectors narrow to this platform only. */
  platformFilter: BetaPlatform | null;
  /** When true, the sidebar shows the Archive tab data instead of active inbox. */
  showArchived: boolean;
  /** Active tab: "all" or "assigned". Tab control lives in the sidebar; persisted here so URL sync (PR G) can read it. */
  assignmentTab: AssignmentTab;
  /** Cursor for the conversations list pagination — `null` means we're on page 1 / no more pages. */
  nextConversationsPage: number | null;
  /** True while a next-page fetch is in flight (prevents duplicate scrolls firing parallel requests). */
  isFetchingNextPage: boolean;

  // --- PR B: thread slices ---
  /** chatId → true once the full history has been fetched (deeper than the
   *  default lazy-load page). Drives the "Load older messages" button's
   *  visibility + prevents repeat fetches. */
  fullHistoryLoadedByChatId: Record<string, boolean>;
  /** True while the deeper-history fetch is in flight for the selected chat. */
  isLoadingFullHistory: boolean;
  /** Free-text query for the in-thread message search bar. */
  messageSearchQuery: string;

  // --- PR C: composer slices ---
  /** When set, the next send threads through this message_id as a reply
   *  quote. Cleared on chat change + after a successful send. */
  replyingTo: { messageId: string; text?: string; senderName?: string } | null;
}
