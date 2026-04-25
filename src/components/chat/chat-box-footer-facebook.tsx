"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { UserPlus } from "lucide-react"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { useAuth } from "@/contexts/AuthContext"
import {
  useAssignmentStatus,
  useAssignChat,
} from "@/hooks/api/useSocial"
import { parseChatId } from "@/lib/chatUtils"
import { CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TextMessageFormFacebook } from "./text-message-form-facebook"

interface ChatBoxFooterFacebookProps {
  onMessageSent?: () => void;
}

// parseChatId imported from shared utility

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

  // Widget-only: if the session has been closed (visitor, agent, or timeout)
  // suppress the composer entirely so agents can't send into a dead session.
  // The visitor's iframe is showing the post-chat review form at this point;
  // a reply here would silently fail and never reach them.
  if (currentChat?.platform === 'widget' && currentChat.sessionEndedAt) {
    const endedByLabel =
      currentChat.sessionEndedBy === 'visitor'
        ? 'The visitor ended this conversation.'
        : currentChat.sessionEndedBy === 'agent'
        ? 'This conversation was ended by an agent.'
        : 'This conversation has ended.'
    return (
      <CardFooter className="py-4 border-t border-border">
        <div className="w-full flex flex-col items-center justify-center gap-1 py-4 text-center">
          <p className="text-sm text-muted-foreground">{endedByLabel}</p>
          <p className="text-xs text-muted-foreground">
            New messages from this visitor will start a fresh chat.
          </p>
        </div>
      </CardFooter>
    )
  }

  // If assignment mode is enabled but user can't send messages, show appropriate UI
  if (assignmentEnabled && !canSendMessages) {
    // History view = read-only audit. Don't offer "Assign to Me" here — it
    // silently unarchives the conversation, which caused a loop where agents
    // accidentally reopened old chats then had to end-session them again
    // (reported: amanati, teonagolodze.16@gmail.com, 2026-04-23). The
    // explicit reopen path is the "Restore from History" item in the chat
    // header menu, which is unambiguous about its effect.
    if (showArchived) {
      return (
        <CardFooter className="py-4 border-t border-border">
          <div className="w-full flex flex-col items-center justify-center gap-2 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              This conversation is in history (read-only).
            </p>
            <p className="text-xs text-muted-foreground">
              To reply, use <span className="font-medium">Restore from History</span> in the chat menu.
            </p>
          </div>
        </CardFooter>
      )
    }

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
            (chatInfo?.platform === 'email' || chatInfo?.platform === 'widget') ? (
              // Email + widget skip the rating flow — the visitor may have
              // already closed the tab, so requiring a rating before reopening
              // would effectively lock the conversation out forever.
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

  // Normal footer with message input
  return (
    <CardFooter className="py-3 border-t border-border">
      <TextMessageFormFacebook onMessageSent={onMessageSent} />
    </CardFooter>
  )
}
