"use client"

import { useMemo } from "react"
import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatSidebarItem } from "./chat-sidebar-item"

export function ChatSidebarList() {
  const { chatState, chatListSearchQuery } = useChatContext()

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    if (!chatListSearchQuery.trim()) {
      return chatState.chats
    }

    const query = chatListSearchQuery.toLowerCase().trim()
    return chatState.chats.filter((chat) => {
      // Search by chat name
      if (chat.name.toLowerCase().includes(query)) return true
      // Search by last message content
      if (chat.lastMessage?.content?.toLowerCase().includes(query)) return true
      // Search by platform
      if (chat.platform?.toLowerCase().includes(query)) return true
      return false
    })
  }, [chatState.chats, chatListSearchQuery])

  return (
    <ScrollArea className="h-[calc(100vh-5.5rem)] md:h-[calc(100vh-12.5rem)]">
      <ul className="p-3 space-y-1.5">
        {filteredChats.length === 0 ? (
          <li className="text-center text-muted-foreground py-8">
            {chatListSearchQuery ? "No conversations found" : "No conversations yet"}
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
