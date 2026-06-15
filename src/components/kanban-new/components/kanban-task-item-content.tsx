"use client"

import type { TaskType } from "../types"

import { CardContent, CardTitle } from "@/components/ui/card"
import { MediaGrid } from "@/components/ui/media-grid"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { stripHtml } from "@/lib/stripHtml"

interface KanbanTaskItemContentProps {
  task: TaskType
}

export function KanbanTaskItemContent({ task }: KanbanTaskItemContentProps) {
  // Get all media attachments (images & videos)
  const mediaAttachments = task.attachments
    .filter(
      (attachment) =>
        attachment.type.includes("image") || attachment.type.includes("video")
    )
    .map((attachment) => ({
      src: attachment.url,
      alt: attachment.name || "Task attachment",
      type: attachment.type.includes("video")
        ? ("VIDEO" as const)
        : ("IMAGE" as const),
    }))

  // Ticket descriptions are HTML when description_format === "html" (the
  // default). Strip tags + decode entities here so the kanban card and its
  // hover preview render readable plain text instead of "<p>…</p>" literals.
  const description = stripHtml(task.description)
  const hasDescription = description.length > 0

  return (
    <CardContent>
      {hasDescription ? (
        <HoverCard openDelay={300} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div className="cursor-default">
              <CardTitle className="text-sm leading-snug">
                {task.title}
              </CardTitle>
              <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-snug whitespace-pre-line">
                {description}
              </p>
            </div>
          </HoverCardTrigger>
          <HoverCardContent
            side="top"
            align="start"
            className="w-80 max-h-72 overflow-y-auto"
          >
            <p className="text-sm font-medium leading-snug">{task.title}</p>
            <p className="mt-2 text-xs text-muted-foreground whitespace-pre-line">
              {description}
            </p>
          </HoverCardContent>
        </HoverCard>
      ) : (
        <CardTitle className="text-sm leading-snug">{task.title}</CardTitle>
      )}

      {/* Display media grid if there are attachments */}
      {mediaAttachments.length > 0 && (
        <MediaGrid data={mediaAttachments} className="mt-2" />
      )}
    </CardContent>
  )
}
