"use client"

import { MessageCircleMore, UserRound } from "lucide-react"
import { useTranslations } from "next-intl"

import type { TaskType } from "../types"

import { AvatarStack } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CardFooter } from "@/components/ui/card"

interface KanbanTaskItemFooterProps {
  task: TaskType
}

export function KanbanTaskItemFooter({ task }: KanbanTaskItemFooterProps) {
  const t = useTranslations("tickets")

  const avatars = task.assigned.map((member) => ({
    src: member.avatar,
    alt: member.name,
  }))

  return (
    <CardFooter className="items-center justify-between gap-2 px-3 pb-3 pt-0">
      {avatars.length > 0 ? (
        <AvatarStack
          avatars={avatars}
          limit={3}
          size="sm"
          fallbackClassName="bg-primary/10 text-primary font-medium"
        />
      ) : (
        <span
          className="flex size-7 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground"
          title={t("unassigned")}
        >
          <UserRound className="size-3.5" />
        </span>
      )}
      <Button variant="ghost" size="sm">
        <MessageCircleMore className="me-1.5 size-3.5 text-muted-foreground" />
        {task.comments.length}
      </Button>
    </CardFooter>
  )
}
