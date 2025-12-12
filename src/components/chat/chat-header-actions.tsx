"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { EllipsisVertical, Phone, Video, Wifi, WifiOff, Trash2 } from "lucide-react"

import type { ChatType } from "@/components/chat/types"
import { useAuth } from "@/contexts/AuthContext"
import { useDeleteConversation } from "@/hooks/api/useSocial"
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
}

export function ChatHeaderActions({ isConnected = false, chat }: ChatHeaderActionsProps) {
  const router = useRouter()
  const { user } = useAuth()
  const deleteConversation = useDeleteConversation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const canDelete = user?.is_staff === true

  const handleDelete = () => {
    if (!chat?.platform || !chat?.id) return

    // Extract conversation_id from chat id
    // Format: fb_{page_id}_{sender_id}, ig_{account_id}_{sender_id}, wa_{waba_id}_{from_number}
    const parts = chat.id.split('_')
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

        <Button variant="ghost" size="icon">
          <Phone className="size-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Video className="size-4" />
        </Button>

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="self-center" asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <EllipsisVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Search</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              Report
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              Mute
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              Block
            </DropdownMenuItem>
            {/* Delete option - only for staff */}
            {canDelete && chat && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete Conversation
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
