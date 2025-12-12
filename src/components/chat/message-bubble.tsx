import { forwardRef } from "react"

import type { MessageType, UserType } from "@/components/chat/types"
import { formatDistanceToNow } from "date-fns"

import { cn } from "@/lib/utils"

import { MessageBubbleContent } from "./message-bubble-content"
import { MessageBubbleStatusIcon } from "./message-bubble-status-icon"

interface MessageBubbleProps {
  sender: UserType
  message: MessageType
  isByCurrentUser: boolean
  platform?: "facebook" | "instagram" | "whatsapp"
  isHighlighted?: boolean
  searchQuery?: string
}

export const MessageBubble = forwardRef<HTMLLIElement, MessageBubbleProps>(
  function MessageBubble(
    { sender, message, isByCurrentUser, platform, isHighlighted, searchQuery },
    ref
  ) {
  return (
    <li
      ref={ref}
      className={cn(
        "flex flex-col transition-all duration-300",
        isByCurrentUser ? "items-end" : "items-start",
        isHighlighted && "bg-yellow-100 dark:bg-yellow-900/30 -mx-2 px-2 py-1 rounded-lg"
      )}
    >
      <div className="flex flex-col gap-1 max-w-[320px]">
        <MessageBubbleContent
          message={message}
          isByCurrentUser={isByCurrentUser}
          platform={platform}
        />
        <div className={cn(
          "flex items-center gap-1",
          isByCurrentUser && "justify-end"
        )}>
          <span className="text-xs font-normal text-muted-foreground">
            {formatDistanceToNow(message.createdAt, { addSuffix: true })}
          </span>
          {isByCurrentUser && (
            <MessageBubbleStatusIcon status={message.status} />
          )}
        </div>
      </div>
    </li>
  )
})
