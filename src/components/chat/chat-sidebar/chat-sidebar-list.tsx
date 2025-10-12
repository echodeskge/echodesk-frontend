"use client"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatSidebarItem } from "./chat-sidebar-item"

export function ChatSidebarList() {
  const { chatState } = useChatContext()

  const chats = chatState.chats

  return (
    <ScrollArea className="h-[calc(100vh-5.5rem)] md:h-[calc(100vh-12.5rem)]">
      <ul className="p-3 space-y-1.5">
        {chats.map((chat) => {
          return <ChatSidebarItem key={chat.id} chat={chat} />
        })}
      </ul>
    </ScrollArea>
  )
}
