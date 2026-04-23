"use client"

import { MoreVertical, Archive, CheckCheck, History, ArrowLeft, Filter, Facebook, Instagram, MessageCircle } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { useMarkAllAsRead, useArchiveAllConversations } from "@/hooks/api/useSocial"
import { useUserProfile } from "@/hooks/useUserProfile"

export function ChatSidebarActionButtons() {
  const t = useTranslations("chat")

  const { showArchived, setShowArchived, platforms, platformFilter, setPlatformFilter, setSelectedChatId } = useChatContext()
  const markAllAsReadMutation = useMarkAllAsRead()
  const archiveAllMutation = useArchiveAllConversations()
  const { data: userProfile } = useUserProfile()

  const isEmailOnly = platforms.length === 1 && platforms[0] === 'email'

  // Check if user is staff/admin (tenant admin)
  // Admin is determined by is_staff=true
  const isAdmin = userProfile?.is_staff === true

  const handleMarkAllAsRead = () => {
    if (isEmailOnly) {
      // On email page: archive all email conversations (send to history)
      archiveAllMutation.mutate('email')
    } else {
      // On social page: only mark social messages as read
      markAllAsReadMutation.mutate('facebook,instagram,whatsapp')
    }
  }

  const handleArchiveAll = () => {
    if (isEmailOnly) {
      archiveAllMutation.mutate('email')
    } else {
      // Only archive social messages, not email
      archiveAllMutation.mutate('facebook,instagram,whatsapp')
    }
  }

  const handleToggleHistory = () => {
    setShowArchived(!showArchived)
  }

  const isSocialView = !isEmailOnly

  const platformOptions = [
    { value: 'facebook', label: 'Messenger', icon: Facebook },
    { value: 'instagram', label: 'Instagram', icon: Instagram },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { value: 'widget', label: 'Website widget', icon: MessageCircle },
  ]

  return (
    <div className="flex gap-1">
      {/* Platform Filter - only show on social messages page */}
      {isSocialView && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Filter by platform"
              className={platformFilter ? "text-primary" : ""}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            <DropdownMenuItem onClick={() => { setPlatformFilter(null); setSelectedChatId(null) }}>
              <MessageCircle className="mr-2 h-4 w-4" />
              {platformFilter === null ? <strong>All Platforms</strong> : "All Platforms"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {platformOptions.map(({ value, label, icon: Icon }) => (
              <DropdownMenuItem key={value} onClick={() => { setPlatformFilter(value); setSelectedChatId(null) }}>
                <Icon className="mr-2 h-4 w-4" />
                {platformFilter === value ? <strong>{label}</strong> : label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

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

          {/* Admin-only actions */}
          {isAdmin && (
            <>
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
            </>
          )}

        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
