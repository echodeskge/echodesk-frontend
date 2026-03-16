"use client"

import { useMemo } from "react"

import type { UserType } from "@/components/chat/types"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { Card } from "@/components/ui/card"
import { ChatBoxContent } from "./chat-box-content"
import { ChatBoxFooter } from "./chat-box-footer"
import { ChatBoxHeader } from "./chat-box-header"
import { ChatBoxNotFound } from "./chat-box-not-found"

export function ChatBox({ user }: { user: UserType }) {
  const { chatState, selectedChatId } = useChatContext()

  const chat = useMemo(() => {
    if (selectedChatId) {
      return chatState.chats.find((c) => c.id === selectedChatId)
    }
    return null
  }, [chatState.chats, selectedChatId])

  // If chat ID exists but no matching chat is found, show a not found UI
  if (!chat) return <ChatBoxNotFound />

  return (
    <Card className="grow grid">
      <ChatBoxHeader chat={chat} />
      <ChatBoxContent user={user} chat={chat} />
      <ChatBoxFooter />
    </Card>
  )
}
