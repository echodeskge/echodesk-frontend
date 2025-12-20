import { MessageCircleX } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { ChatMenuButton } from "./chat-menu-button"

export function ChatBoxNotFound() {
  return (
    <Card className="grow h-[calc(100vh-11.5rem)] md:h-[calc(100vh-18.5rem)]">
      <CardContent className="size-full flex flex-col justify-center items-center gap-2 p-0">
        <MessageCircleX className="size-24 text-primary/50" />
        <p className="text-muted-foreground">
          No chat found. Please select an existing chat or start a new
          conversation.
        </p>
        <ChatMenuButton />
      </CardContent>
    </Card>
  )
}
