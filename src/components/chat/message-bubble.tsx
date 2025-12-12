import { forwardRef } from "react"
import { EllipsisVertical } from "lucide-react"

import type { MessageType, UserType } from "@/components/chat/types"
import { formatDistanceToNow } from "date-fns"

import { cn, getInitials } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChatAvatar } from "./chat-avatar"
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
  // Provide default values if sender is undefined
  const safeSender = sender || { id: 'unknown', name: 'Unknown User', status: 'offline' };

  return (
    <li
      ref={ref}
      className={cn(
        "flex gap-2 transition-all duration-300",
        isByCurrentUser && "flex-row-reverse",
        isHighlighted && "bg-yellow-100 dark:bg-yellow-900/30 -mx-2 px-2 py-1 rounded-lg"
      )}
    >
      <ChatAvatar
        src={safeSender.avatar}
        fallback={getInitials(safeSender.name)}
        status={safeSender.status}
        size={1.75}
        className="shrink-0"
      />
      <div className="flex flex-col gap-1 w-full max-w-[320px]">
        <span
          className={cn(
            "text-sm font-semibold text-foreground",
            isByCurrentUser && "text-end"
          )}
        >
          {safeSender.name}
        </span>
        <MessageBubbleContent
          message={message}
          isByCurrentUser={isByCurrentUser}
          platform={platform}
        />
        <div className="flex items-center gap-1">
          <span className="text-sm font-normal text-muted-foreground">
            {formatDistanceToNow(message.createdAt, { addSuffix: true })}
          </span>
          {isByCurrentUser && (
            <MessageBubbleStatusIcon status={message.status} />
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="mt-8" asChild>
          <Button variant="ghost" size="icon" aria-label="More actions">
            <EllipsisVertical className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isByCurrentUser ? "start" : "end"}>
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Reply</DropdownMenuItem>
          <DropdownMenuItem>Forward</DropdownMenuItem>
          <DropdownMenuItem>Copy</DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Show 'Report' only if the message is not sent by the current user */}
          {!isByCurrentUser && (
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              Report
            </DropdownMenuItem>
          )}
          {/* Show 'Delete' only if the message is sent by the current user */}
          {isByCurrentUser && (
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
})
