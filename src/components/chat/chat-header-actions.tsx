"use client"

import { useState, useMemo } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { EllipsisVertical, Wifi, WifiOff, Trash2, Search, UserPlus, UserMinus, Square, Play, FolderInput, MailOpen, UserRound, Archive, ArchiveRestore, ArrowRightLeft } from "lucide-react"

import type { ChatType } from "@/components/chat/types"
import { useAuth } from "@/contexts/AuthContext"
import { useQueryClient } from "@tanstack/react-query"
import {
  useDeleteConversation,
  useAssignmentStatus,
  useAssignChat,
  useUnassignChat,
  useStartSession,
  useEndSession,
  useTransferChat,
  useEmailFolders,
  useEmailAction,
  useMarkConversationUnread,
  useArchiveConversation,
  useUnarchiveConversation,
  socialKeys,
  type ChatAssignmentPlatform,
} from "@/hooks/api/useSocial"
import { useUsers } from "@/hooks/api/useUsers"
import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { useSocialClientByAccount } from "@/hooks/api/useSocialClients"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { ClientDetailPanel } from "@/components/chat/client-detail-panel"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
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
  // Format: fb_{page_id}_{sender_id}, ig_{account_id}_{sender_id}, wa_{waba_id}_{from_number}, email_{conn_id}_{thread_id}
  const parts = chatId.split('_')

  const prefix = parts[0]

  // All platforms now have the same format: prefix_{account_id}_{conversation_id}
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
  } else if (prefix === 'email') {
    parsedPlatform = 'email'
  } else {
    return null
  }

  return { platform: parsedPlatform, accountId, conversationId }
}

export function ChatHeaderActions({ isConnected = false, chat, onSearchClick }: ChatHeaderActionsProps) {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { toast } = useToast()
  const t = useTranslations("chat")
  const deleteConversation = useDeleteConversation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showClientPanel, setShowClientPanel] = useState(false)
  const [transferTarget, setTransferTarget] = useState<{ id: number; name: string } | null>(null)
  const [transferSearch, setTransferSearch] = useState('')
  const [transferOpen, setTransferOpen] = useState(false)

  // Archive/History functionality
  const { showArchived, setShowArchived, selectedEmailConnectionId, setAssignmentTab, setSelectedChatId, handleRemoveChat } = useChatContext()

  // Email folder functionality
  const isEmail = chat?.platform === 'email'
  const { data: folders } = useEmailFolders(selectedEmailConnectionId)
  const emailAction = useEmailAction()
  const markUnread = useMarkConversationUnread()
  const archiveConversation = useArchiveConversation()
  const unarchiveConversation = useUnarchiveConversation()

  // Parse chat ID for assignment operations
  const chatInfo = useMemo(() => {
    if (!chat?.id) return null
    return parseChatId(chat.id, chat.platform)
  }, [chat?.id, chat?.platform])

  // For email platform, extract the customer's email address
  // The customer email is stored as the user ID in the users array (not "business")
  // This is used as platform_id so all emails from same sender are linked together
  const customerEmail = useMemo(() => {
    if (chat?.platform !== 'email') return null

    // For email conversations, the customer user ID is their email address
    // Find user that is not "business"
    const customerUser = chat.users?.find((u) => u.id !== 'business')
    if (customerUser?.id && customerUser.id.includes('@')) {
      return customerUser.id
    }

    return null
  }, [chat?.platform, chat?.users])

  // For client lookup, use customer email as platformId for email platform
  // This ensures all emails from the same person are linked to the same client
  const clientLookupPlatformId = isEmail && customerEmail ? customerEmail : chatInfo?.conversationId || ''

  // Social client lookup - find if this chat has a linked client
  const { data: clientByAccount } = useSocialClientByAccount(
    chatInfo?.platform || '',
    clientLookupPlatformId,
    chatInfo?.accountId || '',
    { enabled: !!chatInfo && !!chatInfo.platform && !!clientLookupPlatformId && !!chatInfo.accountId }
  )
  const hasLinkedClient = clientByAccount?.found && !!clientByAccount?.client

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
  const transferChat = useTransferChat()

  // Fetch users for transfer dropdown
  const { data: usersData } = useUsers({ enabled: !!chatInfo })
  const transferableUsers = useMemo(() => {
    if (!usersData?.results || !user?.id) return []
    return usersData.results.filter((u) => u.id !== user.id)
  }, [usersData, user?.id])

  const canDelete = user?.is_staff === true

  // Settings from assignment status response
  const settings = assignmentStatusData?.settings
  const assignmentEnabled = settings?.chat_assignment_enabled ?? false
  // Session management is now part of chat assignment (no separate toggle)

  // Assignment state
  const assignment = assignmentStatusData?.assignment
  // Only consider assigned if there's actually an assigned user (not just an assignment record)
  const isAssigned = !!assignment?.assigned_user
  const isAssignedToMe = assignment?.assigned_user === user?.id
  const isInSession = assignment?.status === 'in_session'
  const isActiveAssignment = assignment?.status === 'active'

  const handleDelete = () => {
    if (!chat?.platform || !chat?.id) return

    // Extract conversation_id from chat id
    // Format: fb_{page_id}_{sender_id}, ig_{account_id}_{sender_id}, wa_{waba_id}_{from_number}, email_{conn_id}_{thread_id}
    const parts = chat.id.split('_')

    // All platforms have the same format: prefix_{account_id}_{conversation_id}
    if (parts.length < 3) return
    const conversationId = parts.slice(2).join('_')

    deleteConversation.mutate(
      {
        platform: chat.platform,
        conversation_id: conversationId,
      },
      {
        onSuccess: () => {
          setShowDeleteDialog(false)
          setSelectedChatId(null)
          queryClient.invalidateQueries({ queryKey: socialKeys.conversations() })
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
    if (!chatInfo || !chat?.platform) return

    // Assign the chat to the current user
    assignChat.mutate(
      {
        platform: chatInfo.platform,
        conversation_id: chatInfo.conversationId,
        account_id: chatInfo.accountId,
      },
      {
        onSuccess: () => {
          // If we're in history view, also unarchive the conversation and exit history view
          if (showArchived) {
            unarchiveConversation.mutate(
              [{
                platform: chat.platform!,
                conversation_id: chatInfo.conversationId,
                account_id: chatInfo.accountId,
              }],
              {
                onSuccess: () => {
                  toast({
                    title: "Chat assigned",
                    description: "Chat assigned to you and restored from history",
                  })
                  // Exit history view, switch to assigned tab
                  setShowArchived(false)
                  setAssignmentTab('assigned')
                  queryClient.invalidateQueries({ queryKey: socialKeys.conversations() })
                },
                onError: (error: any) => {
                  toast({
                    title: "Assigned but failed to restore",
                    description: error.response?.data?.error || "Chat was assigned but could not be restored from history",
                    variant: "destructive",
                  })
                },
              }
            )
          } else {
            toast({
              title: "Chat assigned",
              description: "Chat has been assigned to you",
            })
            setAssignmentTab('assigned')
          }
        },
      }
    )
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
    if (!chatInfo || !chat) return
    const chatIdToRemove = chat.id
    // End session - backend archives the conversation automatically
    endSession.mutate(
      {
        platform: chatInfo.platform,
        conversation_id: chatInfo.conversationId,
        account_id: chatInfo.accountId,
      },
      {
        onSuccess: () => {
          toast({
            title: "Session ended",
            description: "Conversation moved to history",
          })
          // Immediately remove chat from sidebar and clear selection
          handleRemoveChat(chatIdToRemove)
          setSelectedChatId(null)
          queryClient.invalidateQueries({ queryKey: socialKeys.conversations() })
        },
      }
    )
  }

  const handleTransfer = () => {
    if (!chatInfo || !transferTarget) return
    transferChat.mutate(
      {
        platform: chatInfo.platform,
        conversation_id: chatInfo.conversationId,
        account_id: chatInfo.accountId,
        target_user_id: transferTarget.id,
      },
      {
        onSuccess: (data) => {
          toast({
            title: "Chat transferred",
            description: data.message,
          })
          setTransferTarget(null)
          setSelectedChatId(null)
          queryClient.invalidateQueries({ queryKey: socialKeys.conversations() })
        },
        onError: (error: any) => {
          toast({
            title: "Transfer failed",
            description: error.response?.data?.error || "Failed to transfer chat",
            variant: "destructive",
          })
          setTransferTarget(null)
        },
      }
    )
  }

  const isAssignmentLoading = assignChat.isPending || unassignChat.isPending || startSession.isPending || endSession.isPending || transferChat.isPending

  // Handle move to folder for email threads
  const handleMoveToFolder = (targetFolder: string) => {
    if (!chatInfo || chatInfo.platform !== 'email') return

    emailAction.mutate(
      {
        thread_id: chatInfo.conversationId,
        action: 'move',
        folder: targetFolder,
      },
      {
        onSuccess: () => {
          toast({
            title: "Email moved",
            description: `Email thread moved to ${targetFolder}`,
          })
        },
        onError: (error: any) => {
          toast({
            title: "Failed to move email",
            description: error.response?.data?.error || "Failed to move email thread",
            variant: "destructive",
          })
        },
      }
    )
  }

  // Handle mark as unread for email threads (email-specific)
  const handleEmailMarkAsUnread = () => {
    if (!chatInfo || chatInfo.platform !== 'email') return

    emailAction.mutate(
      {
        thread_id: chatInfo.conversationId,
        action: 'mark_unread',
      },
      {
        onSuccess: () => {
          toast({
            title: "Marked as unread",
            description: "Email thread marked as unread",
          })
        },
        onError: (error: any) => {
          toast({
            title: "Failed to mark as unread",
            description: error.response?.data?.error || "Failed to mark email as unread",
            variant: "destructive",
          })
        },
      }
    )
  }

  // Handle mark as unread for all platforms (unified endpoint)
  const handleMarkAsUnread = () => {
    if (!chatInfo || !chat?.platform) return

    markUnread.mutate(
      {
        platform: chat.platform,
        conversation_id: chatInfo.conversationId,
      },
      {
        onSuccess: () => {
          toast({
            title: "Marked as unread",
            description: "Conversation marked as unread",
          })
        },
        onError: (error: any) => {
          toast({
            title: "Failed to mark as unread",
            description: error.response?.data?.error || "Failed to mark conversation as unread",
            variant: "destructive",
          })
        },
      }
    )
  }

  // Handle archive (move to history)
  const handleArchive = () => {
    if (!chatInfo || !chat?.platform) return

    archiveConversation.mutate(
      [{
        platform: chat.platform,
        conversation_id: chatInfo.conversationId,
        account_id: chatInfo.accountId,
      }],
      {
        onSuccess: () => {
          toast({
            title: "Moved to history",
            description: "Conversation has been archived",
          })
          setSelectedChatId(null)
          queryClient.invalidateQueries({ queryKey: socialKeys.conversations() })
        },
        onError: (error: any) => {
          toast({
            title: "Failed to archive",
            description: error.response?.data?.error || "Failed to archive conversation",
            variant: "destructive",
          })
        },
      }
    )
  }

  // Handle unarchive (restore from history)
  const handleUnarchive = () => {
    if (!chatInfo || !chat?.platform) return

    unarchiveConversation.mutate(
      [{
        platform: chat.platform,
        conversation_id: chatInfo.conversationId,
        account_id: chatInfo.accountId,
      }],
      {
        onSuccess: () => {
          toast({
            title: "Restored from history",
            description: "Conversation has been restored",
          })
          setSelectedChatId(null)
          queryClient.invalidateQueries({ queryKey: socialKeys.conversations() })
        },
        onError: (error: any) => {
          toast({
            title: "Failed to restore",
            description: error.response?.data?.error || "Failed to restore conversation",
            variant: "destructive",
          })
        },
      }
    )
  }

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

        {/* View/Create Client Button */}
        {chatInfo && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={hasLinkedClient ? "View Client" : "Create Client"}
            className={hasLinkedClient ? "text-primary" : "text-muted-foreground"}
            onClick={() => setShowClientPanel(true)}
          >
            <UserRound className="size-4" />
          </Button>
        )}

        {/* Transfer Chat Button - only shown when chat is assigned to current user */}
        {isAssignedToMe && transferableUsers.length > 0 && (
          <DropdownMenu open={transferOpen} onOpenChange={(open) => { setTransferOpen(open); if (!open) setTransferSearch('') }}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Transfer chat"
                disabled={transferChat.isPending}
              >
                <ArrowRightLeft className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[280px] p-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b">
                <Search className="size-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  placeholder={t("searchMembers")}
                  value={transferSearch}
                  onChange={(e) => setTransferSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-y-auto p-1">
                {transferableUsers
                  .filter((u) => {
                    if (!transferSearch) return true
                    const q = transferSearch.toLowerCase()
                    return (
                      u.email.toLowerCase().includes(q) ||
                      (u.first_name?.toLowerCase() || '').includes(q) ||
                      (u.last_name?.toLowerCase() || '').includes(q)
                    )
                  })
                  .map((u) => {
                    const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ')
                    return (
                      <DropdownMenuItem
                        key={u.id}
                        onClick={() => {
                          setTransferTarget({ id: u.id, name: displayName || u.email })
                          setTransferOpen(false)
                          setTransferSearch('')
                        }}
                        className="flex flex-col items-start gap-0.5 cursor-pointer"
                      >
                        {displayName && (
                          <span className="font-medium">{displayName}</span>
                        )}
                        <span className={displayName ? "text-xs text-muted-foreground" : ""}>
                          {u.email}
                        </span>
                      </DropdownMenuItem>
                    )
                  })}
                {transferableUsers.filter((u) => {
                  if (!transferSearch) return true
                  const q = transferSearch.toLowerCase()
                  return (
                    u.email.toLowerCase().includes(q) ||
                    (u.first_name?.toLowerCase() || '').includes(q) ||
                    (u.last_name?.toLowerCase() || '').includes(q)
                  )
                }).length === 0 && (
                  <div className="py-3 text-center text-sm text-muted-foreground">
                    No members found
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

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

            {/* Mark as Unread - for all platforms */}
            {chatInfo && !isEmail && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleMarkAsUnread} disabled={markUnread.isPending}>
                  <MailOpen className="size-4 mr-2" />
                  Mark as Unread
                </DropdownMenuItem>
              </>
            )}

            {/* Email-specific actions - only show for email conversations */}
            {isEmail && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleEmailMarkAsUnread} disabled={emailAction.isPending}>
                  <MailOpen className="size-4 mr-2" />
                  Mark as Unread
                </DropdownMenuItem>
                {folders && folders.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <FolderInput className="size-4 mr-2" />
                      Move to Folder
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        {folders.map((folder) => (
                          <DropdownMenuItem
                            key={folder.name}
                            onClick={() => handleMoveToFolder(folder.name)}
                            disabled={emailAction.isPending}
                          >
                            {folder.display_name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                )}
              </>
            )}

            {/* Archive/Unarchive - for all platforms */}
            {chatInfo && (
              <>
                <DropdownMenuSeparator />
                {showArchived ? (
                  <DropdownMenuItem onClick={handleUnarchive} disabled={unarchiveConversation.isPending}>
                    <ArchiveRestore className="size-4 mr-2" />
                    {unarchiveConversation.isPending ? "Restoring..." : "Restore from History"}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleArchive} disabled={archiveConversation.isPending}>
                    <Archive className="size-4 mr-2" />
                    {archiveConversation.isPending ? "Archiving..." : "Move to History"}
                  </DropdownMenuItem>
                )}
              </>
            )}

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
                {isAssigned && !isAssignedToMe && assignment?.assigned_user_name && (
                  <>
                    <DropdownMenuItem disabled className="text-muted-foreground">
                      <UserPlus className="size-4 mr-2" />
                      Assigned to {assignment.assigned_user_name}
                    </DropdownMenuItem>

                    {/* Admin actions for chats assigned to others */}
                    {canDelete && (
                      <>
                        {isInSession && (
                          <DropdownMenuItem onClick={handleEndSession} disabled={isAssignmentLoading}>
                            <Square className="size-4 mr-2" />
                            {endSession.isPending ? "Ending..." : "End Session"}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={handleUnassign} disabled={isAssignmentLoading}>
                          <UserMinus className="size-4 mr-2" />
                          {unassignChat.isPending ? "Unassigning..." : "Unassign"}
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
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

      {/* Transfer Confirmation Dialog */}
      <AlertDialog open={!!transferTarget} onOpenChange={(open) => { if (!open) setTransferTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("transferChat")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.rich("transferConfirmation", { name: transferTarget?.name ?? "", })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={transferChat.isPending}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransfer}
              disabled={transferChat.isPending}
            >
              {transferChat.isPending ? t("transferring") : t("transfer")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Client Detail Panel */}
      {chatInfo && (
        <ClientDetailPanel
          isOpen={showClientPanel}
          onClose={() => setShowClientPanel(false)}
          platform={chatInfo.platform}
          platformId={clientLookupPlatformId}
          accountConnectionId={chatInfo.accountId}
          chatDisplayName={chat?.name}
          chatProfilePic={chat?.avatar}
          chatEmail={customerEmail || undefined}
        />
      )}
    </>
  )
}
