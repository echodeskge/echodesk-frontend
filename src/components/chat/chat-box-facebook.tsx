"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"

import type { UserType } from "@/components/chat/types"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { useTypingWebSocket } from "@/hooks/useTypingWebSocket"
import { Card } from "@/components/ui/card"
import { ChatBoxContent } from "./chat-box-content"
import { ChatBoxFooterFacebook } from "./chat-box-footer-facebook"
import { ChatBoxHeader } from "./chat-box-header"
import { ChatBoxNotFound } from "./chat-box-not-found"
import { TypingIndicator } from "./typing-indicator"

interface ChatBoxFacebookProps {
  user: UserType;
  onMessageSent?: () => void;
  isConnected?: boolean;
}

export function ChatBoxFacebook({ user, onMessageSent, isConnected = false }: ChatBoxFacebookProps) {
  const { chatState } = useChatContext()
  const params = useParams()

  const chatIdParam = params.id?.[0] // Get the chat ID from route params

  const chat = useMemo(() => {
    if (chatIdParam) {
      // Find the chat by ID
      return chatState.chats.find((c) => c.id === chatIdParam)
    }

    // Return null if not found
    return null
  }, [chatState.chats, chatIdParam])

  // Listen for typing indicators
  const { typingUsers } = useTypingWebSocket({
    conversationId: chat?.id,
  })

  // If chat ID exists but no matching chat is found, show a not found UI
  if (!chat) return <ChatBoxNotFound />

  return (
    <Card className="grow grid">
      <ChatBoxHeader chat={chat} isConnected={isConnected} />
      <ChatBoxContent user={user} chat={chat} />

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 pb-2">
          {typingUsers.map((typingUser) => (
            <TypingIndicator key={typingUser.user_id} userName={typingUser.user_name} />
          ))}
        </div>
      )}

      <ChatBoxFooterFacebook onMessageSent={onMessageSent} />
    </Card>
  )
}
