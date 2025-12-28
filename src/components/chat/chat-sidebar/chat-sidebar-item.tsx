import Link from "next/link"
import { useParams } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Facebook, Instagram, MessageCircle, Mail } from "lucide-react"

import type { ChatType } from "@/components/chat/types"

import { cn, getInitials } from "@/lib/utils"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { ChatAvatar } from "../chat-avatar"

export function ChatSidebarItem({ chat }: { chat: ChatType }) {
  const { setIsChatSidebarOpen } = useChatContext()
  const params = useParams()

  const chatIdParam = params.id?.[0]

  const handleOnCLick = () => {
    // Close the sidebar when a chat is selected
    setIsChatSidebarOpen(false)
  }

  return (
    <Link
      href={`/messages/${chat.id}`}
      prefetch={false}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        chatIdParam === chat.id && "bg-accent", // Highlight the current chat box
        chat.unreadCount && chat.unreadCount > 0 && "bg-muted/80", // Darker background for unread
        "h-fit w-full"
      )}
      aria-current={chatIdParam === chat.id ? "true" : undefined}
      onClick={handleOnCLick}
    >
      <li className="w-full flex items-center gap-2">
        <div className="relative shrink-0">
          <ChatAvatar
            src={chat.avatar}
            fallback={getInitials(chat.name)}
            status={chat.status}
            size={1.75}
            className="shrink-0"
          />
          {/* Platform indicator badge */}
          {chat.platform && (
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 ring-2 ring-background",
              chat.platform === "facebook"
                ? "bg-blue-600"
                : chat.platform === "instagram"
                ? "bg-gradient-to-br from-purple-600 to-pink-600"
                : chat.platform === "email"
                ? "bg-red-600"
                : "bg-green-600"
            )}>
              {chat.platform === "facebook" ? (
                <Facebook className="h-2.5 w-2.5 text-white" />
              ) : chat.platform === "instagram" ? (
                <Instagram className="h-2.5 w-2.5 text-white" />
              ) : chat.platform === "email" ? (
                <Mail className="h-2.5 w-2.5 text-white" />
              ) : (
                <MessageCircle className="h-2.5 w-2.5 text-white" />
              )}
            </div>
          )}
        </div>
        <div className="h-11 w-full grid grid-cols-3 gap-x-4">
          <div className="col-span-2 grid">
            <span className={cn("truncate", chat.unreadCount && chat.unreadCount > 0 && "font-semibold")}>{chat.name}</span>
            <span className={cn(
              "text-xs truncate",
              chat.unreadCount && chat.unreadCount > 0
                ? "text-foreground font-medium"
                : "text-muted-foreground font-semibold"
            )}>
              {chat.lastMessage?.content || "No messages yet..."}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground font-semibold">
              {formatDistanceToNow(chat.lastMessage?.createdAt ?? new Date(), { addSuffix: true })}
            </span>
            {/* Display unread count if available */}
            {!!chat?.unreadCount && (
              <Badge className="hover:bg-primary">{chat.unreadCount}</Badge>
            )}
          </div>
        </div>
      </li>
    </Link>
  )
}
