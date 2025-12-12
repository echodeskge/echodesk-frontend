"use client"

import { Search, X } from "lucide-react"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function ChatSidebarSearchInput() {
  const { chatListSearchQuery, setChatListSearchQuery } = useChatContext()

  return (
    <div className="relative grow">
      <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="w-full bg-muted ps-9 pe-9"
        placeholder="Search conversations..."
        type="search"
        aria-label="Search chats or groups"
        value={chatListSearchQuery}
        onChange={(e) => setChatListSearchQuery(e.target.value)}
      />
      {chatListSearchQuery && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute end-1 top-1/2 h-6 w-6 -translate-y-1/2"
          onClick={() => setChatListSearchQuery("")}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
