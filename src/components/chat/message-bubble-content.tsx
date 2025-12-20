import type { ReactNode } from "react"
import type { MessageType } from "@/components/chat/types"

import { cn } from "@/lib/utils"

import { MessageBubbleContentFiles } from "./message-bubble-content-files"
import { MessageBubbleContentImages } from "./message-bubble-content-images"
import { MessageBubbleContentText } from "./message-bubble-content-text"

function getPlatformBgClass(platform?: "facebook" | "instagram" | "whatsapp" | "email") {
  switch (platform) {
    case "facebook":
      return "bg-[#1877F2]" // Facebook blue
    case "instagram":
      return "bg-[#8C2FF5]" // Instagram purple
    case "whatsapp":
      return "bg-[#25D366]" // WhatsApp green
    case "email":
      return "bg-white border border-gray-200" // Email - white with border for better HTML rendering
    default:
      return "bg-primary"
  }
}

export function MessageBubbleContent({
  message,
  isByCurrentUser,
  platform,
}: {
  message: MessageType
  isByCurrentUser: boolean
  platform?: "facebook" | "instagram" | "whatsapp" | "email"
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

  // Add text/HTML content (show text after media)
  // For emails with HTML body, render as HTML to preserve signatures and formatting
  const isEmail = message.platform === 'email' || platform === 'email'
  if (isEmail && message.bodyHtml) {
    contentParts.push(
      <div
        key="html"
        className="p-2 prose prose-sm max-w-none break-words overflow-x-auto [&_a]:text-blue-600 [&_a]:underline [&_table]:max-w-full [&_table]:overflow-x-auto email-html-content"
        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
        dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
      />
    )
  } else if (message.text) {
    contentParts.push(
      <MessageBubbleContentText key="text" text={message.text} />
    )
  }

  // If no content at all, show nothing
  if (contentParts.length === 0) {
    return null
  }

  // Email messages get different styling for better HTML rendering
  const isEmailMessage = isEmail

  return (
    <div
      className={cn(
        "text-sm p-2 space-y-2 rounded-lg overflow-hidden",
        isEmailMessage ? "break-words" : "break-all",
        isByCurrentUser
          ? isEmailMessage
            ? "bg-blue-50 border border-blue-200 text-gray-900 rounded-se-none"
            : cn(getPlatformBgClass(platform), "text-white rounded-se-none")
          : isEmailMessage
            ? "bg-white border border-gray-200 text-gray-900 rounded-ss-none"
            : "bg-[#EFEFEF] text-gray-900 rounded-ss-none"
      )}
    >
      {contentParts}
    </div>
  )
}
