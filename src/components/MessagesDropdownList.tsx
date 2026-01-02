"use client"

import React from 'react'
import Link from 'next/link'
import { MessageCircle, ChevronRight } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { MessagesDropdownItem } from '@/components/MessagesDropdownItem'
import type { RecentConversation } from '@/hooks/api/useSocial'

interface MessagesDropdownListProps {
  conversations: RecentConversation[]
  isLoading: boolean
  isEmpty: boolean
  onConversationClick: (conversation: RecentConversation) => void
  onSeeAllClick: () => void
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Empty state
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <MessageCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium mb-1">No messages yet</h3>
      <p className="text-xs text-muted-foreground">
        When you receive messages from Facebook, Instagram, or WhatsApp, they will appear here.
      </p>
    </div>
  )
}

export function MessagesDropdownList({
  conversations,
  isLoading,
  isEmpty,
  onConversationClick,
  onSeeAllClick,
}: MessagesDropdownListProps) {
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold">Messages</h3>
        <Link
          href="/social/messages"
          onClick={onSeeAllClick}
          className="text-sm text-primary hover:underline flex items-center gap-0.5"
        >
          See All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="divide-y">
            {conversations.map((conversation) => (
              <MessagesDropdownItem
                key={conversation.id}
                conversation={conversation}
                onClick={() => onConversationClick(conversation)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
