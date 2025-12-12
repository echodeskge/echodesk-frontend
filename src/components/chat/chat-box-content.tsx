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
    <CardContent className="p-0">
      <ChatBoxContentList
        user={user}
        chat={chat}
        highlightedMessageIndex={highlightedMessageIndex}
      />
    </CardContent>
  )
}
