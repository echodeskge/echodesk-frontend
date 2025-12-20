"use client"

import { useMemo } from "react"
import { Loader2 } from "lucide-react"
import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatSidebarItem } from "./chat-sidebar-item"

export function ChatSidebarList() {
  const { chatState, chatListSearchQuery, assignmentTab, assignedChatIds, assignmentEnabled, isInitialLoading } = useChatContext()

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

  // Show loading state while initial data is being fetched
  if (isInitialLoading) {
    return (
      <ScrollArea className={scrollHeight}>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Loading conversations...</p>
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
