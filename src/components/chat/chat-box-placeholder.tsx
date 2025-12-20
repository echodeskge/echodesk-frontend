"use client"

import { MessageCircleDashed, Loader2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { ChatMenuButton } from "./chat-menu-button"
import { useChatContext } from "./hooks/use-chat-context"

export function ChatBoxPlaceholder() {
  const { isInitialLoading } = useChatContext()

  return (
    <Card className="grow h-[calc(100vh-11.5rem)] md:h-[calc(100vh-18.5rem)]">
      <CardContent className="size-full flex flex-col justify-center items-center gap-2 p-0">
        {isInitialLoading ? (
          <>
            <Loader2 className="size-12 text-muted-foreground animate-spin" />
            <p className="text-muted-foreground">
              Loading conversations...
            </p>
          </>
        ) : (
          <>
            <MessageCircleDashed className="size-24 text-primary/50" />
            <p className="text-muted-foreground">
              Select a chat to start a conversation.
            </p>
            <ChatMenuButton />
          </>
        )}
      </CardContent>
    </Card>
  )
}
