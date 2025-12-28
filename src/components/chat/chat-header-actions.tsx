"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { EllipsisVertical, Wifi, WifiOff, Trash2, Search, UserPlus, UserMinus, Square, Play } from "lucide-react"

import type { ChatType } from "@/components/chat/types"
import { useAuth } from "@/contexts/AuthContext"
import {
  useDeleteConversation,
  useAssignmentStatus,
  useAssignChat,
  useUnassignChat,
  useStartSession,
  useEndSession,
  type ChatAssignmentPlatform,
} from "@/hooks/api/useSocial"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ChatHeaderActionsProps {
  isConnected?: boolean
  chat?: ChatType
  onSearchClick?: () => void
}

// Helper to parse chat ID into platform, account_id, and conversation_id
function parseChatId(chatId: string, platform?: string) {
  // Format: fb_{page_id}_{sender_id}, ig_{account_id}_{sender_id}, wa_{waba_id}_{from_number}, email_{thread_id}
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

export function ChatHeaderActions({ isConnected = false, chat, onSearchClick }: ChatHeaderActionsProps) {
  const router = useRouter()
  const { user } = useAuth()
  const deleteConversation = useDeleteConversation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

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

  // Assignment mutations
  const assignChat = useAssignChat()
  const unassignChat = useUnassignChat()
  const startSession = useStartSession()
  const endSession = useEndSession()

  const canDelete = user?.is_staff === true

  // Settings from assignment status response
  const settings = assignmentStatusData?.settings
  const assignmentEnabled = settings?.chat_assignment_enabled ?? false
  // Session management is now part of chat assignment (no separate toggle)

  // Assignment state
  const assignment = assignmentStatusData?.assignment
  const isAssigned = !!assignment
  const isAssignedToMe = assignment?.assigned_user === user?.id
  const isInSession = assignment?.status === 'in_session'
  const isActiveAssignment = assignment?.status === 'active'

  const handleDelete = () => {
    if (!chat?.platform || !chat?.id) return

    // Extract conversation_id from chat id
    // Format: fb_{page_id}_{sender_id}, ig_{account_id}_{sender_id}, wa_{waba_id}_{from_number}, email_{thread_id}
    const parts = chat.id.split('_')

    let conversationId: string
    if (chat.platform === 'email') {
      // Email format: email_{thread_id}
      if (parts.length < 2) return
      conversationId = parts.slice(1).join('_') // thread_id
    } else {
      // Other platforms: prefix_{account_id}_{sender_id}
      if (parts.length < 3) return
      conversationId = parts.slice(2).join('_')
    }

    deleteConversation.mutate(
      {
        platform: chat.platform,
        conversation_id: conversationId,
      },
      {
        onSuccess: () => {
          setShowDeleteDialog(false)
          // Navigate back to messages list
          router.push('/messages')
        },
        onError: (error) => {
          console.error('Failed to delete conversation:', error)
          setShowDeleteDialog(false)
        },
      }
    )
  }

  // Assignment action handlers
  const handleAssign = () => {
    if (!chatInfo) return
    assignChat.mutate({
      platform: chatInfo.platform,
      conversation_id: chatInfo.conversationId,
      account_id: chatInfo.accountId,
    })
  }

  const handleUnassign = () => {
    if (!chatInfo) return
    unassignChat.mutate({
      platform: chatInfo.platform,
      conversation_id: chatInfo.conversationId,
      account_id: chatInfo.accountId,
    })
  }

  const handleStartSession = () => {
    if (!chatInfo) return
    startSession.mutate({
      platform: chatInfo.platform,
      conversation_id: chatInfo.conversationId,
      account_id: chatInfo.accountId,
    })
  }

  const handleEndSession = () => {
    if (!chatInfo) return
    endSession.mutate({
      platform: chatInfo.platform,
      conversation_id: chatInfo.conversationId,
      account_id: chatInfo.accountId,
    })
  }

  const isAssignmentLoading = assignChat.isPending || unassignChat.isPending || startSession.isPending || endSession.isPending

  return (
    <>
      <div className="flex gap-1 ms-auto">
        {/* WebSocket Connection Status */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={isConnected ? "Connected" : "Connecting..."}
          className={isConnected ? "text-green-600 dark:text-green-500" : "text-muted-foreground"}
        >
          {isConnected ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
        </Button>

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="self-center" asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <EllipsisVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onSearchClick}>
              <Search className="size-4 mr-2" />
              Search
            </DropdownMenuItem>

            {/* Assignment actions - only show when assignment mode is enabled */}
            {assignmentEnabled && chatInfo && (
              <>
                <DropdownMenuSeparator />
                {/* Assign to Me - show if not assigned */}
                {!isAssigned && (
                  <DropdownMenuItem onClick={handleAssign} disabled={isAssignmentLoading}>
                    <UserPlus className="size-4 mr-2" />
                    {assignChat.isPending ? "Assigning..." : "Assign to Me"}
                  </DropdownMenuItem>
                )}

                {/* Session controls - only show if assigned to me (session management is part of assignment) */}
                {isAssignedToMe && (
                  <>
                    {/* Start Session - only show if assignment is active (not in session) */}
                    {isActiveAssignment && (
                      <DropdownMenuItem onClick={handleStartSession} disabled={isAssignmentLoading}>
                        <Play className="size-4 mr-2" />
                        {startSession.isPending ? "Starting..." : "Start Session"}
                      </DropdownMenuItem>
                    )}

                    {/* End Session - only show if in session */}
                    {isInSession && (
                      <DropdownMenuItem onClick={handleEndSession} disabled={isAssignmentLoading}>
                        <Square className="size-4 mr-2" />
                        {endSession.isPending ? "Ending..." : "End Session"}
                      </DropdownMenuItem>
                    )}
                  </>
                )}

                {/* Unassign - always show if assigned to me (release chat) */}
                {isAssignedToMe && (
                  <DropdownMenuItem onClick={handleUnassign} disabled={isAssignmentLoading}>
                    <UserMinus className="size-4 mr-2" />
                    {unassignChat.isPending ? "Unassigning..." : "Unassign"}
                  </DropdownMenuItem>
                )}

                {/* Show who it's assigned to if assigned to someone else */}
                {isAssigned && !isAssignedToMe && (
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    <UserPlus className="size-4 mr-2" />
                    Assigned to {assignment?.assigned_user_name}
                  </DropdownMenuItem>
                )}
              </>
            )}

            {/* Staff-only actions - Block only in dropdown */}
            {canDelete && chat && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  Block
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Delete button - outside dropdown for easy access */}
        {canDelete && chat && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete conversation"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This will permanently delete all messages in this conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteConversation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConversation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteConversation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
