"use client"

import type { ChatType, UserType } from "@/components/chat/types"

import { CardContent } from "@/components/ui/card"
import { ChatBoxContentList } from "./chat-box-content-list"

interface ChatBoxContentProps {
  user: UserType
  chat: ChatType
  highlightedMessageIndex?: number
}

export function ChatBoxContent({
  user,
  chat,
  highlightedMessageIndex,
}: ChatBoxContentProps) {
  return (
    <CardContent className="p-0 flex-1 overflow-hidden">
      <ChatBoxContentList
        user={user}
        chat={chat}
        highlightedMessageIndex={highlightedMessageIndex}
      />
    </CardContent>
  )
}
