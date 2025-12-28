"use client"

import { useMemo } from "react"
import { Square } from "lucide-react"

import type { ChatType } from "@/components/chat/types"
import { useAuth } from "@/contexts/AuthContext"
import {
  useAssignmentStatus,
  useEndSession,
  type ChatAssignmentPlatform,
} from "@/hooks/api/useSocial"

import { CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChatHeaderActions } from "./chat-header-actions"
import { ChatHeaderInfo } from "./chat-header-info"
import { ChatMenuButton } from "./chat-menu-button"

interface ChatBoxHeaderProps {
  chat: ChatType
  isConnected?: boolean
  onSearchClick?: () => void
}

// Helper to parse chat ID into platform, account_id, and conversation_id
function parseChatId(chatId: string, platform?: string) {
  const parts = chatId.split('_')
  const prefix = parts[0]

  // Handle email platform separately (no account_id, just thread_id)
  if (prefix === 'email' || platform === 'email') {
    if (parts.length < 2) return null
    return {
      platform: 'email' as ChatAssignmentPlatform,
      accountId: 'email', // Use 'email' as placeholder since emails don't have account_id
      conversationId: parts.slice(1).join('_'), // thread_id
    }
  }

  // Other platforms require at least 3 parts
  if (parts.length < 3) return null

  const accountId = parts[1]
  const conversationId = parts.slice(2).join('_')

  let parsedPlatform: ChatAssignmentPlatform
  if (platform) {
    parsedPlatform = platform as ChatAssignmentPlatform
  } else if (prefix === 'fb') {
    parsedPlatform = 'facebook'
  } else if (prefix === 'ig') {
    parsedPlatform = 'instagram'
  } else if (prefix === 'wa') {
    parsedPlatform = 'whatsapp'
  } else {
    return null
  }

  return { platform: parsedPlatform, accountId, conversationId }
}

export function ChatBoxHeader({ chat, isConnected = false, onSearchClick }: ChatBoxHeaderProps) {
  const { user } = useAuth()

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

  // Assignment state
  const assignmentEnabled = assignmentStatusData?.settings?.chat_assignment_enabled ?? false
  const assignment = assignmentStatusData?.assignment
  const isAssignedToMe = assignment?.assigned_user === user?.id
  const isInSession = assignment?.status === 'in_session'

  // Show end session button if: assignment mode ON, assigned to me, and in active session
  // Don't show if status is 'completed' (waiting for rating)
  const showEndSessionButton = assignmentEnabled && isAssignedToMe && isInSession

  // Handle end session
  const handleEndSession = () => {
    if (!chatInfo) return
    endSession.mutate({
      platform: chatInfo.platform,
      conversation_id: chatInfo.conversationId,
      account_id: chatInfo.accountId,
    })
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
