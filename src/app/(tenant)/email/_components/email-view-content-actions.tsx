"use client";

import { useRouter } from "next/navigation";
import { MoreVertical, Star, Trash2 } from "lucide-react";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { useEmailAction } from "@/hooks/api/useSocial";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EmailViewContentActionsProps {
  email: EmailMessage;
}

export function EmailViewContentActions({
  email,
}: EmailViewContentActionsProps) {
  const emailAction = useEmailAction();
  const router = useRouter();

  function handleDelete() {
    emailAction.mutate(
      { message_ids: [email.id], action: "delete" },
      { onSuccess: () => router.back() }
    );
  }

  function handleToggleStar() {
    emailAction.mutate({
      message_ids: [email.id],
      action: email.is_starred ? "unstar" : "star",
    });
  }

  function handleMarkUnread() {
    emailAction.mutate(
      { message_ids: [email.id], action: "mark_unread" },
      { onSuccess: () => router.back() }
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete email"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={email.is_starred ? "Unstar email" : "Star email"}
          onClick={handleToggleStar}
        >
          <Star
            className={cn(
              "h-4 w-4",
              email.is_starred
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            )}
          />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleMarkUnread}>
              Mark as unread
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
