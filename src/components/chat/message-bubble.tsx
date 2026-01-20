import { forwardRef } from "react"

import type { MessageType, UserType } from "@/components/chat/types"
import { formatDistanceToNow } from "date-fns"
import { Pencil, Trash2, Smartphone, History, Reply } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { cn } from "@/lib/utils"

import { MessageBubbleContent } from "./message-bubble-content"
import { MessageBubbleStatusIcon } from "./message-bubble-status-icon"
import { useChatContext } from "./hooks/use-chat-context"
import { Button } from "@/components/ui/button"

// Reply preview component
function MessageReplyPreview({ replyToText, replyToSenderName, isByCurrentUser }: {
  replyToText?: string;
  replyToSenderName?: string;
  isByCurrentUser: boolean;
}) {
  if (!replyToText && !replyToSenderName) return null

  return (
    <div className={cn(
      "flex items-start gap-1.5 px-3 py-1.5 rounded-t-lg border-l-2 text-xs mb-0.5",
      isByCurrentUser
        ? "bg-primary/10 border-primary/50"
        : "bg-muted/50 border-muted-foreground/30"
    )}>
      <Reply className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
      <div className="min-w-0">
        {replyToSenderName && (
          <span className="font-medium text-muted-foreground">{replyToSenderName}</span>
        )}
        {replyToText && (
          <p className="text-muted-foreground truncate">{replyToText}</p>
        )}
      </div>
    </div>
  )
}

// Reaction badge component
function MessageReactionBadge({ reaction, reactionEmoji }: { reaction?: string; reactionEmoji?: string }) {
  if (!reaction && !reactionEmoji) return null

  return (
    <div className="absolute -bottom-2 -right-1 bg-background border rounded-full px-1.5 py-0.5 shadow-sm">
      <span className="text-sm">{reactionEmoji || reaction}</span>
    </div>
  )
}

interface MessageBubbleProps {
  sender: UserType
  message: MessageType
  isByCurrentUser: boolean
  platform?: "facebook" | "instagram" | "whatsapp" | "email"
  isHighlighted?: boolean
  searchQuery?: string
}

// Message action buttons (reply only - reactions are not supported by Facebook for pages)
function MessageActions({
  message,
  platform,
  onReply,
}: {
  message: MessageType
  platform?: string
  onReply: () => void
}) {
  // Only show for Facebook/Instagram messages (not email or WhatsApp for now)
  if (platform !== 'facebook' && platform !== 'instagram') return null
  if (!message.platformMessageId) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onReply}
          >
            <Reply className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Reply
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Source icon component for WhatsApp coexistence
function MessageSourceIcon({ source }: { source?: string }) {
  if (!source || source === 'cloud_api') return null

  const icons = {
    business_app: { icon: Smartphone, label: 'Sent from Business App', color: 'text-green-600' },
    synced: { icon: History, label: 'Synced from history', color: 'text-blue-500' },
  }

  const config = icons[source as keyof typeof icons]
  if (!config) return null

  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className={cn("h-3 w-3", config.color)} />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {config.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export const MessageBubble = forwardRef<HTMLLIElement, MessageBubbleProps>(
  function MessageBubble(
    { sender, message, isByCurrentUser, platform, isHighlighted, searchQuery },
    ref
  ) {
  const { setReplyingTo } = useChatContext()

  // Check if this is an email message
  const isEmail = message.platform === 'email' || platform === 'email'

  // Handle reply action
  const handleReply = () => {
    if (!message.platformMessageId) return
    setReplyingTo({
      messageId: message.platformMessageId,
      text: message.text?.substring(0, 100),
      senderName: message.senderName || sender?.name,
    })
  }

  // Handle revoked messages
  if (message.isRevoked) {
    return (
      <li
        ref={ref}
        className={cn(
          "flex flex-col transition-all duration-300",
          isByCurrentUser ? "items-end" : "items-start"
        )}
      >
        <div className="flex flex-col gap-1 max-w-[320px]">
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg italic text-muted-foreground",
            isByCurrentUser
              ? "bg-muted/50"
              : "bg-muted/30"
          )}>
            <Trash2 className="h-4 w-4" />
            <span className="text-sm">This message was deleted</span>
          </div>
          <div className={cn(
            "flex items-center gap-1",
            isByCurrentUser && "justify-end"
          )}>
            <span className="text-xs font-normal text-muted-foreground">
              {formatDistanceToNow(message.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>
      </li>
    )
  }

  return (
    <li
      ref={ref}
      className={cn(
        "flex flex-col transition-all duration-300",
        isByCurrentUser ? "items-end" : "items-start",
        isHighlighted && "bg-yellow-100 dark:bg-yellow-900/30 -mx-2 px-2 py-1 rounded-lg"
      )}
    >
      <div className={cn(
        "flex flex-col gap-1 overflow-hidden",
        isEmail ? "max-w-full w-full" : "max-w-[320px]"
      )}>
        {/* Reply preview */}
        {(message.replyToText || message.replyToSenderName) && (
          <MessageReplyPreview
            replyToText={message.replyToText}
            replyToSenderName={message.replyToSenderName}
            isByCurrentUser={isByCurrentUser}
          />
        )}
        {/* Message content with action button */}
        <div className="flex items-start gap-1 group">
          {/* Reply button - left side of business messages */}
          {isByCurrentUser && (
            <MessageActions
              message={message}
              platform={platform}
              onReply={handleReply}
            />
          )}
          <div className="relative">
            <MessageBubbleContent
              message={message}
              isByCurrentUser={isByCurrentUser}
              platform={platform}
            />
            {/* Reaction badge */}
            {(message.reaction || message.reactionEmoji) && (
              <MessageReactionBadge
                reaction={message.reaction}
                reactionEmoji={message.reactionEmoji}
              />
            )}
          </div>
          {/* Reply button - right side of customer messages */}
          {!isByCurrentUser && (
            <MessageActions
              message={message}
              platform={platform}
              onReply={handleReply}
            />
          )}
        </div>
        <div className={cn(
          "flex items-center gap-1",
          isByCurrentUser && "justify-end"
        )}>
          {/* Source indicator for WhatsApp coexistence */}
          {platform === 'whatsapp' && (
            <MessageSourceIcon source={message.source} />
          )}

          {/* Edited indicator */}
          {message.isEdited && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Pencil className="h-3 w-3" />
                    <span>edited</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[200px]">
                  {message.originalText && (
                    <div>
                      <span className="font-medium">Original:</span>
                      <p className="text-muted-foreground">{message.originalText}</p>
                    </div>
                  )}
                  {message.editedAt && (
                    <span className="text-muted-foreground">
                      Edited {formatDistanceToNow(message.editedAt, { addSuffix: true })}
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

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
