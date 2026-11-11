import type { ReactNode } from "react"
import { useMemo } from "react"
import DOMPurify from "dompurify"
import { MapPin } from "lucide-react"
import type { MessageType } from "@/components/chat/types"
import { useAuthenticatedMedia } from "@/lib/authenticated-media"

import { cn } from "@/lib/utils"

import { MessageBubbleContentFiles } from "./message-bubble-content-files"
import { MessageBubbleContentImages } from "./message-bubble-content-images"
import { MessageBubbleContentText } from "./message-bubble-content-text"

/**
 * Audio behind the WhatsApp media proxy: fetched with the auth interceptor
 * through the shared, viewport-lazy cache in src/lib/authenticated-media.ts
 * (one request per media id, shared with images/videos of the same
 * attachment) and played from the resulting blob URL.
 */
function AuthenticatedAudio({ url, className }: { url: string; className?: string }) {
  const { blobUrl, error, ref } = useAuthenticatedMedia(url)

  if (error) {
    // Fallback: try the direct URL (works for non-authenticated URLs)
    return <audio controls src={url} className={className} />
  }

  if (!blobUrl) {
    return <div ref={ref} className="text-xs opacity-60 py-1">Loading audio...</div>
  }

  return <audio controls src={blobUrl} className={className} />
}

// Process email HTML to ensure images respect their width/height attributes
function processEmailHtml(html: string): string {
  if (!html) return html

  // Find img tags with width and/or height attributes and add inline styles
  return html.replace(
    /<img\s+([^>]*)>/gi,
    (match, attributes) => {
      // Extract width and height from attributes
      const widthMatch = attributes.match(/width=["']?(\d+)["']?/i)
      const heightMatch = attributes.match(/height=["']?(\d+)["']?/i)

      if (!widthMatch && !heightMatch) return match

      const width = widthMatch ? widthMatch[1] : null
      const height = heightMatch ? heightMatch[1] : null

      // Build inline style
      const styles: string[] = []
      if (width) styles.push(`width: ${width}px`)
      if (height) styles.push(`height: ${height}px`)
      styles.push('max-width: none')

      // Check if there's already a style attribute
      if (attributes.includes('style=')) {
        // Append to existing style
        return match.replace(
          /style=["']([^"']*)["']/i,
          `style="$1; ${styles.join('; ')}"`
        )
      } else {
        // Add new style attribute
        return `<img style="${styles.join('; ')}" ${attributes}>`
      }
    }
  )
}

export function MessageBubbleContent({
  message,
  isByCurrentUser,
  platform,
}: {
  message: MessageType
  isByCurrentUser: boolean
  platform?: "facebook" | "instagram" | "whatsapp" | "email" | "widget" | "telegram"
}) {
  // Collect all content parts - messages can have text AND attachments
  const contentParts: ReactNode[] = []

  // Shared location (WhatsApp) — "Open in Maps" card
  if (message.location) {
    const loc = message.location
    contentParts.push(
      <a
        key="location"
        href={loc.url || `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-2 rounded-md border bg-background/60 px-3 py-2 hover:bg-background transition-colors max-w-[260px] no-underline"
      >
        <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-rose-500" />
        <span className="min-w-0">
          <span className="block text-sm font-medium truncate">
            {loc.name || "Shared location"}
          </span>
          <span className="block text-xs opacity-70 truncate">
            {loc.address || `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`}
          </span>
          <span className="block text-xs underline mt-0.5">Open in Maps</span>
        </span>
      </a>
    )
  }

  // Add images if present
  if (message.images && message.images.length > 0) {
    contentParts.push(
      <MessageBubbleContentImages
        key="images"
        images={message.images}
        message={message}
        platform={platform}
      />
    )
  }

  // Add voice message if present
  if (message.voiceMessage) {
    contentParts.push(
      <AuthenticatedAudio key="voice" url={message.voiceMessage.url} className="max-w-full" />
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

  // Process email HTML: sanitize for XSS and ensure images respect their width/height attributes
  const processedBodyHtml = useMemo(
    () => {
      if (!isEmail || !message.bodyHtml) return message.bodyHtml
      const sanitized = DOMPurify.sanitize(processEmailHtml(message.bodyHtml), {
        ADD_TAGS: ['style'],
        ADD_ATTR: ['target', 'style'],
      })
      return sanitized
    },
    [isEmail, message.bodyHtml]
  )

  if (isEmail && processedBodyHtml) {
    contentParts.push(
      <div
        key="html"
        className="p-2 prose prose-sm max-w-none break-words overflow-x-auto [&_a]:text-blue-600 [&_a]:underline [&_table]:max-w-full [&_table]:overflow-x-auto email-html-content"
        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
        dangerouslySetInnerHTML={{ __html: processedBodyHtml }}
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
        "space-y-2 overflow-hidden break-words",
        isEmailMessage
          ? cn(
              "rounded-lg p-2 text-sm",
              isByCurrentUser
                ? "bg-blue-50 border border-blue-200 text-gray-900 rounded-se-none"
                : "bg-white border border-gray-200 text-gray-900 rounded-ss-none"
            )
          : cn(
              // Design bubbles: 13/19, 8×12 padding, 14px radius with the
              // tail corner at 4px; outgoing on primary, incoming on muted.
              "whitespace-pre-wrap rounded-[14px] px-3 py-2 text-[13px] leading-[19px]",
              isByCurrentUser
                ? "rounded-br-[4px] bg-primary text-primary-foreground"
                : "rounded-bl-[4px] bg-muted text-foreground"
            )
      )}
    >
      {contentParts}
    </div>
  )
}
