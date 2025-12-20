import { forwardRef } from "react"

import type { MessageType, UserType } from "@/components/chat/types"
import { formatDistanceToNow } from "date-fns"
import { Pencil, Trash2, Smartphone, Cloud, History } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { cn } from "@/lib/utils"

import { MessageBubbleContent } from "./message-bubble-content"
import { MessageBubbleStatusIcon } from "./message-bubble-status-icon"

interface MessageBubbleProps {
  sender: UserType
  message: MessageType
  isByCurrentUser: boolean
  platform?: "facebook" | "instagram" | "whatsapp" | "email"
  isHighlighted?: boolean
  searchQuery?: string
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
