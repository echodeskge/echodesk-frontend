import { ExternalLink, Loader2 } from "lucide-react"
import { useState } from "react"
// Use the configured instance with the auth-token interceptor — the raw
// `axios` library doesn't attach the Bearer/Token header, which is why
// the previous version kept returning 401 on the WhatsApp media proxy.
import axios from "@/api/axios"

import type { MessageType } from "@/components/chat/types"

import { cn } from "@/lib/utils"

import { FileThumbnail } from "@/components/ui/file-thumbnail"

// URLs that require a Bearer token — browser <a href> can't attach it, so
// we fetch the blob via axios (which runs the auth interceptor) and open
// the resulting object URL. Mirrors the AuthenticatedImage / Authenticated
// Audio pattern used for image + audio attachments.
function needsAuthFetch(url: string | undefined | null): boolean {
  if (!url) return false
  return url.includes("/api/social/whatsapp-media/")
}

function AuthenticatedFileLink({
  file,
  isByCurrentUser,
}: {
  file: NonNullable<MessageType["files"]>[number]
  isByCurrentUser: boolean
}) {
  const [loading, setLoading] = useState(false)

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const res = await axios.get(file.url, { responseType: "blob" })
      const blobUrl = URL.createObjectURL(res.data)
      // Open in a new tab; revoke after a grace window so the tab has time
      // to start loading before we drop the reference.
      window.open(blobUrl, "_blank", "noopener,noreferrer")
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
    } catch {
      // Silent failure keeps the UI responsive; the user can retry. A toast
      // could be added via sonner if we want louder feedback later.
    } finally {
      setLoading(false)
    }
  }

  return (
    <a
      key={file.id || file.url}
      href={file.url}
      onClick={handleClick}
      className={cn(
        "flex justify-between items-center bg-muted-foreground/20 p-4 rounded-lg break-all hover:bg-muted-foreground/30 transition-colors cursor-pointer",
        isByCurrentUser && "bg-muted-foreground/40 hover:bg-muted-foreground/50"
      )}
      aria-label={`Open ${file.name}`}
      aria-busy={loading}
    >
      <FileThumbnail fileName={file.name} />
      <div className="flex-1 mx-2 truncate">
        <span className="truncate">{file.name}</span>
      </div>
      {loading ? (
        <Loader2 className="size-4 shrink-0 opacity-60 animate-spin" />
      ) : (
        <ExternalLink className="size-4 shrink-0 opacity-60" />
      )}
    </a>
  )
}

export function MessageBubbleContentFiles({
  files,
  isByCurrentUser,
}: {
  files: MessageType["files"]
  isByCurrentUser: boolean
}) {
  if (!files || !files.length) return null // Return null if the files are empty

  return files.map((file) => {
    if (needsAuthFetch(file.url)) {
      return (
        <AuthenticatedFileLink
          key={file.id || file.url}
          file={file}
          isByCurrentUser={isByCurrentUser}
        />
      )
    }
    return (
      <a
        key={file.id || file.url}
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex justify-between items-center bg-muted-foreground/20 p-4 rounded-lg break-all hover:bg-muted-foreground/30 transition-colors cursor-pointer",
          isByCurrentUser && "bg-muted-foreground/40 hover:bg-muted-foreground/50"
        )}
        aria-label={`Open ${file.name}`}
      >
        <FileThumbnail fileName={file.name} />
        <div className="flex-1 mx-2 truncate">
          <span className="truncate">{file.name}</span>
        </div>
        <ExternalLink className="size-4 shrink-0 opacity-60" />
      </a>
    )
  })
}
