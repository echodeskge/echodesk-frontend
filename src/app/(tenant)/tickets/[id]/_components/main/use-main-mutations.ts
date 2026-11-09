"use client";

/**
 * Checklist and attachment writes for the detail main column (FE-10).
 *
 * Every write carries a remembered mutation id (E11), so this tab ignores its
 * own `ticket_activity` echo. The response is written into `tk.ticket(id)`
 * (the checklist and the attachments live in the detail payload), and the
 * activity feed and the board/list caches (card counts) are refreshed.
 * Errors become translated toasts and refetch the ticket (E33: never restore
 * a local snapshot).
 */
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { TicketAttachment } from "@/api/generated/interfaces";
import {
  checklistCreate,
  checklistDelete,
  checklistReorder,
  checklistToggle,
  checklistUpdate,
  deleteAttachment,
  uploadAttachment,
} from "../../../_lib/api";
import { newMutationId, rememberMutation } from "../../../_lib/mutation-id";
import { tk } from "../../../_lib/query-keys";
import type { TicketChecklistItem, TicketDetail } from "../../../_lib/types";
import { invalidateTicketCollections, ticketErrorKey } from "../../../_hooks/use-ticket-mutations";
import { MAX_FILE_MB, MAX_FILES, moveChecklistItem, nextChecklistPosition, reorderTargetPosition, sortChecklist, validateFiles } from "./main-utils";

function mid(): string {
  const id = newMutationId();
  rememberMutation(id);
  return id;
}

function boardIdOf(ticket: TicketDetail | undefined): number | undefined {
  return ticket?.board?.id ?? ticket?.column?.board ?? undefined;
}

function withChecklist(prev: TicketDetail, items: TicketChecklistItem[]): TicketDetail {
  return {
    ...prev,
    checklist_items: items,
    checklist_items_count: items.length,
    completed_checklist_items_count: items.filter((i) => i.is_checked).length,
  };
}

function attachmentsOf(ticket: TicketDetail | undefined): TicketAttachment[] {
  return Array.isArray(ticket?.attachments) ? ticket.attachments : [];
}

/** Cache helpers shared by the checklist and attachment writes. */
function useDetailCache(ticketId: number) {
  const qc = useQueryClient();
  const t = useTranslations("tickets");

  const get = useCallback(() => qc.getQueryData<TicketDetail>(tk.ticket(ticketId)), [qc, ticketId]);
  const update = useCallback(
    (fn: (prev: TicketDetail) => TicketDetail) =>
      qc.setQueryData<TicketDetail>(tk.ticket(ticketId), (prev) => (prev ? fn(prev) : prev)),
    [qc, ticketId],
  );
  /** After a successful write: the feed and the card counts. */
  const settled = useCallback(() => {
    qc.invalidateQueries({ queryKey: tk.activity(ticketId) });
    invalidateTicketCollections(qc, boardIdOf(get()));
  }, [qc, ticketId, get]);
  const failed = useCallback(
    (error: unknown) => {
      qc.invalidateQueries({ queryKey: tk.ticket(ticketId) });
      toast.error(t(ticketErrorKey(error, "saveError")));
    },
    [qc, t, ticketId],
  );
  const refetch = useCallback(() => qc.invalidateQueries({ queryKey: tk.ticket(ticketId) }), [qc, ticketId]);
  return { get, update, settled, failed, refetch };
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export function useChecklistMutations(ticketId: number) {
  const cache = useDetailCache(ticketId);
  const t = useTranslations("ticketsScreen.checklist");
  const items = () => sortChecklist(cache.get()?.checklist_items);

  const add = async (text: string) => {
    const value = text.trim();
    if (!value) return;
    try {
      const created = await checklistCreate(
        { ticket: ticketId, text: value, position: nextChecklistPosition(items()) },
        mid(),
      );
      cache.update((prev) => withChecklist(prev, sortChecklist([...(prev.checklist_items ?? []), created])));
      cache.settled();
    } catch (error) {
      cache.failed(error);
    }
  };

  const toggle = async (item: TicketChecklistItem) => {
    // Optimistic: flip at once, then take the server row (checked_by / _at).
    cache.update((prev) =>
      withChecklist(
        prev,
        (prev.checklist_items ?? []).map((i) => (i.id === item.id ? { ...i, is_checked: !i.is_checked } : i)),
      ),
    );
    try {
      const saved = await checklistToggle(item.id, mid());
      cache.update((prev) =>
        withChecklist(prev, (prev.checklist_items ?? []).map((i) => (i.id === saved.id ? { ...i, ...saved } : i))),
      );
      cache.settled();
    } catch (error) {
      cache.failed(error);
    }
  };

  const rename = async (item: TicketChecklistItem, text: string) => {
    const value = text.trim();
    if (!value || value === item.text) return;
    cache.update((prev) =>
      withChecklist(prev, (prev.checklist_items ?? []).map((i) => (i.id === item.id ? { ...i, text: value } : i))),
    );
    try {
      const saved = await checklistUpdate(item.id, { text: value }, mid());
      cache.update((prev) =>
        withChecklist(prev, (prev.checklist_items ?? []).map((i) => (i.id === saved.id ? { ...i, ...saved } : i))),
      );
      cache.settled();
    } catch (error) {
      cache.failed(error);
    }
  };

  /** Re-create a removed item where it was (the Undo of `remove`). */
  const restore = async (item: TicketChecklistItem) => {
    try {
      let created = await checklistCreate({ ticket: ticketId, text: item.text, position: item.position }, mid());
      if (item.is_checked) created = await checklistToggle(created.id, mid());
      cache.update((prev) => withChecklist(prev, sortChecklist([...(prev.checklist_items ?? []), created])));
      cache.settled();
    } catch (error) {
      cache.failed(error);
    }
  };

  /** No confirm(): the item goes at once and the toast offers Undo. */
  const remove = async (item: TicketChecklistItem) => {
    cache.update((prev) => withChecklist(prev, (prev.checklist_items ?? []).filter((i) => i.id !== item.id)));
    try {
      await checklistDelete(item.id, mid());
      cache.settled();
      toast(t("removed"), { action: { label: t("undo"), onClick: () => void restore(item) } });
    } catch (error) {
      cache.failed(error);
    }
  };

  const reorder = async (from: number, to: number) => {
    const list = items();
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return;
    const item = list[from];
    const position = reorderTargetPosition(list, from, to);
    cache.update((prev) => withChecklist(prev, moveChecklistItem(sortChecklist(prev.checklist_items), from, to)));
    try {
      await checklistReorder(item.id, position, mid());
      // The server renumbers its neighbours: take its positions.
      cache.refetch();
      cache.settled();
    } catch (error) {
      cache.failed(error);
    }
  };

  return { add, toggle, rename, remove, restore, reorder };
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export interface PendingUpload {
  key: string;
  name: string;
  size: number;
  progress: number;
}

let uploadSeq = 0;

export function useAttachmentMutations(ticketId: number) {
  const cache = useDetailCache(ticketId);
  const t = useTranslations("ticketsScreen.attachments");
  const [uploads, setUploads] = useState<PendingUpload[]>([]);

  const uploadOne = async (file: File) => {
    const key = `u${++uploadSeq}`;
    setUploads((list) => [...list, { key, name: file.name, size: file.size, progress: 0 }]);
    try {
      const saved = await uploadAttachment(
        ticketId,
        file,
        (progress) => setUploads((list) => list.map((u) => (u.key === key ? { ...u, progress } : u))),
        mid(),
      );
      cache.update((prev) => ({ ...prev, attachments: [...attachmentsOf(prev), saved] }));
      cache.settled();
    } catch {
      toast.error(t("uploadFailed", { name: file.name }));
    } finally {
      setUploads((list) => list.filter((u) => u.key !== key));
    }
  };

  /** Validate (≤ 10 files, ≤ 10 MB each), then upload the accepted files in parallel. */
  const upload = (files: File[] | FileList | null | undefined) => {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    const { accepted, tooMany, tooLarge } = validateFiles(list);
    if (tooMany) toast.error(t("tooMany", { max: MAX_FILES }));
    if (tooLarge.length) toast.error(t("tooLarge", { max: MAX_FILE_MB }));
    accepted.forEach((file) => void uploadOne(file));
  };

  const remove = async (attachment: TicketAttachment) => {
    try {
      await deleteAttachment(attachment.id, mid());
      cache.update((prev) => ({ ...prev, attachments: attachmentsOf(prev).filter((a) => a.id !== attachment.id) }));
      cache.settled();
    } catch (error) {
      cache.failed(error);
    }
  };

  return { uploads, upload, remove };
}
