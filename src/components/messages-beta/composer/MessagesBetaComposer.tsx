"use client";

import {
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Reply,
  Send,
  UserPlus,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import axios from "@/api/axios";
import { Button } from "@/components/ui/button";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Textarea } from "@/components/ui/textarea";
import { QuickReplySelector } from "@/components/social/QuickReplySelector";
import TemplateSelector from "@/components/social/TemplateSelector";
import {
  useAssignChat,
  useSendWhatsAppTemplateMessage,
  useSocialSettings,
  useStartSession,
} from "@/hooks/api/useSocial";
import { useTypingWebSocket } from "@/hooks/useTypingWebSocket";
import { useAuth } from "@/contexts/AuthContext";
import { addPendingMedia } from "@/lib/pendingMedia";
import { TextMessageSchema } from "@/components/chat/schemas/text-message-schema";
import type { WhatsAppMessageTemplate } from "@/api/generated";

import { useMessagesBetaStore } from "../store/useMessagesBetaStore";
import type { ConversationRow } from "../store/types";

interface Props {
  conversation: ConversationRow;
}

// Match the legacy composer's 500 MB ceiling (constants.ts MAX_FILE_SIZE).
// Beyond that the proxied media URLs misbehave on receive too, so the cap is
// useful for both directions.
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

const TYPING_DEBOUNCE_MS = 1500;

/**
 * /messages-beta composer with feature parity for the social platforms.
 *
 * Mirrors the affordances of the legacy `text-message-form-facebook.tsx`
 * shape:
 *
 *   • Multi-file attachment gallery (image vs file preview).
 *   • Reply / quote-reply via the beta store's `replyingTo` slice; the
 *     legacy `MessageBubble`'s reply button (wired through the
 *     ChatContextShim) populates it.
 *   • Emoji picker (legacy `EmojiPicker`).
 *   • Quick-reply selector (legacy `QuickReplySelector`).
 *   • WhatsApp template selector (legacy `TemplateSelector` +
 *     `useSendWhatsAppTemplateMessage`), only when platform === 'whatsapp'.
 *   • Drag-and-drop + paste-from-clipboard for images.
 *   • Outbound typing indicator via `useTypingWebSocket`.
 *   • Pending media blob URLs via `addPendingMedia` so sent images render
 *     instantly from the local blob before the CDN URL arrives in the WS
 *     echo.
 *   • Cmd/Ctrl+Enter to send, plain Enter inserts a newline.
 *
 * NO optimistic add to the thread — the WS `new_message` echo still owns
 * appending. This is the contract the rest of the beta page depends on
 * (avoids the duplicate-bubble class of bugs the legacy page has).
 */
export function MessagesBetaComposer({ conversation }: Props) {
  const t = useTranslations("messagesBeta.composer");
  const { user } = useAuth();
  const replyingTo = useMessagesBetaStore((s) => s.replyingTo);
  const setReplyingTo = useMessagesBetaStore((s) => s.setReplyingTo);

  // --- Assignment gating (parity with legacy chat-box-footer-facebook.tsx) ---
  const assignmentSlice = useMessagesBetaStore(
    (s) => s.assignmentByChatId[conversation.id] ?? null
  );
  const showArchived = useMessagesBetaStore((s) => s.showArchived);
  const setShowArchived = useMessagesBetaStore((s) => s.setShowArchived);
  const setAssignmentTab = useMessagesBetaStore((s) => s.setAssignmentTab);
  const patchAssignment = useMessagesBetaStore((s) => s.patchAssignment);
  const { data: socialSettings } = useSocialSettings();
  const assignmentEnabled = socialSettings?.chat_assignment_enabled ?? false;
  const isAssigned = !!assignmentSlice && assignmentSlice.assignedUserId != null;
  const isAssignedToMe =
    !!assignmentSlice && assignmentSlice.assignedUserId === user?.id;
  const isInSession = assignmentSlice?.status === "in_session";
  // Mirror legacy: send only when assignment mode is off, OR when assigned
  // to me AND the session is active. `active` (assigned but not started)
  // and `completed` (waiting for rating) both block sending.
  const canSendMessages = !assignmentEnabled || (isAssignedToMe && isInSession);
  const assignChat = useAssignChat();
  const startSession = useStartSession();

  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Widget sessions that have been closed by either side: composer hidden.
  const widgetClosed =
    conversation.platform === "widget" && !!conversation.sessionEndedAt;

  // Some platforms don't support replies on send. Match the legacy matrix:
  // facebook + whatsapp + email do; instagram + widget don't.
  const platformSupportsReply = useMemo(() => {
    return (
      conversation.platform === "facebook" ||
      conversation.platform === "whatsapp" ||
      conversation.platform === "instagram"
    );
  }, [conversation.platform]);

  // Clear any pending reply / attachments when the active chat changes —
  // they were set in the context of the previous conversation.
  useEffect(() => {
    setText("");
    setFiles([]);
    setReplyingTo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [conversation.id, setReplyingTo]);

  // Drop reply state for platforms that don't support it — protects against
  // a stale reply from a previously-selected FB chat showing up on an IG chat.
  useEffect(() => {
    if (!platformSupportsReply && replyingTo) setReplyingTo(null);
  }, [platformSupportsReply, replyingTo, setReplyingTo]);

  // --- Outbound typing indicator. ---
  // Build the per-chat conversation key the legacy page uses (unprefixed).
  const typingConversationId =
    conversation.conversationKey ||
    conversation.id.split("_").slice(2).join("_") ||
    conversation.id;
  const { sendTypingStart, sendTypingStop } = useTypingWebSocket({
    conversationId: typingConversationId,
  });
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifyTyping = useCallback(() => {
    sendTypingStart();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTypingStop(), TYPING_DEBOUNCE_MS);
  }, [sendTypingStart, sendTypingStop]);
  useEffect(() => {
    // Cleanup: on chat change or unmount, fire one final "stop" so the
    // typing indicator drops on the receiving side.
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      sendTypingStop();
    };
  }, [sendTypingStop, conversation.id]);

  const acceptFiles = useCallback((incoming: File[]) => {
    const accepted: File[] = [];
    for (const f of incoming) {
      if (f.size > MAX_FILE_SIZE_BYTES) {
        toast.error(t("fileSizeExceeded", { name: f.name }));
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length === 0) return;
    setFiles((prev) => [...prev, ...accepted]);
  }, []);

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list) return;
      acceptFiles(Array.from(list));
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [acceptFiles]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const previewUrls = useMemo(
    () => files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null)),
    [files]
  );
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  // --- Drag-and-drop. ---
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);
  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const dropped = Array.from(e.dataTransfer.files || []);
      if (dropped.length === 0) return;
      acceptFiles(dropped);
    },
    [acceptFiles]
  );

  // --- Paste-image from clipboard. ---
  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = Array.from(e.clipboardData?.items || []);
      const images: File[] = [];
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) images.push(f);
        }
      }
      if (images.length > 0) {
        e.preventDefault();
        acceptFiles(images);
      }
    },
    [acceptFiles]
  );

  // --- WhatsApp template send. ---
  const sendTemplate = useSendWhatsAppTemplateMessage();
  const handleTemplateSelect = useCallback(
    async (template: WhatsAppMessageTemplate, parameters: Record<string, string>) => {
      if (conversation.platform !== "whatsapp") return;
      try {
        const wabaId = conversation.accountId || conversation.id.split("_")[1];
        const recipientNumber = conversation.conversationKey || conversation.id.split("_").slice(2).join("_");
        await sendTemplate.mutateAsync({
          waba_id: wabaId,
          template_id: template.id!,
          to_number: recipientNumber,
          parameters,
        });
        toast.success(t("templateSent"));
      } catch (err: any) {
        toast.error(err?.response?.data?.error || t("failedToSendTemplate"));
      }
    },
    [conversation, sendTemplate]
  );

  // --- Quick-reply: insert into textarea, then autoresize. ---
  const handleQuickReplySelect = useCallback(
    (msg: string) => {
      setText((prev) => (prev ? `${prev} ${msg}` : msg));
      textareaRef.current?.focus();
    },
    []
  );

  // --- Send. ---
  const submit = useCallback(async () => {
    const message = text.trim();
    if (!message && files.length === 0) return;
    if (sending) return;

    // Text-only sends go through the same zod schema legacy uses
    // (chat/schemas/text-message-schema). When attachments are present,
    // the platform itself enforces the caption rules so the schema is
    // skipped. Schema enforces non-empty + 5000-char cap; future shape
    // requirements (per-platform char limits etc.) extend it in one place.
    if (message && files.length === 0) {
      const parsed = TextMessageSchema.safeParse({ text: message });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message || t("invalidMessage"));
        return;
      }
    }

    setSending(true);
    try {
      // Stash pending blob URLs BEFORE sending so the WS echo handler can
      // surface them instantly when the new_message frame lands.
      for (const f of files) {
        const blob = URL.createObjectURL(f);
        addPendingMedia(conversation.id, blob, f.type.startsWith("image/"), f.name);
      }

      await sendForPlatform(conversation, message, files, replyingTo?.messageId || undefined);

      setText("");
      setFiles([]);
      setReplyingTo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      sendTypingStop();
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error || err?.message || t("failedToSend");
      console.error("[messages-beta] send failed:", err);
      toast.error(errMsg);
    } finally {
      setSending(false);
    }
  }, [conversation, text, files, sending, replyingTo, setReplyingTo, sendTypingStop, t]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Match legacy text-message-form-facebook.tsx behaviour: plain Enter
      // sends, Shift+Enter inserts a newline. Cmd/Ctrl+Enter also sends as
      // a power-user shortcut. Every existing user has muscle memory for
      // Enter-to-send, so reversing it on /messages-beta caused complaints.
      if (e.key !== "Enter") return;
      if (e.shiftKey) return; // newline
      e.preventDefault();
      void submit();
    },
    [submit]
  );

  if (widgetClosed) {
    return (
      <div className="shrink-0 border-t border-border px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">{t("conversationEnded")}</p>
      </div>
    );
  }

  // Assignment gating — when assignment mode is on and this user can't send,
  // render the explanatory CTA stack instead of the composer. Mirrors the
  // legacy chat-box-footer-facebook.tsx structure 1:1 so behaviour is
  // identical across pages.
  if (assignmentEnabled && !canSendMessages) {
    // History view = read-only audit. Don't surface "Assign to me" here —
    // legacy explicitly avoids it because assigning silently unarchives
    // the conversation, which led to accidental reopens of old chats
    // (amanati, 2026-04-23). The explicit path is "Restore" in the header.
    if (showArchived) {
      return (
        <div className="shrink-0 border-t border-border px-6 py-4 text-center">
          <p className="text-sm text-muted-foreground">{t("historyReadOnly")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("historyReadOnlyHint")}</p>
        </div>
      );
    }

    const handleAssignToMe = async () => {
      if (!user?.id) return;
      // Optimistic local patch — match the header's flow so the chat
      // moves to the Assigned tab on click, without waiting for the WS
      // `assignment_update` echo.
      const displayName =
        [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
      const previousSlice = assignmentSlice;
      patchAssignment(conversation.id, {
        assignedUserId: user.id,
        assignedUserName: displayName,
        status: "active",
        sessionStartedAt: null,
        sessionEndedAt: null,
      });
      setAssignmentTab("assigned");
      if (showArchived) setShowArchived(false);

      try {
        await assignChat.mutateAsync({
          platform: conversation.platform,
          conversation_id: conversation.conversationKey,
          account_id: conversation.accountId,
        });
      } catch (err: any) {
        patchAssignment(conversation.id, previousSlice);
        toast.error(err?.response?.data?.error || t("failedToAssign"));
      }
    };

    const handleStartNewSession = async () => {
      try {
        await startSession.mutateAsync({
          platform: conversation.platform,
          conversation_id: conversation.conversationKey,
          account_id: conversation.accountId,
        });
      } catch (err: any) {
        toast.error(err?.response?.data?.error || t("failedToStartSession"));
      }
    };

    return (
      <div className="shrink-0 border-t border-border px-6 py-4 flex flex-col items-center justify-center gap-3 text-center">
        {!isAssigned && (
          <>
            <p className="text-sm text-muted-foreground">{t("assignToStartMessaging")}</p>
            <Button
              type="button"
              onClick={handleAssignToMe}
              disabled={assignChat.isPending}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {assignChat.isPending ? t("assigning") : t("assignToMe")}
            </Button>
          </>
        )}

        {isAssignedToMe && !isInSession && (
          conversation.platform === "widget" ? (
            // Widget skips the rating gate — visitor may have closed the
            // tab, so requiring a rating before reopening would lock the
            // conversation forever.
            <>
              <p className="text-sm text-muted-foreground">{t("sessionEnded")}</p>
              <Button
                type="button"
                onClick={handleStartNewSession}
                disabled={startSession.isPending}
              >
                {startSession.isPending ? t("starting") : t("startNewSession")}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("sessionEndedWaitingRating")}</p>
          )
        )}

        {isAssigned && !isAssignedToMe && (
          <p className="text-sm text-muted-foreground">
            {assignmentSlice?.assignedUserName
              ? t("assignedToOther", { name: assignmentSlice.assignedUserName })
              : t("assignedToOther", { name: t("anotherAgent") })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="shrink-0 border-t border-border px-6 py-3 flex flex-col gap-2"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Reply preview */}
      {replyingTo && platformSupportsReply && (
        <div className="flex items-start justify-between gap-2 rounded-md border-l-2 border-primary bg-muted/40 px-3 py-2 text-xs">
          <div className="flex items-start gap-2 min-w-0">
            <Reply className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="font-medium truncate">
                {replyingTo.senderName
                  ? t("replyingTo", { name: replyingTo.senderName })
                  : t("replying")}
              </p>
              {replyingTo.text && (
                <p className="truncate text-muted-foreground">{replyingTo.text}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            aria-label={t("cancelReply")}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Attachment gallery */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => {
            const preview = previewUrls[i];
            return (
              <div
                key={`${f.name}-${i}`}
                className="relative group rounded-md border bg-muted/30 overflow-hidden"
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt={f.name} className="h-16 w-16 object-cover" />
                ) : (
                  <div className="h-16 w-16 flex flex-col items-center justify-center gap-1 px-1">
                    {f.type.startsWith("image/") ? (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="text-[9px] text-muted-foreground truncate max-w-[60px]">
                      {f.name}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={t("removeAttachment", { name: f.name })}
                  className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div
        className={`flex items-end gap-1 rounded-md border ${
          isDragOver ? "border-primary bg-primary/5" : "border-transparent"
        } transition-colors`}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || conversation.platform === "widget"}
          aria-label={t("attachFile")}
          title={
            conversation.platform === "widget"
              ? t("attachFileWidgetUnsupported")
              : t("attachFile")
          }
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        <EmojiPicker
          onEmojiClick={(data) => {
            setText((prev) => `${prev}${data.emoji}`);
            textareaRef.current?.focus();
          }}
        />

        {/* QuickReplyPlatform doesn't include 'widget' — for widget chats we
            fall back to 'all'-scoped replies so agents still get their saved
            shortcuts. */}
        <QuickReplySelector
          platform={
            conversation.platform === "widget" ? "all" : conversation.platform
          }
          customerName={conversation.name}
          agentName={user?.first_name || user?.email || ""}
          onSelect={handleQuickReplySelect}
        />

        {conversation.platform === "whatsapp" && (
          <TemplateSelector onSelect={handleTemplateSelect} />
        )}

        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            notifyTyping();
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={isDragOver ? t("placeholderDrop") : t("placeholder")}
          className="resize-none min-h-[40px] max-h-[160px]"
          rows={1}
          disabled={sending}
        />

        <Button
          type="button"
          onClick={() => void submit()}
          disabled={sending || (!text.trim() && files.length === 0)}
          className="shrink-0"
          aria-label={t("sendMessage")}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Per-platform dispatch. Handles the multi-file fan-out the way the legacy
 * page does:
 *
 *   • Facebook / Instagram: text + each file sent as its own API call; the
 *     first file (or the text-only call if no files) carries the message
 *     text; subsequent files send with empty text.
 *   • WhatsApp: same fan-out pattern; reply_to_message_id only attaches to
 *     the FIRST send.
 *   • Widget: text only (visitor-direction file sends still aren't
 *     supported by the backend).
 *
 * Reply: only the FIRST API call attaches `reply_to_message_id`. Subsequent
 * fan-out calls leave it blank so the receiving side doesn't get N quote
 * previews stacked.
 */
export async function sendForPlatform(
  conversation: ConversationRow,
  message: string,
  files: File[],
  replyToMessageId?: string
): Promise<void> {
  const parts = conversation.id.split("_");
  if (parts.length < 2) throw new Error("Invalid chat ID format");
  const prefix = parts[0];
  const accountId = parts[1];
  const targetId = parts.slice(2).join("_");

  const sendOne = async (
    text: string,
    file: File | null,
    includeReplyTo: boolean
  ) => {
    if (prefix === "fb") {
      if (file) {
        const form = new FormData();
        form.append("recipient_id", targetId);
        form.append("page_id", accountId);
        form.append("message", text);
        if (includeReplyTo && replyToMessageId) {
          form.append("reply_to_message_id", replyToMessageId);
        }
        form.append("media", file);
        await axios.post("/api/social/facebook/send-message/", form);
      } else {
        await axios.post("/api/social/facebook/send-message/", {
          recipient_id: targetId,
          page_id: accountId,
          message: text,
          reply_to_message_id: includeReplyTo ? replyToMessageId || "" : "",
        });
      }
      return;
    }

    if (prefix === "ig") {
      if (file) {
        const form = new FormData();
        form.append("recipient_id", targetId);
        form.append("instagram_account_id", accountId);
        form.append("message", text);
        if (includeReplyTo && replyToMessageId) {
          form.append("reply_to_message_id", replyToMessageId);
        }
        form.append("media", file);
        await axios.post("/api/social/instagram/send-message/", form);
      } else {
        await axios.post("/api/social/instagram/send-message/", {
          recipient_id: targetId,
          instagram_account_id: accountId,
          message: text,
          reply_to_message_id: includeReplyTo ? replyToMessageId || "" : "",
        });
      }
      return;
    }

    if (prefix === "wa") {
      const phone = targetId.startsWith("+") ? targetId : `+${targetId}`;
      if (file) {
        const form = new FormData();
        form.append("to_number", phone);
        form.append("waba_id", accountId);
        form.append("message", text);
        if (includeReplyTo && replyToMessageId) {
          form.append("reply_to_message_id", replyToMessageId);
        }
        form.append("media", file);
        await axios.post("/api/social/whatsapp/send-message/", form);
      } else {
        await axios.post("/api/social/whatsapp/send-message/", {
          to_number: phone,
          waba_id: accountId,
          message: text,
          reply_to_message_id: includeReplyTo ? replyToMessageId || "" : "",
        });
      }
      return;
    }

    if (prefix === "widget") {
      if (file) {
        throw new Error("Sending files to website visitors is not yet supported");
      }
      await axios.post("/api/widget/admin/messages/send/", {
        connection_id: Number(accountId),
        session_id: targetId,
        message_text: text,
      });
      return;
    }

    throw new Error(`Unsupported platform: ${prefix}`);
  };

  if (files.length === 0) {
    await sendOne(message, null, true);
    return;
  }

  // Files: first one carries the text caption + reply context, rest send
  // standalone. Done sequentially so we don't hit per-tenant rate limits.
  for (let i = 0; i < files.length; i++) {
    const text = i === 0 ? message : "";
    await sendOne(text, files[i], i === 0);
  }
}
