"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import axiosInstance from "@/api/axios";
import { useBugReport } from "@/contexts/BugReportContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileDropzone, UploadedFile } from "@/components/FileDropzone";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Priority = "high" | "medium" | "low";

const PRIORITIES: Priority[] = ["high", "medium", "low"];
const MAX_FILES = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB — mirrors FileDropzone props below

export function BugReportDialog() {
  const { isOpen, closeBugReport } = useBugReport();
  const t = useTranslations("bugReport");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setFiles([]);
  };

  const handleClose = () => {
    if (!submitting) {
      closeBugReport();
      resetForm();
    }
  };

  const handleFilesSelected = (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map((file) => ({
      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));
    setFiles((prev) => [...prev, ...uploadedFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (submitting) return;

    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    const pasted: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) pasted.push(file);
      }
    }

    if (pasted.length === 0) return;
    e.preventDefault();

    let oversizeCount = 0;
    const sizeOk = pasted.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        oversizeCount += 1;
        return false;
      }
      return true;
    });

    const remaining = Math.max(0, MAX_FILES - files.length);
    const toAdd = sizeOk.slice(0, remaining);
    const maxDropped = sizeOk.length - toAdd.length;

    if (toAdd.length > 0) {
      handleFilesSelected(toAdd);
    }

    if (oversizeCount > 0 || maxDropped > 0) {
      const parts: string[] = [];
      if (toAdd.length > 0) parts.push(`${toAdd.length} added`);
      if (maxDropped > 0) parts.push(`${maxDropped} skipped (max ${MAX_FILES})`);
      if (oversizeCount > 0) parts.push(`${oversizeCount} skipped (too large)`);
      toast.info(parts.join(" · "));
    }
  }, [submitting, files.length]);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("priority", priority);
      formData.append("url", window.location.href);
      files.forEach((f) => formData.append("files", f.file));

      await axiosInstance.post("/api/support/report-bug/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(t("success"));
      closeBugReport();
      resetForm();
    } catch {
      toast.error(t("error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2" onPaste={handlePaste}>
          <div className="space-y-2">
            <Label htmlFor="bug-title">{t("fieldTitle")} *</Label>
            <Input
              id="bug-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("fieldTitlePlaceholder")}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bug-description">{t("fieldDescription")}</Label>
            <Textarea
              id="bug-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("fieldDescriptionPlaceholder")}
              rows={4}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("fieldPriority")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={submitting}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "rounded-lg border-2 p-3 text-center transition-colors",
                    priority === p
                      ? "border-primary bg-primary/10"
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <div className="text-sm font-medium">
                    {t(`priority.${p}`)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(`sla.${p}`)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("fieldAttachments")}</Label>
            <FileDropzone
              onFilesSelected={handleFilesSelected}
              files={files}
              onRemoveFile={handleRemoveFile}
              maxFiles={MAX_FILES}
              maxSize={MAX_FILE_SIZE}
              disabled={submitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
