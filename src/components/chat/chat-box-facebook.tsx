"use client"

import { useCallback, useMemo, useState, useEffect, useRef } from "react"

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
import { ChatBoxSkeleton, ChatBoxInitialSkeleton } from "./ChatBoxSkeleton"

interface ChatBoxFacebookProps {
  user: UserType;
  onMessageSent?: () => void;
  isConnected?: boolean;
}

export function ChatBoxFacebook({ user, onMessageSent, isConnected = false }: ChatBoxFacebookProps) {
  const { chatState, messageSearchQuery, setMessageSearchQuery, loadingMessages, loadChatMessages, isInitialLoading, rawChatsData, selectedChatId } = useChatContext()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)

  const chatIdParam = selectedChatId

  const chat = useMemo(() => {
    if (chatIdParam) {
      // Find the chat by ID in reducer state first
      const fromState = chatState.chats.find((c) => c.id === chatIdParam)
      if (fromState) return fromState

      // Fallback: check raw chatsData (for race condition during state sync)
      // This handles the case where chatsData updated but useEffect hasn't synced to chatState yet
      return rawChatsData?.find((c) => c.id === chatIdParam) || null
    }

    // Return null if not found
    return null
  }, [chatState.chats, rawChatsData, chatIdParam])

  // Trigger lazy message loading for the selected chat. This must run from
  // here (not only from chat-box-content-list) because when messages haven't
  // loaded yet the skeleton renders in place of ChatBoxContent → its
  // chat-box-content-list never mounts → nothing would trigger the load.
  // Unassigned chats also hide the content/composer — so this top-level
  // effect is the only place that reliably loads messages.
  // fetchQuery with 2-min staleTime dedupes any concurrent calls.
  const loadingTriggeredRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (chat && !chat.messagesLoaded && loadChatMessages) {
      if (loadingTriggeredRef.current.has(chat.id)) return
      loadingTriggeredRef.current.add(chat.id)
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

  // If chat ID exists but no matching chat is found
  // Only show loading skeleton if we're still loading AND don't have the chat yet
  // This prevents showing skeleton when navigating to a chat that's already loaded
  if (!chat) {
    // Still loading - show skeleton
    if (isInitialLoading) {
      return <ChatBoxInitialSkeleton />;
    }
    // Done loading but chat not found - show not found UI
    return <ChatBoxNotFound />
  }

  // Show loading state while messages are being fetched for this specific chat
  const showLoading = loadingMessages || (!chat.messagesLoaded && chat.messages.length === 0)

  return (
    <Card className="grow flex flex-col h-full overflow-hidden">
      <div className="shrink-0">
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
      </div>

      {showLoading ? (
        <div className="flex-1 min-h-0 overflow-auto p-4 space-y-4">
          {/* Message skeletons */}
          <div className="flex items-start gap-2">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
            <div className="space-y-1">
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              <div className="h-16 w-64 bg-muted animate-pulse rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end">
            <div className="h-12 w-48 bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="flex items-start gap-2">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
            <div className="space-y-1">
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              <div className="h-10 w-40 bg-muted animate-pulse rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end">
            <div className="h-20 w-56 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          <ChatBoxContent
            user={user}
            chat={chat}
            highlightedMessageIndex={matchingMessageIndices[currentMatchIndex]}
          />
        </div>
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 pb-2 shrink-0">
          {typingUsers.map((typingUser) => (
            <TypingIndicator key={typingUser.user_id} userName={typingUser.user_name} />
          ))}
        </div>
      )}

      <div className="shrink-0">
        <ChatBoxFooterFacebook onMessageSent={onMessageSent} />
      </div>
    </Card>
  )
}
