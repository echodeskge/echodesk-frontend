"use client"

import { useMemo, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Square } from "lucide-react"

import type { ChatType } from "@/components/chat/types"
import { useAuth } from "@/contexts/AuthContext"
import {
  useAssignmentStatus,
  useEndSession,
} from "@/hooks/api/useSocial"
import { usePrefetchConversations, usePrefetchUnreadCount } from "@/hooks/api/usePrefetchSocial"
import { parseChatId } from "@/lib/chatUtils"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"

import { CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChatHeaderActions } from "./chat-header-actions"
import { ChatHeaderInfo } from "./chat-header-info"
import { ChatMenuButton } from "./chat-menu-button"
import { useChatContext } from "./hooks/use-chat-context"

interface ChatBoxHeaderProps {
  chat: ChatType
  isConnected?: boolean
  onSearchClick?: () => void
}

// parseChatId imported from shared utility

export function ChatBoxHeader({ chat, isConnected = false, onSearchClick }: ChatBoxHeaderProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { toast } = useToast()
  const t = useTranslations("chat")

  // Determine base route from current pathname
  const getBaseRoute = useCallback(() => {
    if (pathname.startsWith('/email/messages')) return '/email/messages'
    if (pathname.startsWith('/social/messages')) return '/social/messages'
    return '/messages'
  }, [pathname])

  // Parse chat ID for assignment operations
  const chatInfo = useMemo(() => {
    if (!chat?.id) return null
    return parseChatId(chat.id, chat.platform)
  }, [chat?.id, chat?.platform])

  // Get assignment status for this chat
  const { data: assignmentStatusData } = useAssignmentStatus(
    chatInfo?.platform || 'facebook',
    chatInfo?.conversationId || '',
    chatInfo?.accountId || '',
    { enabled: !!chatInfo }
  )

  // End session mutation
  const endSession = useEndSession()

  // Prefetch handlers — warm caches before the user clicks End Session
  const prefetchAssignedConversations = usePrefetchConversations('assigned')
  const prefetchUnread = usePrefetchUnreadCount()
  const handleEndSessionHover = useCallback(() => {
    prefetchAssignedConversations()
    prefetchUnread()
  }, [prefetchAssignedConversations, prefetchUnread])

  // Assignment state
  const assignmentEnabled = assignmentStatusData?.settings?.chat_assignment_enabled ?? false
  const assignment = assignmentStatusData?.assignment
  const isAssignedToMe = assignment?.assigned_user === user?.id
  const isInSession = assignment?.status === 'in_session'

  // Show end session button if: assignment mode ON, assigned to me, and in active session
  // Don't show if status is 'completed' (waiting for rating)
  const showEndSessionButton = assignmentEnabled && isAssignedToMe && isInSession

  const { setSelectedChatId, handleRemoveChat } = useChatContext()

  // Handle end session
  const handleEndSession = () => {
    if (!chatInfo) return

    // Immediately (before waiting for the server) clear the chat from the
    // sidebar, deselect it, and drop its ID from the URL. The mutation
    // still runs in the background via endSession.mutate.
    handleRemoveChat(chat.id)
    setSelectedChatId(null)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search).toString()
      const newUrl = getBaseRoute() + (params ? `?${params}` : '')
      window.history.replaceState(null, '', newUrl)
    }

    endSession.mutate(
      {
        platform: chatInfo.platform,
        conversation_id: chatInfo.conversationId,
        account_id: chatInfo.accountId,
      },
      {
        onSuccess: () => {
          toast({
            title: t("sessionEnded"),
            description: t("movedToHistory"),
          })
        },
      }
    )
  }

  return (
    <CardHeader className="flex flex-row items-center space-y-0 gap-x-1.5 py-3 border-b border-border">
      <ChatMenuButton isIcon />
      <ChatHeaderInfo chat={chat} />

      {/* End Session Button - shown when in active session */}
      {showEndSessionButton && (
        <Button
          variant="destructive"
          size="sm"
          onClick={handleEndSession}
          onMouseEnter={handleEndSessionHover}
          disabled={endSession.isPending}
          className="ml-auto mr-2"
        >
          <Square className="size-4 mr-2" />
          {endSession.isPending ? "Ending..." : "End Session"}
        </Button>
      )}

      <ChatHeaderActions isConnected={isConnected} chat={chat} onSearchClick={onSearchClick} />
    </CardHeader>
  )
}
