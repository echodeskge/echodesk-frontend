import type { ReactNode } from "react"
import type { MessageType } from "@/components/chat/types"

import { cn } from "@/lib/utils"

import { MessageBubbleContentFiles } from "./message-bubble-content-files"
import { MessageBubbleContentImages } from "./message-bubble-content-images"
import { MessageBubbleContentText } from "./message-bubble-content-text"

export function MessageBubbleContent({
  message,
  isByCurrentUser,
}: {
  message: MessageType
  isByCurrentUser: boolean
}) {
  // Collect all content parts - messages can have text AND attachments
  const contentParts: ReactNode[] = []

  // Add images if present
  if (message.images && message.images.length > 0) {
    contentParts.push(
      <MessageBubbleContentImages key="images" images={message.images} />
    )
  }

  // Add voice message if present
  if (message.voiceMessage) {
    contentParts.push(
      <audio key="voice" controls src={message.voiceMessage.url} className="max-w-full" />
    )
  }

  // Add files if present
  if (message.files && message.files.length > 0) {
    contentParts.push(
      <MessageBubbleContentFiles
        key="files"
        files={message.files}
        isByCurrentUser={isByCurrentUser}
      />
    )
  }

  // Add text if present (show text after media)
  if (message.text) {
    contentParts.push(
      <MessageBubbleContentText key="text" text={message.text} />
    )
  }

  // If no content at all, show nothing
  if (contentParts.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "text-sm text-accent-foreground bg-accent p-2 space-y-2 rounded-lg break-all",
        isByCurrentUser
          ? "bg-primary text-primary-foreground rounded-se-none"
          : "rounded-ss-none"
      )}
    >
      {contentParts}
    </div>
  )
}
