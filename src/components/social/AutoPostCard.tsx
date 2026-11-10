"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  CheckCircle, XCircle, Clock, AlertTriangle, Send,
  Facebook, Instagram, Edit2, Eye, ThumbsUp, ThumbsDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { rdButton } from "@/components/redesign/buttons";
import { TONE_CLASS, type Tone } from "@/components/redesign/tones";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import type { AutoPostContent } from "@/hooks/api/useAutoPost";
import { useApprovePost, useRejectPost, useEditPost, usePublishPost } from "@/hooks/api/useAutoPost";
import { toast } from "sonner";

const statusConfig: Record<string, { icon: React.ElementType; tone: Tone }> = {
  draft: { icon: Edit2, tone: "info" },
  approved: { icon: Clock, tone: "success" },
  published: { icon: CheckCircle, tone: "success" },
  failed: { icon: AlertTriangle, tone: "danger" },
  rejected: { icon: XCircle, tone: "neutral" },
};

interface AutoPostCardProps {
  post: AutoPostContent;
}

export function AutoPostCard({ post }: AutoPostCardProps) {
  const t = useTranslations("autoPosting");
  const tCommon = useTranslations("common");
  const [showPreview, setShowPreview] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [editFbText, setEditFbText] = useState(post.facebook_text);
  const [editIgText, setEditIgText] = useState(post.instagram_text);
  const [rejectReason, setRejectReason] = useState("");

  const approvePost = useApprovePost();
  const rejectPost = useRejectPost();
  const editPost = useEditPost();
  const publishPost = usePublishPost();

  const { icon: StatusIcon, tone: statusTone } = statusConfig[post.status] || statusConfig.draft;

  const handleApprove = async () => {
    try {
      await approvePost.mutateAsync(post.id);
      toast.success(t("postApproved"));
    } catch {
      toast.error(t("approveError"));
    }
  };

  const handleReject = async () => {
    try {
      await rejectPost.mutateAsync({ id: post.id, reason: rejectReason });
      setShowReject(false);
      setRejectReason("");
      toast.success(t("postRejected"));
    } catch {
      toast.error(t("rejectError"));
    }
  };

  const handleEdit = async () => {
    try {
      await editPost.mutateAsync({
        id: post.id,
        data: { facebook_text: editFbText, instagram_text: editIgText },
      });
      setShowEdit(false);
      toast.success(t("postEdited"));
    } catch {
      toast.error(t("editError"));
    }
  };

  const handlePublish = async () => {
    try {
      await publishPost.mutateAsync(post.id);
      toast.success(t("postPublished"));
    } catch {
      toast.error(t("publishError"));
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-start gap-3 border-b px-4 py-3 last:border-b-0 sm:flex-nowrap" data-testid="auto-post-row">
        {/* Image thumbnail */}
        {post.image_url && (
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
            <img src={post.image_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex h-5 items-center gap-1 rounded border px-[7px] text-[11px] font-medium", TONE_CLASS[statusTone])}>
              <StatusIcon className="h-3 w-3" aria-hidden />
              {t(`status.${post.status}`)}
            </span>
            {post.featured_product_name && (
              <span className="inline-flex h-5 max-w-full items-center truncate rounded border px-[7px] text-[11px] text-muted-foreground">
                {post.featured_product_name}
              </span>
            )}
            <div className="ms-auto flex items-center gap-1 text-muted-foreground">
              {post.target_facebook && <Facebook className="h-3.5 w-3.5" aria-label="Facebook" />}
              {post.target_instagram && <Instagram className="h-3.5 w-3.5" aria-label="Instagram" />}
            </div>
          </div>

          <p className="mb-1.5 line-clamp-2 text-[13px] text-foreground">
            {post.facebook_text || post.instagram_text}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
            <span>{t("scheduledFor")}: {format(new Date(post.scheduled_for), "MMM d, yyyy HH:mm")}</span>
            {post.published_at && (
              <span>{t("publishedAt")}: {format(new Date(post.published_at), "MMM d, yyyy HH:mm")}</span>
            )}
          </div>

          {post.error_message && (
            <p className="mt-1 text-xs text-destructive">{post.error_message}</p>
          )}

          {post.status === 'rejected' && post.rejection_reason && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("rejectionReason")}: {post.rejection_reason}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" className={rdButton.ghostIconSm} onClick={() => setShowPreview(true)} title={t("preview")} aria-label={t("preview")}>
            <Eye className="h-4 w-4" aria-hidden />
          </button>
          {(post.status === 'draft' || post.status === 'rejected') && (
            <>
              <button type="button" className={rdButton.ghostIconSm} onClick={() => setShowEdit(true)} title={tCommon("edit")} aria-label={tCommon("edit")}>
                <Edit2 className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" className={rdButton.ghostIconSm} onClick={handleApprove} disabled={approvePost.isPending} title={t("approve")} aria-label={t("approve")}>
                <ThumbsUp className="h-4 w-4" aria-hidden />
              </button>
              {post.status === 'draft' && (
                <button type="button" className={rdButton.ghostIconSm} onClick={() => setShowReject(true)} title={t("reject")} aria-label={t("reject")}>
                  <ThumbsDown className="h-4 w-4" aria-hidden />
                </button>
              )}
            </>
          )}
          {(post.status === 'approved' || post.status === 'failed') && (
            <button type="button" className={rdButton.ghostIconSm} onClick={handlePublish} disabled={publishPost.isPending} title={t("publishNow")} aria-label={t("publishNow")}>
              <Send className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("preview")}</DialogTitle>
            <DialogDescription>{t("previewDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {post.image_url && (
              <img src={post.image_url} alt="" className="w-full rounded-lg" />
            )}
            {post.target_facebook && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Facebook className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Facebook</span>
                </div>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">{post.facebook_text}</p>
              </div>
            )}
            {post.target_instagram && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Instagram className="h-4 w-4 text-pink-600" />
                  <span className="text-sm font-medium">Instagram</span>
                </div>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">{post.instagram_text}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("editPost")}</DialogTitle>
            <DialogDescription>{t("editPostDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-1">
                <Facebook className="h-4 w-4 text-blue-600" /> Facebook
              </label>
              <Textarea value={editFbText} onChange={e => setEditFbText(e.target.value)} rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-1">
                <Instagram className="h-4 w-4 text-pink-600" /> Instagram
              </label>
              <Textarea value={editIgText} onChange={e => setEditIgText(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>{tCommon("cancel")}</Button>
            <Button onClick={handleEdit} disabled={editPost.isPending}>{tCommon("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rejectPost")}</DialogTitle>
            <DialogDescription>{t("rejectPostDescription")}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t("rejectReasonPlaceholder")}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>{tCommon("cancel")}</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectPost.isPending}>{t("reject")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
