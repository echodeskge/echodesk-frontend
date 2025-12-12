"use client"

import type { ChatType } from "@/components/chat/types"

import { CardHeader } from "@/components/ui/card"
import { ChatHeaderActions } from "./chat-header-actions"
import { ChatHeaderInfo } from "./chat-header-info"
import { ChatMenuButton } from "./chat-menu-button"

interface ChatBoxHeaderProps {
  chat: ChatType
  isConnected?: boolean
  onSearchClick?: () => void
}

export function ChatBoxHeader({ chat, isConnected = false, onSearchClick }: ChatBoxHeaderProps) {
  return (
    <CardHeader className="flex flex-row items-center space-y-0 gap-x-1.5 py-3 border-b border-border">
      <ChatMenuButton isIcon />
      <ChatHeaderInfo chat={chat} />
      <ChatHeaderActions isConnected={isConnected} chat={chat} onSearchClick={onSearchClick} />
    </CardHeader>
  )
}
