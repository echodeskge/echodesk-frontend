import type { FileType } from "@/types"
import type { z } from "zod"
import type { FilesUploaderSchema } from "@/components/chat/schemas/files-uploader-schema"
import type { ImagesUploaderSchema } from "@/components/chat/schemas/images-uploader-schema"
import type { TextMessageSchema } from "@/components/chat/schemas/text-message-schema"

export type AssignmentTabType = 'all' | 'assigned'

// Reply state for replying to a specific message
export interface ReplyingToType {
  messageId: string // The message_id (Facebook mid)
  text?: string // Preview text of the message being replied to
  senderName?: string // Name of the sender
}

export interface ChatContextType {
  chatState: ChatStateType
  isChatSidebarOpen: boolean
  setIsChatSidebarOpen: (val: boolean) => void
  handleSelectChat: (chat: ChatType) => void
  handleAddTextMessage: (text: string) => void
  handleAddImagesMessage: (images: FileType[]) => void
  handleAddFilesMessage: (files: FileType[]) => void
  handleSetUnreadCount: () => void
  onChatSelected?: (chat: ChatType) => void
  // Search functionality
  chatListSearchQuery: string
  setChatListSearchQuery: (query: string) => void
  messageSearchQuery: string
  setMessageSearchQuery: (query: string) => void
  // Assignment tab functionality
  assignmentTab: AssignmentTabType
  setAssignmentTab: (tab: AssignmentTabType) => void
  assignedChatIds: Set<string>
  assignmentEnabled: boolean
  // Lazy loading
  loadingMessages: boolean
  loadChatMessages?: (chatId: string) => Promise<void>
  isInitialLoading: boolean
  // Platform filter
  platforms: string[]
  // Email folder filter
  selectedEmailFolder: string
  setSelectedEmailFolder: (folder: string) => void
  // Reply functionality
  replyingTo: ReplyingToType | null
  setReplyingTo: (reply: ReplyingToType | null) => void
  // Infinite scroll pagination
  fetchNextPage?: () => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  // Search loading state
  isSearchLoading?: boolean
  // Raw chats data (for race condition handling during state sync)
  rawChatsData?: ChatType[]
  // History/Archive view mode
  showArchived: boolean
  setShowArchived: (show: boolean) => void
}

export type ChatStatusType = "READ" | "DELIVERED" | "SENT" | null

export interface MessageType {
  id: string
  senderId: string
  text?: string
  images?: FileType[]
  files?: FileType[]
  voiceMessage?: FileType
  status: string
  createdAt: Date
  // Platform-specific message ID (e.g., Facebook mid, WhatsApp message_id)
  platformMessageId?: string
  // Sender name (for display in reply preview)
  senderName?: string
  // Message source tracking (all platforms)
  source?: 'echodesk' | 'cloud_api' | 'business_app' | 'synced' | 'facebook_app' | 'messenger_app' | 'instagram_app'
  isEcho?: boolean
  // Staff member who sent this message via EchoDesk
  sentByName?: string
  isEdited?: boolean
  editedAt?: Date
  originalText?: string
  isRevoked?: boolean
  revokedAt?: Date
  // Email fields
  bodyHtml?: string
  subject?: string
  platform?: 'facebook' | 'instagram' | 'whatsapp' | 'email'
  // Reply fields (Facebook Messenger)
  replyToMessageId?: string
  replyToId?: number
  replyToText?: string
  replyToSenderName?: string
  // Reaction fields (Facebook Messenger)
  reaction?: string
  reactionEmoji?: string
  reactedBy?: string
  reactedAt?: Date
}

export type NewMessageType = Omit<
  MessageType,
  "id" | "senderId" | "createdAt" | "images" | "files" | "voiceMessage"
> & {
  images?: FileType[]
  files?: FileType[]
  voiceMessage?: FileType
}

export interface UserType {
  id: string
  name: string
  avatar?: string
  status: string
}

export interface LastMessageType {
  content: string
  createdAt: Date
}

export interface ChatType {
  id: string
  lastMessage: LastMessageType
  name: string
  avatar?: string
  status?: string
  messages: MessageType[]
  users: UserType[]
  typingUsers: UserType[]
  unreadCount?: number
  platform?: "facebook" | "instagram" | "whatsapp" | "email"
  // Lazy loading - if true, messages need to be fetched when chat is selected
  messagesLoaded?: boolean
}

export interface ChatStateType {
  chats: ChatType[]
  selectedChat?: ChatType | null
}

export type ChatActionType =
  | {
      type: "addTextMessage"
      text: string
    }
  | {
      type: "addImagesMessage"
      images: FileType[]
    }
  | {
      type: "addFilesMessage"
      files: FileType[]
    }
  | {
      type: "setUnreadCount"
    }
  | {
      type: "selectChat"
      chat: ChatType
    }
  | {
      type: "updateChats"
      chats: ChatType[]
    }
  | {
      type: "updateChatMessages"
      chatId: string
      messages: MessageType[]
    }

export type TextMessageFormType = z.infer<typeof TextMessageSchema>

export type FilesUploaderFormType = z.infer<typeof FilesUploaderSchema>

export type ImagesUploaderFormType = z.infer<typeof ImagesUploaderSchema>
