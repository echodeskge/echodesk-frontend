"use client"

import React, { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useUnreadMessagesCount, useRecentConversations, type RecentConversation } from '@/hooks/api/useSocial'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { MessagesDropdownList } from '@/components/MessagesDropdownList'

interface MessengerBellProps {
  className?: string
}

export function MessengerBell({ className }: MessengerBellProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const { data: unreadCount } = useUnreadMessagesCount()
  const { data: conversations, isLoading, isFetching, isEmpty } = useRecentConversations({ limit: 10 })

  // Social messages only (exclude email - email has separate badge on sidebar)
  const totalUnread = (unreadCount?.facebook ?? 0) + (unreadCount?.instagram ?? 0) + (unreadCount?.whatsapp ?? 0)

  const handleConversationClick = (conversation: RecentConversation) => {
    setIsOpen(false)
    // Navigate to the specific conversation
    router.push(`/messages/${conversation.id}`)
  }

  const handleSeeAllClick = () => {
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label="Messages"
        >
          <MessageCircle className="h-5 w-5" />
          {totalUnread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] p-0"
        sideOffset={8}
      >
        <MessagesDropdownList
          conversations={conversations}
          isLoading={isLoading}
          isFetching={isFetching}
          isEmpty={isEmpty}
          onConversationClick={handleConversationClick}
          onSeeAllClick={handleSeeAllClick}
        />
      </PopoverContent>
    </Popover>
  )
}
