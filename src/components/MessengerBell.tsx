"use client"

import React from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUnreadMessagesCount } from '@/hooks/api/useSocial'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface MessengerBellProps {
  className?: string
}

export function MessengerBell({ className }: MessengerBellProps) {
  const router = useRouter()
  const { data: unreadCount, isLoading } = useUnreadMessagesCount()

  const totalUnread = unreadCount?.total ?? 0

  const handleClick = () => {
    // Navigate to social messages page
    router.push('/social/messages')
  }

  // Build tooltip content showing breakdown
  const getTooltipContent = () => {
    if (!unreadCount || totalUnread === 0) {
      return 'No unread messages'
    }

    const parts: string[] = []
    if (unreadCount.facebook > 0) {
      parts.push(`Facebook: ${unreadCount.facebook}`)
    }
    if (unreadCount.instagram > 0) {
      parts.push(`Instagram: ${unreadCount.instagram}`)
    }
    if (unreadCount.whatsapp > 0) {
      parts.push(`WhatsApp: ${unreadCount.whatsapp}`)
    }

    return parts.length > 0 ? parts.join('\n') : 'No unread messages'
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("relative", className)}
            aria-label="Messages"
            onClick={handleClick}
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
        </TooltipTrigger>
        <TooltipContent side="bottom" className="whitespace-pre-line">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
