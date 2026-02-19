"use client"

import { createContext, useReducer, useState, useEffect, useCallback, useMemo } from "react"

import type { FileType } from "@/types"
import type { ReactNode } from "react"
import type { ChatContextType, ChatType, AssignmentTabType, MessageType, ReplyingToType } from "@/components/chat/types"

import { ChatReducer } from "@/components/chat/reducers/chat-reducer"
import { useSocialSettings, useMyAssignments } from "@/hooks/api/useSocial"

// Create Chat context
export const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({
  chatsData,
  children,
  onChatSelected,
  loadChatMessages,
  isInitialLoading = false,
  platforms = ['facebook', 'instagram', 'whatsapp', 'email'],
  selectedEmailFolder: externalSelectedEmailFolder,
  setSelectedEmailFolder: externalSetSelectedEmailFolder,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isSearchLoading,
  chatListSearchQuery: externalChatListSearchQuery,
  setChatListSearchQuery: externalSetChatListSearchQuery,
  assignmentTab: externalAssignmentTab,
  setAssignmentTab: externalSetAssignmentTab,
}: {
  chatsData: ChatType[]
  children: ReactNode
  onChatSelected?: (chat: ChatType) => void
  loadChatMessages?: (chatId: string) => Promise<MessageType[]>
  isInitialLoading?: boolean
  platforms?: string[]
  selectedEmailFolder?: string
  setSelectedEmailFolder?: (folder: string) => void
  fetchNextPage?: () => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  isSearchLoading?: boolean
  chatListSearchQuery?: string
  setChatListSearchQuery?: (query: string) => void
  assignmentTab?: AssignmentTabType
  setAssignmentTab?: (tab: AssignmentTabType) => void
}) {
  // Reducer to manage Chat state
  const [chatState, dispatch] = useReducer(ChatReducer, {
    chats: chatsData,
    selectedChat: null,
  })

  // Sidebar state management
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false)

  // Search state - use external if provided, otherwise internal
  const [internalChatListSearchQuery, setInternalChatListSearchQuery] = useState("")
  const chatListSearchQuery = externalChatListSearchQuery ?? internalChatListSearchQuery
  const setChatListSearchQuery = externalSetChatListSearchQuery ?? setInternalChatListSearchQuery
  const [messageSearchQuery, setMessageSearchQuery] = useState("")

  // Assignment tab state - use external if provided, otherwise internal
  const [internalAssignmentTab, setInternalAssignmentTab] = useState<AssignmentTabType>('all')
  const assignmentTab = externalAssignmentTab ?? internalAssignmentTab
  const setAssignmentTab = externalSetAssignmentTab ?? setInternalAssignmentTab

  // Email folder filter state - use external if provided, otherwise internal
  const [internalSelectedEmailFolder, setInternalSelectedEmailFolder] = useState<string>('INBOX')
  const selectedEmailFolder = externalSelectedEmailFolder ?? internalSelectedEmailFolder
  const setSelectedEmailFolder = externalSetSelectedEmailFolder ?? setInternalSelectedEmailFolder

  // Lazy loading state
  const [loadingMessages, setLoadingMessages] = useState(false)

  // Reply state
  const [replyingTo, setReplyingTo] = useState<ReplyingToType | null>(null)

  // Fetch social settings and assignments
  const { data: socialSettings } = useSocialSettings()
  const assignmentEnabled = socialSettings?.chat_assignment_enabled ?? false
  const { data: myAssignments } = useMyAssignments({ enabled: assignmentEnabled })

  // Create a set of assigned chat IDs for easy lookup
  const assignedChatIds = useMemo(() => {
    if (!myAssignments) return new Set<string>()
    return new Set(myAssignments.map(a => a.full_conversation_id))
  }, [myAssignments])

  // Sync external chats data changes to internal state
  useEffect(() => {
    dispatch({ type: "updateChats", chats: chatsData })
  }, [chatsData])

  // Handlers for message actions
  const handleAddTextMessage = (text: string) => {
    dispatch({ type: "addTextMessage", text })
  }

  const handleAddImagesMessage = (images: FileType[]) => {
    dispatch({ type: "addImagesMessage", images })
  }

  const handleAddFilesMessage = (files: FileType[]) => {
    dispatch({ type: "addFilesMessage", files })
  }

  // Handlers for chat actions
  const handleSetUnreadCount = () => {
    dispatch({ type: "setUnreadCount" })
  }

  // Handle loading messages for a chat (lazy loading)
  const handleLoadChatMessages = useCallback(async (chatId: string) => {
    if (!loadChatMessages) return

    // Find the chat
    const chat = chatState.chats.find(c => c.id === chatId)
    if (!chat || chat.messagesLoaded) return // Already loaded

    setLoadingMessages(true)
    try {
      const messages = await loadChatMessages(chatId)
      dispatch({ type: "updateChatMessages", chatId, messages })
    } catch (error) {
      console.error("Failed to load chat messages:", error)
    } finally {
      setLoadingMessages(false)
    }
  }, [loadChatMessages, chatState.chats])

  // Selection handlers
  const handleSelectChat = useCallback((chat: ChatType) => {
    dispatch({ type: "selectChat", chat })
    // Call the optional callback when a chat is selected
    onChatSelected?.(chat)
    // Trigger lazy loading if messages not loaded
    if (!chat.messagesLoaded && loadChatMessages) {
      handleLoadChatMessages(chat.id)
    }
  }, [onChatSelected, loadChatMessages, handleLoadChatMessages])

  return (
    <ChatContext.Provider
      value={{
        chatState,
        isChatSidebarOpen,
        setIsChatSidebarOpen,
        handleSelectChat,
        handleAddTextMessage,
        handleAddImagesMessage,
        handleAddFilesMessage,
        handleSetUnreadCount,
        onChatSelected,
        chatListSearchQuery,
        setChatListSearchQuery,
        messageSearchQuery,
        setMessageSearchQuery,
        assignmentTab,
        setAssignmentTab,
        assignedChatIds,
        assignmentEnabled,
        loadingMessages,
        loadChatMessages: handleLoadChatMessages,
        isInitialLoading,
        platforms,
        selectedEmailFolder,
        setSelectedEmailFolder,
        replyingTo,
        setReplyingTo,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isSearchLoading,
        rawChatsData: chatsData,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}
