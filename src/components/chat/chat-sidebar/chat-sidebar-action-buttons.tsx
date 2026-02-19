"use client"

import { useState } from "react"
import { MoreVertical, Archive, CheckCheck, History, ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChatSidebarNotificationDropdown } from "./chat-sidebar-notification-dropdown"
import { ChatSidebarStatusDropdown } from "./chat-sidebar-status-dropdown"
import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { useMarkAllAsRead, useArchiveAllConversations } from "@/hooks/api/useSocial"

export function ChatSidebarActionButtons() {
  const t = useTranslations("chat")
  const [notifications, setNotifications] = useState<string>("ALL_MESSAGES")
  const [status, setStatus] = useState<string>("ONLINE")

  const { showArchived, setShowArchived } = useChatContext()
  const markAllAsReadMutation = useMarkAllAsRead()
  const archiveAllMutation = useArchiveAllConversations()

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate('all')
  }

  const handleArchiveAll = () => {
    archiveAllMutation.mutate('all')
  }

  const handleToggleHistory = () => {
    setShowArchived(!showArchived)
  }

  return (
    <div className="flex gap-1">
      {/* More Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          {/* History Toggle */}
          <DropdownMenuItem onClick={handleToggleHistory}>
            {showArchived ? (
              <>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("backToChats")}
              </>
            ) : (
              <>
                <History className="mr-2 h-4 w-4" />
                {t("history")}
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Mark All as Read */}
          <DropdownMenuItem
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            {t("markAllAsRead")}
          </DropdownMenuItem>

          {/* Move All to History (only show when not in history view) */}
          {!showArchived && (
            <DropdownMenuItem
              onClick={handleArchiveAll}
              disabled={archiveAllMutation.isPending}
            >
              <Archive className="mr-2 h-4 w-4" />
              {t("moveAllToHistory")}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <ChatSidebarNotificationDropdown
            notifications={notifications}
            setNotifications={setNotifications}
          />
          <ChatSidebarStatusDropdown status={status} setStatus={setStatus} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
