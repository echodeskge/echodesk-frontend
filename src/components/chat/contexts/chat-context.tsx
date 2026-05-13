"use client"

import { createContext, useReducer, useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

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
  platforms = ['facebook', 'instagram', 'whatsapp', 'email', 'widget'],
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
  onChatRemoved,
  selectedChatId: externalSelectedChatId,
  setSelectedChatId: externalSetSelectedChatId,
}: {
  chatsData: ChatType[]
  children: ReactNode
  onChatSelected?: (chat: ChatType) => void
  onChatRemoved?: (chatId: string) => void
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
  const queryClient = useQueryClient()

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

  // Tracks chats that received WebSocket messages while they were NOT the
  // active chat. Those entries' React Query cache for ['chatMessages', id]
  // may be stale (or warmed with pre-WS data via hover-prefetch), so the next
  // time the user opens that chat we force a refetch with staleTime:0 to
  // surface the latest server-side state. Cleared after the reload completes.
  const dirtyChatsRef = useRef<Set<string>>(new Set())

  // Mirror of the current selected chat id, kept up-to-date via useEffect so
  // the WS dispatcher (bound once in the effect below) can read it without
  // re-binding on every selection change.
  const selectedChatIdRef = useRef<string | null>(null)

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

  // Keep selectedChatIdRef in sync so the WS dispatcher (below) can compare
  // the incoming chatId against the currently-selected chat without having
  // to be re-bound every time the selection changes.
  useEffect(() => {
    selectedChatIdRef.current = chatState.selectedChat?.id ?? null
  }, [chatState.selectedChat?.id])

  // Set up the incoming message handler ref for WebSocket integration
  useEffect(() => {
    if (onAddIncomingMessageRef) {
      onAddIncomingMessageRef.current = (chatId: string, message: MessageType, senderName?: string) => {
        // Mark the chat dirty + invalidate its React Query cache only when
        // the message arrived for a chat the user isn't currently looking at.
        // The active chat is kept fresh by the reducer's selectedChat update,
        // so flagging it here would force an unnecessary refetch on the next
        // re-select of the same chat.
        if (chatId !== selectedChatIdRef.current) {
          dirtyChatsRef.current.add(chatId)
          queryClient.invalidateQueries({ queryKey: ['chatMessages', chatId] })
        }
        dispatch({ type: "addIncomingMessage", chatId, message, senderName })
      }
    }
    return () => {
      if (onAddIncomingMessageRef) {
        onAddIncomingMessageRef.current = null
      }
    }
  }, [onAddIncomingMessageRef, queryClient])

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
    onChatRemoved?.(chatId)
  }

  // Handlers for chat actions
  const handleSetUnreadCount = () => {
    dispatch({ type: "setUnreadCount" })
  }

  // Handle loading messages for a chat (lazy loading) - uses query cache
  const handleLoadChatMessages = useCallback(async (chatId: string) => {
    if (!loadChatMessages) return

    // Find the chat - check both chatState.chats and chatsData prop to handle race condition
    // where the useEffect hasn't synced chatsData to chatState yet
    const chatFromState = chatState.chats.find(c => c.id === chatId)
    const chatFromProps = chatsData.find(c => c.id === chatId)

    // A "dirty" chat is one that received WS messages while it was inactive.
    // For those we always force a fresh fetch — both prefetch-on-hover and a
    // previously-loaded state can otherwise hand us pre-WS data that
    // updateChatMessages would clobber the latest reducer state with.
    const isDirty = dirtyChatsRef.current.has(chatId)

    // Skip if already loaded — but only when NOT dirty.
    if (!isDirty && (chatFromState?.messagesLoaded || chatFromProps?.messagesLoaded)) return

    setLoadingMessages(true)
    try {
      // Use fetchQuery to benefit from prefetch cache. For dirty chats use
      // staleTime:0 so the cached pre-WS response is bypassed.
      const messages = await queryClient.fetchQuery({
        queryKey: ['chatMessages', chatId],
        queryFn: () => loadChatMessages(chatId),
        staleTime: isDirty ? 0 : 2 * 60 * 1000,
      })
      dispatch({ type: "updateChatMessages", chatId, messages })
      dirtyChatsRef.current.delete(chatId)
    } catch (error) {
      console.error("Failed to load chat messages:", error)
    } finally {
      setLoadingMessages(false)
    }
  }, [loadChatMessages, chatState.chats, chatsData, queryClient])

  // Prefetch messages for a chat on hover (fire-and-forget)
  const handlePrefetchChatMessages = useCallback((chatId: string) => {
    if (!loadChatMessages) return

    // Skip if already loaded in state
    const chatFromState = chatState.chats.find(c => c.id === chatId)
    if (chatFromState?.messagesLoaded) return

    queryClient.prefetchQuery({
      queryKey: ['chatMessages', chatId],
      queryFn: () => loadChatMessages(chatId),
      staleTime: 2 * 60 * 1000,
    })
  }, [loadChatMessages, chatState.chats, queryClient])

  // Force reload messages for a chat (e.g., after sending an email where there's no WebSocket echo).
  // Go through fetchQuery so in-flight requests for the same chat dedupe — otherwise
  // a concurrent handleLoadChatMessages call would issue a duplicate network request.
  const handleReloadChatMessages = useCallback(async (chatId: string) => {
    if (!loadChatMessages) return
    try {
      const messages = await queryClient.fetchQuery({
        queryKey: ['chatMessages', chatId],
        queryFn: () => loadChatMessages(chatId),
        staleTime: 0, // Force refetch, but dedupe with in-flight queries of the same key
      })
      if (messages.length > 0) {
        dispatch({ type: "updateChatMessages", chatId, messages })
      }
    } catch (error) {
      console.error("Failed to reload chat messages:", error)
    }
  }, [loadChatMessages, queryClient])

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
    // Trigger lazy loading when:
    //  - messages haven't been loaded yet, OR
    //  - this chat is dirty (received WS messages while inactive — we want
    //    a fresh server view on re-entry so file/burst payloads are reflected).
    // handleLoadChatMessages itself decides the staleTime based on dirty state.
    // For already-loaded, non-dirty chats we rely on the WebSocket push for
    // new messages — re-fetching on every re-select caused duplicate network requests.
    const isDirty = dirtyChatsRef.current.has(chat.id)
    if ((isDirty || !chat.messagesLoaded) && loadChatMessages) {
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
        prefetchChatMessages: handlePrefetchChatMessages,
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
