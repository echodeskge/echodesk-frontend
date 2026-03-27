"use client"

import { createContext, useReducer, useState, useEffect, useCallback, useMemo, useRef } from "react"

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
  platformFilter: externalPlatformFilter,
  setPlatformFilter: externalSetPlatformFilter,
  selectedEmailFolder: externalSelectedEmailFolder,
  setSelectedEmailFolder: externalSetSelectedEmailFolder,
  selectedEmailConnectionId: externalSelectedEmailConnectionId,
  setSelectedEmailConnectionId: externalSetSelectedEmailConnectionId,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isSearchLoading,
  chatListSearchQuery: externalChatListSearchQuery,
  setChatListSearchQuery: externalSetChatListSearchQuery,
  assignmentTab: externalAssignmentTab,
  setAssignmentTab: externalSetAssignmentTab,
  showArchived: externalShowArchived,
  setShowArchived: externalSetShowArchived,
  onAddIncomingMessageRef,
  selectedChatId: externalSelectedChatId,
  setSelectedChatId: externalSetSelectedChatId,
}: {
  chatsData: ChatType[]
  children: ReactNode
  onChatSelected?: (chat: ChatType) => void
  loadChatMessages?: (chatId: string, initialLoad?: boolean) => Promise<MessageType[]>
  isInitialLoading?: boolean
  platforms?: string[]
  platformFilter?: string | null
  setPlatformFilter?: (platform: string | null) => void
  selectedEmailFolder?: string
  setSelectedEmailFolder?: (folder: string) => void
  selectedEmailConnectionId?: number | null
  setSelectedEmailConnectionId?: (id: number | null) => void
  fetchNextPage?: () => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  isSearchLoading?: boolean
  chatListSearchQuery?: string
  setChatListSearchQuery?: (query: string) => void
  assignmentTab?: AssignmentTabType
  setAssignmentTab?: (tab: AssignmentTabType) => void
  showArchived?: boolean
  setShowArchived?: (show: boolean) => void
  onAddIncomingMessageRef?: React.MutableRefObject<((chatId: string, message: MessageType, senderName?: string) => void) | null>
  selectedChatId?: string | null
  setSelectedChatId?: (id: string | null) => void
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

  // Archive/History view state - use external if provided, otherwise internal
  const [internalShowArchived, setInternalShowArchived] = useState(false)
  const showArchived = externalShowArchived ?? internalShowArchived
  const setShowArchived = externalSetShowArchived ?? setInternalShowArchived

  // Email folder filter state - use external if provided, otherwise internal
  const [internalSelectedEmailFolder, setInternalSelectedEmailFolder] = useState<string>('INBOX')
  const selectedEmailFolder = externalSelectedEmailFolder ?? internalSelectedEmailFolder
  const setSelectedEmailFolder = externalSetSelectedEmailFolder ?? setInternalSelectedEmailFolder

  // Email connection/account filter state - use external if provided, otherwise internal
  const [internalSelectedEmailConnectionId, setInternalSelectedEmailConnectionId] = useState<number | null>(null)
  const selectedEmailConnectionId = externalSelectedEmailConnectionId ?? internalSelectedEmailConnectionId
  const setSelectedEmailConnectionId = externalSetSelectedEmailConnectionId ?? setInternalSelectedEmailConnectionId

  // Lazy loading state
  const [loadingMessages, setLoadingMessages] = useState(false)

  // Full history loading state
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const fullHistoryLoadedChatsRef = useRef<Set<string>>(new Set())

  // Platform filter state - use external if provided, otherwise internal
  const [internalPlatformFilter, setInternalPlatformFilter] = useState<string | null>(null)
  const platformFilter = externalPlatformFilter !== undefined ? externalPlatformFilter : internalPlatformFilter
  const setPlatformFilter = externalSetPlatformFilter ?? setInternalPlatformFilter

  // Selected chat ID state - use external if provided, otherwise internal
  const [internalSelectedChatId, setInternalSelectedChatId] = useState<string | null>(null)
  const selectedChatId = externalSelectedChatId !== undefined ? externalSelectedChatId : internalSelectedChatId
  const setSelectedChatId = externalSetSelectedChatId ?? setInternalSelectedChatId

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

  // Set up the incoming message handler ref for WebSocket integration
  useEffect(() => {
    if (onAddIncomingMessageRef) {
      onAddIncomingMessageRef.current = (chatId: string, message: MessageType, senderName?: string) => {
        dispatch({ type: "addIncomingMessage", chatId, message, senderName })
      }
    }
    return () => {
      if (onAddIncomingMessageRef) {
        onAddIncomingMessageRef.current = null
      }
    }
  }, [onAddIncomingMessageRef])

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

  const handleRemoveChat = (chatId: string) => {
    dispatch({ type: "removeChat", chatId })
  }

  // Handlers for chat actions
  const handleSetUnreadCount = () => {
    dispatch({ type: "setUnreadCount" })
  }

  // Handle loading messages for a chat (lazy loading)
  const handleLoadChatMessages = useCallback(async (chatId: string) => {
    if (!loadChatMessages) return

    // Find the chat - check both chatState.chats and chatsData prop to handle race condition
    // where the useEffect hasn't synced chatsData to chatState yet
    const chatFromState = chatState.chats.find(c => c.id === chatId)
    const chatFromProps = chatsData.find(c => c.id === chatId)
    const chat = chatFromState || chatFromProps

    // Skip if already loaded (check both sources)
    if (chatFromState?.messagesLoaded || chatFromProps?.messagesLoaded) return

    // If chat doesn't exist in either source, still try to load messages
    // This handles the case where we're loading a chat not in the list

    setLoadingMessages(true)
    try {
      const messages = await loadChatMessages(chatId)
      dispatch({ type: "updateChatMessages", chatId, messages })
    } catch (error) {
      console.error("Failed to load chat messages:", error)
    } finally {
      setLoadingMessages(false)
    }
  }, [loadChatMessages, chatState.chats, chatsData])

  // Force reload messages for a chat (e.g., after sending an email where there's no WebSocket echo)
  const handleReloadChatMessages = useCallback(async (chatId: string) => {
    if (!loadChatMessages) return
    try {
      const messages = await loadChatMessages(chatId)
      if (messages.length > 0) {
        dispatch({ type: "updateChatMessages", chatId, messages })
      }
    } catch (error) {
      console.error("Failed to reload chat messages:", error)
    }
  }, [loadChatMessages])

  // Load full message history for a chat (when user clicks "Load History")
  const handleLoadFullHistory = useCallback(async (chatId: string) => {
    if (!loadChatMessages) return
    if (fullHistoryLoadedChatsRef.current.has(chatId)) return // Already loaded

    setIsLoadingHistory(true)
    try {
      const messages = await loadChatMessages(chatId, false) // false = full history
      if (messages.length > 0) {
        dispatch({ type: "updateChatMessages", chatId, messages })
        fullHistoryLoadedChatsRef.current.add(chatId)
      }
    } catch (error) {
      console.error("Failed to load full history:", error)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [loadChatMessages])

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
        handleRemoveChat,
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
        reloadChatMessages: handleReloadChatMessages,
        isInitialLoading,
        platforms,
        platformFilter,
        setPlatformFilter,
        selectedEmailFolder,
        setSelectedEmailFolder,
        selectedEmailConnectionId,
        setSelectedEmailConnectionId,
        replyingTo,
        setReplyingTo,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isSearchLoading,
        rawChatsData: chatsData,
        showArchived,
        setShowArchived,
        loadFullHistory: handleLoadFullHistory,
        isLoadingHistory,
        fullHistoryLoadedChats: fullHistoryLoadedChatsRef.current,
        selectedChatId,
        setSelectedChatId,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}
