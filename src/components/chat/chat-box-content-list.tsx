"use client"

import { useEffect, useMemo, useRef } from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import type { ChatType, UserType } from "@/components/chat/types"

import { cn } from "@/lib/utils"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { ScrollBar } from "@/components/ui/scroll-area"
import { MessageBubble } from "./message-bubble"

export function ChatBoxContentList({
  user,
  chat,
}: {
  user: UserType
  chat: ChatType
}) {
  const { chatState, handleSelectChat, handleSetUnreadCount } = useChatContext()
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Synchronize chat selection and scroll to the bottom on updates
  useEffect(() => {
    if (chat && chat !== chatState.selectedChat) {
      handleSelectChat(chat)
    }

    if (!!chat?.unreadCount) {
      handleSetUnreadCount()
    }
  }, [chat, chatState.selectedChat, handleSelectChat, handleSetUnreadCount])

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [chat?.messages])

  // A map of chat users for quick lookup
  const userMap = useMemo(
    () => new Map(chat?.users.map((user: UserType) => [user.id, user])),
    [chat?.users]
  )

  return (
    <ScrollAreaPrimitive.Root
      className="relative h-[calc(100vh-16.5rem)]"
    >
      <ScrollAreaPrimitive.Viewport
        ref={scrollAreaRef}
        className="h-full w-full"
      >
        <ul className="flex flex-col gap-y-1.5 px-6 py-3">
          {chat.messages.map((message) => {
            const sender = userMap.get(message.senderId) as UserType
            const isByCurrentUser = message.senderId === user.id

            return (
              <MessageBubble
                key={message.id}
                sender={sender}
                message={message}
                isByCurrentUser={isByCurrentUser}
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
