"use client"

import { useEffect, useMemo, useRef } from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import type { ChatType, UserType } from "@/components/chat/types"

import { cn } from "@/lib/utils"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { ScrollBar } from "@/components/ui/scroll-area"
import { MessageBubble } from "./message-bubble"

interface ChatBoxContentListProps {
  user: UserType
  chat: ChatType
  highlightedMessageIndex?: number
}

export function ChatBoxContentList({
  user,
  chat,
  highlightedMessageIndex,
}: ChatBoxContentListProps) {
  const { chatState, handleSelectChat, handleSetUnreadCount, messageSearchQuery } = useChatContext()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Map<number, HTMLLIElement>>(new Map())

  // Synchronize chat selection and scroll to the bottom on updates
  useEffect(() => {
    if (chat && chat !== chatState.selectedChat) {
      handleSelectChat(chat)
    }

    if (!!chat?.unreadCount) {
      handleSetUnreadCount()
    }
  }, [chat, chatState.selectedChat, handleSelectChat, handleSetUnreadCount])

  // Scroll to bottom whenever messages change (only when not searching)
  useEffect(() => {
    if (scrollAreaRef.current && !messageSearchQuery) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [chat?.messages, messageSearchQuery])

  // Scroll to highlighted message when search result changes
  useEffect(() => {
    if (highlightedMessageIndex !== undefined && messageRefs.current.has(highlightedMessageIndex)) {
      const element = messageRefs.current.get(highlightedMessageIndex)
      element?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [highlightedMessageIndex])

  // A map of chat users for quick lookup
  const userMap = useMemo(
    () => new Map(chat?.users.map((user: UserType) => [user.id, user])),
    [chat?.users]
  )

  return (
    <ScrollAreaPrimitive.Root
      className="relative h-full overflow-hidden"
    >
      <ScrollAreaPrimitive.Viewport
        ref={scrollAreaRef}
        className="h-full w-full overflow-y-auto overflow-x-hidden"
      >
        <ul className="flex flex-col gap-y-1.5 px-6 py-3">
          {chat.messages.map((message, index) => {
            const sender = userMap.get(message.senderId) as UserType
            const isByCurrentUser = message.senderId === user.id
            const isHighlighted = index === highlightedMessageIndex

            return (
              <MessageBubble
                key={message.id}
                ref={(el) => {
                  if (el) messageRefs.current.set(index, el)
                }}
                sender={sender}
                message={message}
                isByCurrentUser={isByCurrentUser}
                platform={chat.platform}
                isHighlighted={isHighlighted}
                searchQuery={messageSearchQuery}
              />
            )
          })}
        </ul>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar orientation="vertical" />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}
