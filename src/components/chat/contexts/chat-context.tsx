"use client"

import { createContext, useReducer, useState, useEffect, useCallback, useMemo } from "react"

import type { FileType } from "@/types"
import type { ReactNode } from "react"
import type { ChatContextType, ChatType, AssignmentTabType } from "@/components/chat/types"

import { ChatReducer } from "@/components/chat/reducers/chat-reducer"
import { useSocialSettings, useMyAssignments } from "@/hooks/api/useSocial"

// Create Chat context
export const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({
  chatsData,
  children,
  onChatSelected,
}: {
  chatsData: ChatType[]
  children: ReactNode
  onChatSelected?: (chat: ChatType) => void
}) {
  // Reducer to manage Chat state
  const [chatState, dispatch] = useReducer(ChatReducer, {
    chats: chatsData,
    selectedChat: null,
  })

  // Sidebar state management
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false)

  // Search state
  const [chatListSearchQuery, setChatListSearchQuery] = useState("")
  const [messageSearchQuery, setMessageSearchQuery] = useState("")

  // Assignment tab state
  const [assignmentTab, setAssignmentTab] = useState<AssignmentTabType>('all')

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

  // Selection handlers
  const handleSelectChat = useCallback((chat: ChatType) => {
    dispatch({ type: "selectChat", chat })
    // Call the optional callback when a chat is selected
    onChatSelected?.(chat)
  }, [onChatSelected])

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
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}
