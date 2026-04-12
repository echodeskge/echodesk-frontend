"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { Ticket } from "@/api/generated/interfaces";
import { ticketsRetrieve } from "@/api/generated/api";
import { TicketDescription } from "./TicketDescription";
import { TicketActivityTimeline } from "./TicketActivityTimeline";
import { TicketCommentInput } from "./TicketCommentInput";
import ChecklistItemList from "@/components/ChecklistItemList";
import { TicketFormsSection } from "@/components/TicketFormsSection";
import { FileDropzone, UploadedFile } from "@/components/FileDropzone";
import axiosInstance from "@/api/axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";

interface TicketDetailMainProps {
  ticket: Ticket;
  onUpdate: (ticket: Ticket) => void;
}

export function TicketDetailMain({ ticket, onUpdate }: TicketDetailMainProps) {
  const t = useTranslations("tickets");
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const refreshTicket = useCallback(async () => {
    try {
      const fresh = await ticketsRetrieve(ticket.id.toString());
      onUpdate(fresh);
    } catch (err) {
      console.error("Error refreshing ticket:", err);
    }
  }, [ticket.id, onUpdate]);

  const handleCommentAdded = () => {
    setActivityRefreshKey((k) => k + 1);
    refreshTicket();
  };

  const handleFilesSelected = (files: File[]) => {
    const newFiles = files.map((file) => ({
      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async () => {
    if (uploadedFiles.length === 0) return;
    setUploadingFiles(true);
    try {
      for (const uploaded of uploadedFiles) {
        const formData = new FormData();
        formData.append("file", uploaded.file);
        formData.append("ticket", ticket.id.toString());
        await axiosInstance.post("/api/attachments/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setUploadedFiles([]);
      await refreshTicket();
      toast.success("Files uploaded successfully");
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files");
    } finally {
      setUploadingFiles(false);
    }
  };

  const attachments = (ticket as any).attachments || [];

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          {t("description")}
        </h3>
        <TicketDescription ticket={ticket} onUpdate={onUpdate} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="activity">
            {t("ticketDetail.activity")}
          </TabsTrigger>
          <TabsTrigger value="checklist">
            {t("ticketDetail.checklist")}
          </TabsTrigger>
          <TabsTrigger value="files">
            {t("ticketDetail.files")}
            {Array.isArray(attachments) && attachments.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({attachments.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="forms">{t("ticketDetail.forms")}</TabsTrigger>
        </TabsList>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-4">
          <div className="rounded-lg border bg-card p-4">
            <TicketActivityTimeline
              ticketId={ticket.id}
              refreshKey={activityRefreshKey}
            />
            <TicketCommentInput
              ticketId={ticket.id}
              onCommentAdded={handleCommentAdded}
            />
          </div>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="mt-4">
          <div className="rounded-lg border bg-card p-4">
            <ChecklistItemList
              ticketId={ticket.id}
              items={ticket.checklist_items || []}
              onItemsChange={refreshTicket}
            />
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="mt-4">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <FileDropzone
              onFilesSelected={handleFilesSelected}
              files={uploadedFiles}
              onRemoveFile={handleRemoveFile}
              maxFiles={10}
              maxSize={10 * 1024 * 1024}
            />
            {uploadedFiles.length > 0 && (
              <Button
                onClick={handleUploadFiles}
                disabled={uploadingFiles}
                size="sm"
              >
                {uploadingFiles
                  ? "Uploading..."
                  : `Upload ${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""}`}
              </Button>
            )}

            {/* Existing Attachments */}
            {Array.isArray(attachments) && attachments.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Paperclip className="h-3.5 w-3.5" />
                  Existing attachments ({attachments.length})
                </h4>
                <div className="grid gap-2">
                  {attachments.map((attachment: any) => {
                    const isImage =
                      attachment.content_type?.startsWith("image/");
                    return isImage ? (
                      <div
                        key={attachment.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={attachment.file_url}
                            alt={attachment.filename}
                            className="w-full h-auto max-h-48 object-contain bg-muted"
                          />
                        </a>
                        <div className="p-2 bg-muted/50 border-t">
                          <p className="text-xs font-medium truncate">
                            {attachment.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.file_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <a
                        key={attachment.id}
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                          <Paperclip className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {attachment.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.file_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="mt-4">
          <TicketFormsSection
            ticket={ticket}
            onFormSubmitted={refreshTicket}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
