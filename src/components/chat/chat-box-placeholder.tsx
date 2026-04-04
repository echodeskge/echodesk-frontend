"use client"

import { MessageCircleDashed } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { ChatMenuButton } from "./chat-menu-button"
import { useChatContext } from "./hooks/use-chat-context"

export function ChatBoxPlaceholder() {
  const { isInitialLoading } = useChatContext()

  return (
    <Card className="grow h-full">
      <CardContent className="size-full flex flex-col justify-center items-center gap-2 p-0">
        <MessageCircleDashed className={cn("size-24 text-primary/50", isInitialLoading && "animate-pulse")} />
        <p className="text-muted-foreground">
          {isInitialLoading ? "Loading conversations..." : "Select a chat to start a conversation."}
        </p>
        {!isInitialLoading && <ChatMenuButton />}
      </CardContent>
    </Card>
  )
}
