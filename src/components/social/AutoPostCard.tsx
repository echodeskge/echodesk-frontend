"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  CheckCircle, XCircle, Clock, AlertTriangle, Send,
  Facebook, Instagram, Edit2, Eye, ThumbsUp, ThumbsDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import type { AutoPostContent } from "@/hooks/api/useAutoPost";
import { useApprovePost, useRejectPost, useEditPost, usePublishPost } from "@/hooks/api/useAutoPost";
import { toast } from "sonner";

const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
  draft: { icon: Edit2, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  approved: { icon: Clock, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  published: { icon: CheckCircle, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  failed: { icon: AlertTriangle, color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  rejected: { icon: XCircle, color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
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

  const { icon: StatusIcon, color: statusColor } = statusConfig[post.status] || statusConfig.draft;

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
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Image thumbnail */}
            {post.image_url && (
              <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted">
                <img src={post.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={statusColor}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {t(`status.${post.status}`)}
                </Badge>
                {post.featured_product_name && (
                  <Badge variant="outline">{post.featured_product_name}</Badge>
                )}
                <div className="flex items-center gap-1 ml-auto text-muted-foreground">
                  {post.target_facebook && <Facebook className="h-4 w-4" />}
                  {post.target_instagram && <Instagram className="h-4 w-4" />}
                </div>
              </div>

              <p className="text-sm text-foreground line-clamp-2 mb-2">
                {post.facebook_text || post.instagram_text}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{t("scheduledFor")}: {format(new Date(post.scheduled_for), "MMM d, yyyy HH:mm")}</span>
                {post.published_at && (
                  <span>{t("publishedAt")}: {format(new Date(post.published_at), "MMM d, yyyy HH:mm")}</span>
                )}
              </div>

              {post.error_message && (
                <p className="text-xs text-destructive mt-1">{post.error_message}</p>
              )}

              {post.status === 'rejected' && post.rejection_reason && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t("rejectionReason")}: {post.rejection_reason}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setShowPreview(true)} title={t("preview")}>
                <Eye className="h-4 w-4" />
              </Button>
              {(post.status === 'draft' || post.status === 'rejected') && (
                <>
                  <Button variant="ghost" size="icon" onClick={() => setShowEdit(true)} title={tCommon("edit")}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleApprove} disabled={approvePost.isPending} title={t("approve")}>
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  {post.status === 'draft' && (
                    <Button variant="ghost" size="icon" onClick={() => setShowReject(true)} title={t("reject")}>
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              {(post.status === 'approved' || post.status === 'failed') && (
                <Button variant="ghost" size="icon" onClick={handlePublish} disabled={publishPost.isPending} title={t("publishNow")}>
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
