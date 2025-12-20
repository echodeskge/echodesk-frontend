import { ExternalLink } from "lucide-react"

import type { MessageType } from "@/components/chat/types"

import { cn } from "@/lib/utils"

import { FileThumbnail } from "@/components/ui/file-thumbnail"

export function MessageBubbleContentFiles({
  files,
  isByCurrentUser,
}: {
  files: MessageType["files"]
  isByCurrentUser: boolean
}) {
  if (!files || !files.length) return null // Return null if the files are empty

  return files.map((file) => (
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
  ))
}
