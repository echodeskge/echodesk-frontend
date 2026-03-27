"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { UserPlus, Clock } from "lucide-react"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { useAuth } from "@/contexts/AuthContext"
import {
  useAssignmentStatus,
  useAssignChat,
  useMessagingWindow,
  type ChatAssignmentPlatform,
} from "@/hooks/api/useSocial"
import { CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TextMessageFormFacebook } from "./text-message-form-facebook"

interface ChatBoxFooterFacebookProps {
  onMessageSent?: () => void;
}

// Helper to parse chat ID into platform, account_id, and conversation_id
function parseChatId(chatId: string, platform?: string) {
  const parts = chatId.split('_')
  const prefix = parts[0]

  // Handle email platform: email_{connection_id}_{thread_id}
  if (prefix === 'email' || platform === 'email') {
    if (parts.length < 3) return null
    return {
      platform: 'email' as ChatAssignmentPlatform,
      accountId: parts[1], // connection_id
      conversationId: parts.slice(2).join('_'), // thread_id
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

export function ChatBoxFooterFacebook({ onMessageSent }: ChatBoxFooterFacebookProps) {
  const { chatState, setAssignmentTab, showArchived, selectedChatId } = useChatContext()
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get chat from context-based selectedChatId
  const chatIdParam = selectedChatId
  const currentChat = useMemo(() => {
    if (chatIdParam) {
      return chatState.chats.find((c) => c.id === chatIdParam)
    }
    return null
  }, [chatState.chats, chatIdParam])

  // Parse chat ID for assignment operations
  const chatInfo = useMemo(() => {
    if (!currentChat?.id) return null
    return parseChatId(currentChat.id, currentChat.platform)
  }, [currentChat?.id, currentChat?.platform])

  // Get assignment status for this chat
  const { data: assignmentStatusData, isLoading: isLoadingStatus } = useAssignmentStatus(
    chatInfo?.platform || 'facebook',
    chatInfo?.conversationId || '',
    chatInfo?.accountId || '',
    { enabled: !!chatInfo }
  )

  // Check 24-hour messaging window for Facebook and Instagram only (WhatsApp allows messaging anytime)
  const isWindowCheckPlatform = chatInfo?.platform === 'facebook' || chatInfo?.platform === 'instagram'
  const { data: messagingWindow } = useMessagingWindow(
    chatInfo?.platform || 'facebook',
    chatInfo?.conversationId || '',
    chatInfo?.accountId || '',
    { enabled: !!chatInfo && isWindowCheckPlatform }
  )

  // Assignment mutation - assigning now automatically starts session
  const assignChat = useAssignChat()

  // Assignment state
  const assignmentEnabled = assignmentStatusData?.settings?.chat_assignment_enabled ?? false
  const assignment = assignmentStatusData?.assignment
  // Only consider assigned if there's actually an assigned user (not just an assignment record)
  const isAssigned = !!assignment?.assigned_user
  const isAssignedToMe = assignment?.assigned_user === user?.id
  const isInSession = assignment?.status === 'in_session'

  // Determine if user can send messages
  // Can send if: assignment mode is OFF, OR (assigned to me AND in active session)
  // 'completed' status means waiting for rating - can't send messages
  // While loading, don't allow sending to prevent race conditions
  const canSendMessages = !isLoadingStatus && (!assignmentEnabled || (isAssignedToMe && isInSession))


  // Handle assign to me (this now automatically starts the session)
  const handleAssign = () => {
    if (!chatInfo) return
    assignChat.mutate(
      {
        platform: chatInfo.platform,
        conversation_id: chatInfo.conversationId,
        account_id: chatInfo.accountId,
      },
      {
        onSuccess: () => {
          if (showArchived) {
            // Navigate to the same chat with ?tab=assigned, without ?view=history
            const base = pathname.startsWith('/email/messages') ? '/email/messages'
              : pathname.startsWith('/social/messages') ? '/social/messages'
              : '/messages';
            const chatPath = chatIdParam ? `${base}/${chatIdParam}` : base;
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('view');
            newParams.set('tab', 'assigned');
            router.push(`${chatPath}?${newParams.toString()}`, { scroll: false });
          } else {
            setAssignmentTab('assigned')
          }
        },
      }
    )
  }

  // Show loading state while fetching assignment status
  if (isLoadingStatus) {
    return (
      <CardFooter className="py-4 border-t border-border">
        <div className="w-full flex items-center justify-center py-4">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </CardFooter>
    )
  }

  // If assignment mode is enabled but user can't send messages, show appropriate UI
  if (assignmentEnabled && !canSendMessages) {
    return (
      <CardFooter className="py-4 border-t border-border">
        <div className="w-full flex flex-col items-center justify-center gap-3 py-4">
          {!isAssigned && (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Assign this chat to yourself to start messaging
              </p>
              <Button onClick={handleAssign} disabled={assignChat.isPending}>
                <UserPlus className="size-4 mr-2" />
                {assignChat.isPending ? "Assigning..." : "Assign to Me"}
              </Button>
            </>
          )}

          {isAssignedToMe && !isInSession && (
            chatInfo?.platform === 'email' ? (
              // For email, allow starting new session immediately (no rating flow)
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Session ended
                </p>
                <Button onClick={handleAssign} disabled={assignChat.isPending}>
                  {assignChat.isPending ? "Starting..." : "Start New Session"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Session ended - waiting for customer rating
              </p>
            )
          )}

          {isAssigned && !isAssignedToMe && (
            <p className="text-sm text-muted-foreground text-center">
              This chat is assigned to {assignment?.assigned_user_name}
            </p>
          )}
        </div>
      </CardFooter>
    )
  }

  // Show 24-hour window expired warning for messaging platforms
  if (isWindowCheckPlatform && messagingWindow && !messagingWindow.window_open) {
    return (
      <CardFooter className="py-4 border-t border-border">
        <div className="w-full flex items-center gap-3 px-3 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Clock className="size-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              24-hour messaging window expired
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              You can only reply within 24 hours of the customer&apos;s last message.
            </p>
          </div>
        </div>
      </CardFooter>
    )
  }

  // Normal footer with message input
  return (
    <CardFooter className="py-3 border-t border-border">
      <TextMessageFormFacebook onMessageSent={onMessageSent} />
    </CardFooter>
  )
}
