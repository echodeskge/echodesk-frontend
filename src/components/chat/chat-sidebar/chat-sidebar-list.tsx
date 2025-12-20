"use client"

import { useMemo, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatSidebarItem } from "./chat-sidebar-item"

const MESSAGES_LOADED_KEY = 'echodesk_messages_loaded'

export function ChatSidebarList() {
  const { chatState, chatListSearchQuery, assignmentTab, assignedChatIds, assignmentEnabled, isInitialLoading } = useChatContext()

  // Check sessionStorage synchronously - has this session ever loaded messages?
  const hasEverLoaded = typeof window !== 'undefined' && sessionStorage.getItem(MESSAGES_LOADED_KEY) === 'true'

  // Mark as loaded when we have chats
  useEffect(() => {
    if (chatState.chats.length > 0 && typeof window !== 'undefined') {
      sessionStorage.setItem(MESSAGES_LOADED_KEY, 'true')
    }
  }, [chatState.chats.length])

  // Only show loading on the very first load (not on navigation)
  // If we've ever loaded data in this session, don't show the loading spinner
  const showLoading = isInitialLoading && chatState.chats.length === 0 && !hasEverLoaded

  // If we've loaded before but currently have no data (component remounted), show a minimal loading state
  // This prevents showing "No conversations yet" while data is being refetched after navigation
  const isRefetching = chatState.chats.length === 0 && hasEverLoaded

  // Filter chats based on search query and assignment tab
  const filteredChats = useMemo(() => {
    let chats = chatState.chats

    // First filter by assignment tab if assignment mode is enabled
    if (assignmentEnabled && assignmentTab === 'assigned') {
      chats = chats.filter((chat) => assignedChatIds.has(chat.id))
    }

    // Then filter by search query
    if (!chatListSearchQuery.trim()) {
      return chats
    }

    const query = chatListSearchQuery.toLowerCase().trim()
    return chats.filter((chat) => {
      // Search by chat name
      if (chat.name.toLowerCase().includes(query)) return true
      // Search by last message content
      if (chat.lastMessage?.content?.toLowerCase().includes(query)) return true
      // Search by platform
      if (chat.platform?.toLowerCase().includes(query)) return true
      return false
    })
  }, [chatState.chats, chatListSearchQuery, assignmentTab, assignedChatIds, assignmentEnabled])

  // Determine the empty state message based on context
  const getEmptyMessage = () => {
    if (chatListSearchQuery) {
      return "No conversations found"
    }
    if (assignmentEnabled && assignmentTab === 'assigned') {
      return "No assigned conversations"
    }
    return "No conversations yet"
  }

  // Adjust height based on whether tabs are shown
  const scrollHeight = assignmentEnabled
    ? "h-[calc(100vh-8.5rem)] md:h-[calc(100vh-15.5rem)]"
    : "h-[calc(100vh-5.5rem)] md:h-[calc(100vh-12.5rem)]"

  // Show loading state only when we have no data yet
  if (showLoading) {
    return (
      <ScrollArea className={scrollHeight}>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Loading conversations...</p>
        </div>
      </ScrollArea>
    )
  }

  // When refetching after navigation, show a subtle spinner instead of empty state
  if (isRefetching) {
    return (
      <ScrollArea className={scrollHeight}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea className={scrollHeight}>
      <ul className="p-3 space-y-1.5">
        {filteredChats.length === 0 ? (
          <li className="text-center text-muted-foreground py-8">
            {getEmptyMessage()}
          </li>
        ) : (
          filteredChats.map((chat) => {
            return <ChatSidebarItem key={chat.id} chat={chat} />
          })
        )}
      </ul>
    </ScrollArea>
  )
}
