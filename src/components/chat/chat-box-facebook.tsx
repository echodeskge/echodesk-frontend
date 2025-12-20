"use client"

import { useCallback, useMemo, useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import type { UserType } from "@/components/chat/types"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { useTypingWebSocket } from "@/hooks/useTypingWebSocket"
import { Card } from "@/components/ui/card"
import { ChatBoxContent } from "./chat-box-content"
import { ChatBoxFooterFacebook } from "./chat-box-footer-facebook"
import { ChatBoxHeader } from "./chat-box-header"
import { ChatBoxNotFound } from "./chat-box-not-found"
import { ChatMessageSearch } from "./chat-message-search"
import { TypingIndicator } from "./typing-indicator"

interface ChatBoxFacebookProps {
  user: UserType;
  onMessageSent?: () => void;
  isConnected?: boolean;
}

export function ChatBoxFacebook({ user, onMessageSent, isConnected = false }: ChatBoxFacebookProps) {
  const { chatState, messageSearchQuery, setMessageSearchQuery, loadingMessages, loadChatMessages, isInitialLoading } = useChatContext()
  const params = useParams()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)

  const chatIdParam = params.id?.[0] // Get the chat ID from route params

  const chat = useMemo(() => {
    if (chatIdParam) {
      // Find the chat by ID
      return chatState.chats.find((c) => c.id === chatIdParam)
    }

    // Return null if not found
    return null
  }, [chatState.chats, chatIdParam])

  // Trigger lazy loading when chat is selected via URL navigation
  useEffect(() => {
    if (chat && !chat.messagesLoaded && loadChatMessages) {
      loadChatMessages(chat.id)
    }
  }, [chat, loadChatMessages])

  // Calculate matching message indices
  const matchingMessageIndices = useMemo(() => {
    if (!chat || !messageSearchQuery.trim()) return []
    const query = messageSearchQuery.toLowerCase().trim()
    return chat.messages
      .map((message, index) => ({ message, index }))
      .filter(({ message }) => message.text?.toLowerCase().includes(query))
      .map(({ index }) => index)
  }, [chat, messageSearchQuery])

  // Listen for typing indicators
  const { typingUsers } = useTypingWebSocket({
    conversationId: chat?.id,
  })

  const handleSearchClick = useCallback(() => {
    setIsSearchOpen(true)
  }, [])

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false)
    setMessageSearchQuery("")
    setCurrentMatchIndex(0)
  }, [setMessageSearchQuery])

  const handlePrevMatch = useCallback(() => {
    setCurrentMatchIndex((prev) =>
      prev > 0 ? prev - 1 : matchingMessageIndices.length - 1
    )
  }, [matchingMessageIndices.length])

  const handleNextMatch = useCallback(() => {
    setCurrentMatchIndex((prev) =>
      prev < matchingMessageIndices.length - 1 ? prev + 1 : 0
    )
  }, [matchingMessageIndices.length])

  // If initial loading, show loading state
  if (isInitialLoading) {
    return (
      <Card className="grow grid place-items-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading conversations...</p>
        </div>
      </Card>
    )
  }

  // If chat ID exists but no matching chat is found, show a not found UI
  if (!chat) return <ChatBoxNotFound />

  // Show loading state while messages are being fetched for this specific chat
  const showLoading = loadingMessages || (!chat.messagesLoaded && chat.messages.length === 0)

  return (
    <Card className="grow grid">
      <ChatBoxHeader chat={chat} isConnected={isConnected} onSearchClick={handleSearchClick} />
      {isSearchOpen && (
        <ChatMessageSearch
          onClose={handleSearchClose}
          matchCount={matchingMessageIndices.length}
          currentMatchIndex={currentMatchIndex}
          onPrevMatch={handlePrevMatch}
          onNextMatch={handleNextMatch}
        />
      )}

      {showLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          </div>
        </div>
      ) : (
        <ChatBoxContent
          user={user}
          chat={chat}
          highlightedMessageIndex={matchingMessageIndices[currentMatchIndex]}
        />
      )}

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
