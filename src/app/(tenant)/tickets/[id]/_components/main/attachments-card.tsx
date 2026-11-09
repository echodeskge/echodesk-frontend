"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TicketAttachment } from "@/api/generated/interfaces";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CollapsibleCard } from "../../../_components/primitives/collapsible-card";
import { fileIcon, formatFileSize, isImageType, isPreviewable, userName } from "./main-utils";
import type { PendingUpload } from "./use-main-mutations";

export interface AttachmentsCardProps {
  attachments: TicketAttachment[];
  uploads: PendingUpload[];
  onUpload: (files: File[]) => void;
  onRemove: (attachment: TicketAttachment) => void;
  /** Uploader, staff or `can_edit` (A12). */
  canRemove: (attachment: TicketAttachment) => boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Touch devices get the "tap Upload" empty text (DC27). */
  touch: boolean;
}

/**
 * Attachments card (D142–D146), collapsed by default, with the count.
 *
 * Upload (header action, 26px) opens the file picker; it stops propagation so
 * it never toggles the card. The body is a grid of ≥ 220px tiles: a 30px type
 * icon (a thumbnail for images), the name, "{size} · {uploader}" and remove.
 * A tile opens `file_url` in a new tab (`rel="noopener"`); types a browser
 * can't show get `download` (DC26). Uploads in flight show a progress bar.
 */
export function AttachmentsCard({
  attachments,
  uploads,
  onUpload,
  onRemove,
  canRemove,
  open,
  onOpenChange,
  touch,
}: AttachmentsCardProps) {
  const t = useTranslations("ticketsScreen.attachments");
  const tMain = useTranslations("ticketsScreen.detail.main");
  const input = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<TicketAttachment | null>(null);
  const count = attachments.length + uploads.length;

  const action = (
    <>
      <button
        type="button"
        data-slot="attachments-upload"
        onClick={(e) => {
          e.stopPropagation();
          input.current?.click();
        }}
        className="inline-flex h-[26px] items-center gap-[5px] rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Upload aria-hidden="true" size={13} />
        {t("upload")}
      </button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        data-testid="attachments-input"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) {
            onOpenChange(true);
            onUpload(files);
          }
        }}
      />
    </>
  );

  return (
    <>
      <CollapsibleCard
        title={t("title")}
        summary={<span data-slot="attachments-count">{count}</span>}
        action={action}
        open={open}
        onOpenChange={onOpenChange}
        bodyClassName="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2"
      >
        {attachments.map((a) => (
          <AttachmentTile
            key={a.id}
            attachment={a}
            removable={canRemove(a)}
            onRemove={() => setConfirm(a)}
          />
        ))}
        {uploads.map((u) => (
          <UploadTile key={u.key} upload={u} />
        ))}
        {count === 0 && (
          <p data-slot="attachments-empty" className="col-span-full py-1 text-xs text-muted-foreground">
            {touch ? t("emptyTouch") : t("empty")}
          </p>
        )}
      </CollapsibleCard>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">{t("removeConfirm", { name: confirm?.filename ?? "" })}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tMain("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (confirm) onRemove(confirm);
                setConfirm(null);
              }}
            >
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AttachmentTile({
  attachment,
  removable,
  onRemove,
}: {
  attachment: TicketAttachment;
  removable: boolean;
  onRemove: () => void;
}) {
  const t = useTranslations("ticketsScreen.attachments");
  const Icon = fileIcon(attachment.content_type, attachment.filename);
  const image = isImageType(attachment.content_type) && !!attachment.file_url;
  const previewable = isPreviewable(attachment.content_type);
  const uploader = userName(attachment.uploaded_by);
  const size = formatFileSize(attachment.file_size);
  return (
    <div
      data-slot="attachment-tile"
      className="group relative flex min-w-0 items-center gap-2.5 rounded-[8px] border px-2.5 py-2 transition-colors hover:bg-muted/40"
    >
      <a
        href={attachment.file_url}
        target="_blank"
        rel="noopener noreferrer"
        download={previewable ? undefined : attachment.filename}
        aria-label={previewable ? t("open", { name: attachment.filename }) : t("download", { name: attachment.filename })}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote user files, no Next image loader
          <img
            src={attachment.file_url}
            alt=""
            loading="lazy"
            className="size-[30px] shrink-0 rounded-md bg-muted object-cover"
          />
        ) : (
          <span className="flex size-[30px] shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon aria-hidden="true" size={14} />
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs font-medium leading-5">{attachment.filename}</span>
          <span className="truncate text-[11px] leading-4 text-muted-foreground tabular-nums">
            {uploader ? t("meta", { size, name: uploader }) : size}
          </span>
        </span>
      </a>
      {removable && (
        <button
          type="button"
          aria-label={t("remove")}
          title={t("remove")}
          onClick={onRemove}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" size={12} />
        </button>
      )}
    </div>
  );
}

function UploadTile({ upload }: { upload: PendingUpload }) {
  const t = useTranslations("ticketsScreen.attachments");
  const Icon = fileIcon(null, upload.name);
  return (
    <div
      data-slot="upload-tile"
      aria-busy="true"
      className="flex min-w-0 items-center gap-2.5 rounded-[8px] border border-dashed px-2.5 py-2"
    >
      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon aria-hidden="true" size={14} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-xs font-medium leading-5">{upload.name}</span>
        <span
          role="progressbar"
          aria-label={t("uploadingFile", { name: upload.name })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={upload.progress}
          className="block h-1 overflow-hidden rounded-full bg-muted"
        >
          <span className="block h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${upload.progress}%` }} />
        </span>
      </span>
    </div>
  );
}
