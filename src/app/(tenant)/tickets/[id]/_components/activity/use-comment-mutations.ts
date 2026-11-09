"use client";

/**
 * Comment writes for the detail page (plan FE-11, A8, WS11).
 *
 * Every request carries a remembered mutation id, so the board socket's echo
 * of this tab's own write is ignored (the shell's `use-detail-realtime`).
 * Success refetches the activity feed and the ticket (its `comments_count`),
 * plus the board/list caches so the card's comment count follows.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { invalidateTicketCollections } from "../../../_hooks/use-ticket-mutations";
import { createComment, deleteComment, errorStatus, updateComment } from "../../../_lib/api";
import { issueMutationId } from "../../../_lib/mutation-id";
import { tk } from "../../../_lib/query-keys";
import type { ActivityItem, TicketDetailComment } from "../../../_lib/types";

/** Fired after this tab posts a comment, so the feed can scroll it into view. */
export const COMMENT_POSTED_EVENT = "tickets:comment-posted";

export interface CommentPostedDetail {
  ticketId: number;
  commentId: number;
}

export function useCommentMutations(ticketId: number, boardId?: number | null) {
  const qc = useQueryClient();
  const t = useTranslations("ticketsScreen");
  const tTickets = useTranslations("tickets");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: tk.activity(ticketId) });
    qc.invalidateQueries({ queryKey: tk.ticket(ticketId) });
    invalidateTicketCollections(qc, boardId ?? undefined);
  };

  const errorText = (error: unknown, key: string) =>
    errorStatus(error) === 403 ? tTickets("toasts.forbidden") : t(key);

  const create = useMutation({
    mutationFn: (body: { comment: string; is_internal: boolean }) =>
      createComment({ ticket: ticketId, ...body }, issueMutationId()),
    onSuccess: (comment: TicketDetailComment) => {
      refresh();
      if (typeof window !== "undefined" && comment?.id) {
        window.dispatchEvent(
          new CustomEvent<CommentPostedDetail>(COMMENT_POSTED_EVENT, { detail: { ticketId, commentId: comment.id } }),
        );
      }
    },
    onError: (error) => toast.error(errorText(error, "composer.postError")),
  });

  const update = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => updateComment(id, { comment }, issueMutationId()),
    onSuccess: (_data, { id, comment }) => {
      qc.setQueryData<ActivityItem[]>(tk.activity(ticketId), (prev) =>
        prev?.map((item) =>
          item.type === "comment" && item.comment_id === id ? { ...item, text: comment, edited: true } : item,
        ),
      );
      refresh();
    },
    onError: (error) => toast.error(errorText(error, "activity.saveError")),
  });

  const remove = useMutation({
    mutationFn: ({ id }: { id: number }) => deleteComment(id, issueMutationId()),
    onSuccess: (_data, { id }) => {
      qc.setQueryData<ActivityItem[]>(tk.activity(ticketId), (prev) =>
        prev?.filter((item) => !(item.type === "comment" && item.comment_id === id)),
      );
      refresh();
      toast.success(t("activity.deleted"));
    },
    onError: (error) => toast.error(errorText(error, "activity.deleteError")),
  });

  return { createComment: create, updateComment: update, deleteComment: remove };
}
