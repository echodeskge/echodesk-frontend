"use client";

/**
 * Detail main column (plan FE-10; design B, D119–D146).
 *
 * Three gap items in the shell's 22px-gap column:
 * 1. meta row, title and description (an inner 10px-gap block);
 * 2. the Checklist card (open by default);
 * 3. the Attachments card (collapsed by default).
 * Plus the page drop zone: on desktop the whole page accepts dropped files,
 * which upload to this ticket and open the Attachments card.
 *
 * Rights: title and description follow `perms.can_edit`. Checklist and
 * uploads are open to every viewer (the server only checks visibility,
 * A11/A12). Removing a file: the uploader, staff or `can_edit`.
 */
import { useState } from "react";
import type { TicketAttachment } from "@/api/generated/interfaces";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useTicketPermissions } from "../../../_hooks/use-ticket-permissions";
import type { DetailMainProps } from "../section-contracts";
import { AttachmentsCard } from "./attachments-card";
import { ChecklistCard } from "./checklist-card";
import { DetailDescription } from "./detail-description";
import { DetailMeta } from "./detail-meta";
import { DetailTitle } from "./detail-title";
import { PageDropOverlay, usePageDropZone, useTouchDevice } from "./page-drop-zone";
import { useAttachmentMutations } from "./use-main-mutations";

export function DetailMain({ ticket, perms }: DetailMainProps) {
  const { data: profile } = useUserProfile();
  const { isStaff } = useTicketPermissions();
  const touch = useTouchDevice();
  const [filesOpen, setFilesOpen] = useState(false);
  const files = useAttachmentMutations(ticket.id);
  const attachments: TicketAttachment[] = Array.isArray(ticket.attachments) ? ticket.attachments : [];

  const upload = (list: File[]) => {
    setFilesOpen(true);
    files.upload(list);
  };
  const { dragging } = usePageDropZone({ enabled: !touch, onFiles: upload });

  const canRemove = (a: TicketAttachment) =>
    perms.can_edit || isStaff || (profile?.id != null && a.uploaded_by?.id === profile.id);

  return (
    <>
      <div data-slot="detail-main" className="flex flex-col gap-2.5">
        <DetailMeta ticket={ticket} />
        <DetailTitle ticketId={ticket.id} title={ticket.title} canEdit={perms.can_edit} />
        <DetailDescription ticket={ticket} canEdit={perms.can_edit} />
      </div>
      <ChecklistCard ticketId={ticket.id} items={ticket.checklist_items} />
      <AttachmentsCard
        attachments={attachments}
        uploads={files.uploads}
        onUpload={upload}
        onRemove={(a) => void files.remove(a)}
        canRemove={canRemove}
        open={filesOpen}
        onOpenChange={setFilesOpen}
        touch={touch}
      />
      <PageDropOverlay visible={dragging} />
    </>
  );
}
